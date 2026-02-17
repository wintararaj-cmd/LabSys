const { query, pool } = require('../config/db');

/**
 * Record a new purchase invoice and update inventory
 */
const createPurchase = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const tenantId = req.tenantId;
        const branchId = req.user.branchId;
        const {
            invoiceNumber,
            supplierName,
            purchaseDate,
            items, // Array of { itemId, quantity, unitPrice, taxPercentage, batchNumber, expiryDate }
            paymentStatus,
            paymentMode,
            notes
        } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'At least one item is required' });
        }

        // Calculate totals
        let totalAmount = 0;
        let totalTax = 0;

        const purchaseItemsData = items.map(item => {
            const rowTotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
            const rowTax = (rowTotal * (parseFloat(item.taxPercentage) || 0)) / 100;
            totalAmount += rowTotal;
            totalTax += rowTax;
            return { ...item, totalLine: rowTotal + rowTax };
        });

        const netAmount = totalAmount + totalTax;

        // 1. Create Purchase Invoice
        const purchaseResult = await client.query(
            `INSERT INTO purchase_invoices (
                tenant_id, branch_id, invoice_number, supplier_name, 
                purchase_date, total_amount, tax_amount, net_amount, 
                payment_status, payment_mode, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
            [
                tenantId, branchId, invoiceNumber, supplierName,
                purchaseDate, totalAmount, totalTax, netAmount,
                paymentStatus, paymentMode, notes
            ]
        );

        const purchaseId = purchaseResult.rows[0].id;

        // 2. Add items and update inventory
        for (const item of purchaseItemsData) {
            // Add purchase item
            await client.query(
                `INSERT INTO purchase_items (
                    purchase_id, item_id, quantity, unit_price, 
                    tax_percentage, batch_number, expiry_date, total_price
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    purchaseId, item.itemId, item.quantity, item.unitPrice,
                    item.taxPercentage, item.batchNumber, item.expiryDate, item.totalLine
                ]
            );

            // Update inventory_items (Increase quantity)
            // Note: In a more complex system, we'd handle batches separately.
            // Here we update the main record and potentially overwrite batch/expiry if it's the latest.
            await client.query(
                `UPDATE inventory_items 
                 SET quantity = quantity + $1,
                     unit_price = $2,
                     batch_number = $3,
                     expiry_date = $4,
                     last_reorder_date = CURRENT_TIMESTAMP
                 WHERE id = $5 AND tenant_id = $6`,
                [item.quantity, item.unitPrice, item.batchNumber, item.expiryDate, item.itemId, tenantId]
            );

            // Add inventory log
            await client.query(
                `INSERT INTO inventory_logs (
                    tenant_id, branch_id, item_id, type, quantity, reason
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [tenantId, branchId, item.itemId, 'ADD', item.quantity, `Purchase Invoice: ${invoiceNumber}`]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Purchase recorded and inventory updated successfully', purchaseId });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create purchase error:', error);
        res.status(500).json({ error: 'Failed to record purchase' });
    } finally {
        client.release();
    }
};

/**
 * Get all purchase invoices
 */
const getPurchases = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const result = await query(
            `SELECT * FROM purchase_invoices WHERE tenant_id = $1 ORDER BY purchase_date DESC`,
            [tenantId]
        );
        res.json({ purchases: result.rows });
    } catch (error) {
        console.error('Get purchases error:', error);
        res.status(500).json({ error: 'Failed to fetch purchases' });
    }
};

/**
 * Get purchase details by ID
 */
const getPurchaseById = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        const purchaseResult = await query(
            `SELECT * FROM purchase_invoices WHERE id = $1 AND tenant_id = $2`,
            [id, tenantId]
        );

        if (purchaseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Purchase not found' });
        }

        const itemsResult = await query(
            `SELECT pi.*, i.name as item_name, i.item_code
             FROM purchase_items pi
             JOIN inventory_items i ON pi.item_id = i.id
             WHERE pi.purchase_id = $1`,
            [id]
        );

        res.json({
            purchase: purchaseResult.rows[0],
            items: itemsResult.rows
        });

    } catch (error) {
        console.error('Get purchase detail error:', error);
        res.status(500).json({ error: 'Failed to fetch purchase details' });
    }
};

/**
 * Update purchase invoice and adjust inventory
 */
const updatePurchase = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const tenantId = req.tenantId;
        const branchId = req.user.branchId;

        const {
            invoiceNumber,
            supplierName,
            purchaseDate,
            items,
            paymentStatus,
            paymentMode,
            notes
        } = req.body;

        // 1. Get old items to reverse inventory changes
        const oldItemsResult = await client.query(
            `SELECT * FROM purchase_items WHERE purchase_id = $1`, [id]
        );

        for (const oldItem of oldItemsResult.rows) {
            await client.query(
                `UPDATE inventory_items 
                 SET quantity = quantity - $1 
                 WHERE id = $2 AND tenant_id = $3`,
                [oldItem.quantity, oldItem.item_id, tenantId]
            );

            await client.query(
                `INSERT INTO inventory_logs (tenant_id, branch_id, item_id, type, quantity, reason)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [tenantId, branchId, oldItem.item_id, 'REMOVE', oldItem.quantity, `Update Purchase Reversal: ${invoiceNumber}`]
            );
        }

        // 2. Clear old items
        await client.query(`DELETE FROM purchase_items WHERE purchase_id = $1`, [id]);

        // 3. Update main invoice
        let totalAmount = 0;
        let totalTax = 0;
        const purchaseItemsData = items.map(item => {
            const rowTotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
            const rowTax = (rowTotal * (parseFloat(item.taxPercentage) || 0)) / 100;
            totalAmount += rowTotal;
            totalTax += rowTax;
            return { ...item, totalLine: rowTotal + rowTax };
        });
        const netAmount = totalAmount + totalTax;

        await client.query(
            `UPDATE purchase_invoices 
             SET invoice_number = $1, supplier_name = $2, purchase_date = $3, 
                 total_amount = $4, tax_amount = $5, net_amount = $6, 
                 payment_status = $7, payment_mode = $8, notes = $9
             WHERE id = $10 AND tenant_id = $11`,
            [invoiceNumber, supplierName, purchaseDate, totalAmount, totalTax, netAmount, paymentStatus, paymentMode, notes, id, tenantId]
        );

        // 4. Add new items and update inventory
        for (const item of purchaseItemsData) {
            await client.query(
                `INSERT INTO purchase_items (
                    purchase_id, item_id, quantity, unit_price, 
                    tax_percentage, batch_number, expiry_date, total_price
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [id, item.itemId, item.quantity, item.unitPrice, item.taxPercentage, item.batchNumber, item.expiryDate, item.totalLine]
            );

            await client.query(
                `UPDATE inventory_items 
                 SET quantity = quantity + $1, unit_price = $2, batch_number = $3, expiry_date = $4
                 WHERE id = $5 AND tenant_id = $6`,
                [item.quantity, item.unitPrice, item.batchNumber, item.expiryDate, item.itemId, tenantId]
            );

            await client.query(
                `INSERT INTO inventory_logs (tenant_id, branch_id, item_id, type, quantity, reason)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [tenantId, branchId, item.itemId, 'ADD', item.quantity, `Purchase Update: ${invoiceNumber}`]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Purchase updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update purchase error:', error);
        res.status(500).json({ error: 'Failed to update purchase' });
    } finally {
        client.release();
    }
};

