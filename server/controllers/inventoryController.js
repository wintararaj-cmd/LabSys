const { query } = require('../config/db');

/**
 * Log inventory changes
 */
const logInventoryChange = async (client, { tenant_id, branch_id, item_id, type, quantity, reason }) => {
    await client.query(
        `INSERT INTO inventory_logs (tenant_id, branch_id, item_id, type, quantity, reason)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tenant_id, branch_id, item_id, type, quantity, reason]
    );
};


/**
 * Get all inventory items
 */
const getInventoryItems = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { lowStock, expiring, branchId } = req.query;

        let queryText = 'SELECT * FROM inventory_items WHERE tenant_id = $1';
        let params = [tenantId];

        if (branchId) {
            queryText += ' AND branch_id = $' + (params.length + 1);
            params.push(branchId);
        } else if (req.user.role !== 'ADMIN') {
            // Non-admins only see their branch
            queryText += ' AND branch_id = $' + (params.length + 1);
            params.push(req.user.branchId);
        }

        if (lowStock === 'true') {
            queryText += ' AND quantity <= reorder_level';
        }

        if (expiring === 'true') {
            queryText += ' AND expiry_date <= CURRENT_DATE + INTERVAL \'30 days\' AND expiry_date >= CURRENT_DATE';
        }

        queryText += ' ORDER BY expiry_date ASC';

        const result = await query(queryText, params);

        res.json({ items: result.rows });

    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ error: 'Failed to fetch inventory items' });
    }
};

/**
 * Add inventory item
 */
const addInventoryItem = async (req, res) => {
    try {
        const {
            name,
            item_code,
            category,
            unit,
            quantity,
            reorder_level,
            unit_price,
            supplier_name,
            supplier_contact,
            batch_number,
            expiry_date,
            branch_id
        } = req.body;

        const tenantId = req.tenantId;

        // Use user's branch if not provided (non-admins)
        const finalBranchId = req.user.role === 'ADMIN' ? branch_id : req.user.branchId;

        if (!name || !quantity) {
            return res.status(400).json({ error: 'Name and quantity are required' });
        }

        const result = await query(
            `INSERT INTO inventory_items (
                tenant_id, branch_id, name, item_code, category, unit, quantity, 
                reorder_level, unit_price, supplier_name, supplier_contact, 
                batch_number, expiry_date, location, manufacturer
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *`,
            [
                tenantId,
                finalBranchId || null,
                name,
                item_code,
                category,
                unit,
                quantity,
                reorder_level || 10,
                unit_price || 0,
                supplier_name,
                supplier_contact,
                batch_number,
                expiry_date || null,
                req.body.location,
                req.body.manufacturer
            ]
        );

        // Log initial stock
        const { pool } = require('../config/db');
        const client = await pool.connect();
        try {
            await logInventoryChange(client, {
                tenant_id: tenantId,
                branch_id: finalBranchId,
                item_id: result.rows[0].id,
                type: 'INITIAL',
                quantity: quantity,
                reason: 'Initial stock entry'
            });
        } finally {
            client.release();
        }

        res.status(201).json({
            message: 'Inventory item added successfully',
            item: result.rows[0],
        });

    } catch (error) {
        console.error('Add inventory error:', error);
        res.status(500).json({ error: 'Failed to add inventory item' });
    }
};

/**
 * Update inventory item
 */
const updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const {
            name,
            item_code,
            category,
            unit,
            quantity,
            reorder_level,
            unit_price,
            supplier_name,
            supplier_contact,
            batch_number,
            expiry_date,
            branch_id
        } = req.body;

        const result = await query(
            `UPDATE inventory_items SET
                name = COALESCE($1, name),
                item_code = COALESCE($2, item_code),
                category = COALESCE($3, category),
                unit = COALESCE($4, unit),
                quantity = COALESCE($5, quantity),
                reorder_level = COALESCE($6, reorder_level),
                unit_price = COALESCE($7, unit_price),
                supplier_name = COALESCE($8, supplier_name),
                supplier_contact = COALESCE($9, supplier_contact),
                batch_number = COALESCE($10, batch_number),
                expiry_date = COALESCE($11, expiry_date),
                branch_id = COALESCE($12, branch_id),
                location = COALESCE($13, location),
                manufacturer = COALESCE($14, manufacturer)
            WHERE id = $15 AND tenant_id = $16
            RETURNING *`,
            [
                name, item_code, category, unit, quantity, reorder_level, unit_price,
                supplier_name, supplier_contact, batch_number, expiry_date, branch_id,
                req.body.location, req.body.manufacturer, id, tenantId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }

        res.json({
            message: 'Inventory item updated successfully',
            item: result.rows[0],
        });

    } catch (error) {
        console.error('Update inventory error:', error);
        res.status(500).json({ error: 'Failed to update inventory item' });
    }
};

/**
 * Get inventory alerts
 */
const getInventoryAlerts = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { branchId } = req.query;

        let branchFilter = '';
        let params = [tenantId];

        if (branchId) {
            branchFilter = ' AND branch_id = $2';
            params.push(branchId);
        } else if (req.user.role !== 'ADMIN') {
            branchFilter = ' AND branch_id = $2';
            params.push(req.user.branchId);
        }

        // Low stock items
        const lowStockResult = await query(
            `SELECT * FROM inventory_items 
       WHERE tenant_id = $1 ${branchFilter} AND quantity <= reorder_level
       ORDER BY quantity ASC`,
            params
        );

        // Expiring items (within 30 days)
        const expiringResult = await query(
            `SELECT * FROM inventory_items 
       WHERE tenant_id = $1 ${branchFilter}
       AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
       AND expiry_date >= CURRENT_DATE
       ORDER BY expiry_date ASC`,
            params
        );

        // Expired items
        const expiredResult = await query(
            `SELECT * FROM inventory_items 
       WHERE tenant_id = $1 ${branchFilter} AND expiry_date < CURRENT_DATE
       ORDER BY expiry_date DESC`,
            params
        );

        res.json({
            lowStock: lowStockResult.rows,
            expiring: expiringResult.rows,
            expired: expiredResult.rows,
        });

    } catch (error) {
        console.error('Get inventory alerts error:', error);
        res.status(500).json({ error: 'Failed to fetch inventory alerts' });
    }
};

/**
 * Delete inventory item
 */
const deleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        const result = await query(
            'DELETE FROM inventory_items WHERE id = $1 AND tenant_id = $2 RETURNING *',
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }

        res.json({ message: 'Inventory item deleted successfully' });

    } catch (error) {
        console.error('Delete inventory error:', error);
        res.status(500).json({ error: 'Failed to delete inventory item' });
    }
};

/**
 * Adjust stock level
 */
const adjustStock = async (req, res) => {
    const { pool } = require('../config/db');
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { adjustment, reason, type } = req.body; // type: 'ADD' or 'REMOVE'
        const tenantId = req.tenantId;

        await client.query('BEGIN');

        const itemRes = await client.query(
            'SELECT * FROM inventory_items WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (itemRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Item not found' });
        }

        const item = itemRes.rows[0];
        const currentQty = parseFloat(item.quantity) || 0;
        const adjustmentQty = parseFloat(adjustment) || 0;

        const newQuantity = type === 'ADD'
            ? currentQty + adjustmentQty
            : currentQty - adjustmentQty;

        if (newQuantity < 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficent stock' });
        }

        const updatedRes = await client.query(
            'UPDATE inventory_items SET quantity = $1, last_reorder_date = $2 WHERE id = $3 RETURNING *',
            [newQuantity, type === 'ADD' ? new Date() : (item.last_reorder_date || null), id]
        );

        await logInventoryChange(client, {
            tenant_id: tenantId,
            branch_id: item.branch_id,
            item_id: id,
            type: type,
            quantity: adjustment,
            reason: reason
        });

        await client.query('COMMIT');
        res.json({ message: 'Stock adjusted successfully', item: updatedRes.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Stock adjustment error:', error);
        res.status(500).json({ error: 'Failed to adjust stock' });
    } finally {
        client.release();
    }
};

/**
 * Get inventory logs
 */
const getInventoryLogs = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { itemId, branchId } = req.query;

        let queryText = `
            SELECT l.*, i.name as item_name, i.unit, b.name as branch_name
            FROM inventory_logs l
            JOIN inventory_items i ON l.item_id = i.id
            LEFT JOIN branches b ON l.branch_id = b.id
            WHERE l.tenant_id = $1
        `;
        const params = [tenantId];

        if (itemId) {
            queryText += ' AND l.item_id = $2';
            params.push(itemId);
        }

        if (branchId) {
            queryText += ` AND l.branch_id = $${params.length + 1}`;
            params.push(branchId);
        }

        queryText += ' ORDER BY l.created_at DESC LIMIT 50';

        const result = await query(queryText, params);
        res.json({ logs: result.rows });

    } catch (error) {
        console.error('Get inventory logs error:', error);
        res.status(500).json({ error: 'Failed to fetch inventory logs' });
    }
};


module.exports = {
    getInventoryItems,
    addInventoryItem,
    updateInventoryItem,
    getInventoryAlerts,
    deleteInventoryItem,
    adjustStock,
    getInventoryLogs
};