/**
 * Delete purchase and reverse inventory
 */
const deletePurchase = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const tenantId = req.tenantId;
        const branchId = req.user.branchId;

        // 1. Get items to reverse stock
        const itemsResult = await client.query(
            `SELECT * FROM purchase_items WHERE purchase_id = $1`, [id]
        );

        for (const item of itemsResult.rows) {
            await client.query(
                `UPDATE inventory_items 
                 SET quantity = quantity - $1 
                 WHERE id = $2 AND tenant_id = $3`,
                [item.quantity, item.item_id, tenantId]
            );

            await client.query(
                `INSERT INTO inventory_logs (tenant_id, branch_id, item_id, type, quantity, reason)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [tenantId, branchId, item.item_id, 'REMOVE', item.quantity, `Purchase Deletion Reversal`]
            );
        }

        // 2. Delete invoice (CASCADE will handle purchase_items)
        await client.query(`DELETE FROM purchase_invoices WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);

        await client.query('COMMIT');
        res.json({ message: 'Purchase deleted and stock adjusted' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete purchase error:', error);
        res.status(500).json({ error: 'Failed to delete purchase' });
    } finally {
        client.release();
    }
};

module.exports = {
    createPurchase,
    getPurchases,
    getPurchaseById,
    updatePurchase,
    deletePurchase
};
