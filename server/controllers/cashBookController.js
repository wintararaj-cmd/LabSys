const { query } = require('../config/db');
const { logAuditEvent } = require('../services/auditService');

/**
 * Get all manual cash book entries
 */
const getEntries = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { startDate, endDate, type } = req.query;

        let sql = `
            SELECT e.*, u.name as created_by_name
            FROM cash_book_entries e
            LEFT JOIN users u ON e.created_by = u.id
            WHERE e.tenant_id = $1
        `;
        const params = [tenantId];
        let p = 1;

        if (startDate) {
            p++;
            sql += ` AND (e.entry_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= $${p}::date`;
            params.push(startDate);
        }
        if (endDate) {
            p++;
            sql += ` AND (e.entry_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= $${p}::date`;
            params.push(endDate);
        }
        if (type && type !== 'ALL') {
            p++;
            sql += ` AND e.type = $${p}`;
            params.push(type);
        }

        sql += ` ORDER BY e.entry_date DESC, e.created_at DESC`;

        const result = await query(sql, params);
        res.json({ entries: result.rows });
    } catch (err) {
        console.error('Get cash book entries error:', err);
        res.status(500).json({ error: 'Failed to fetch cash book entries' });
    }
};

/**
 * Create a manual cash book entry
 */
const createEntry = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user?.userId;
        const {
            entry_date, type, particulars, reference,
            amount, payment_mode, category, notes
        } = req.body;

        if (!type || !particulars || !amount) {
            return res.status(400).json({ error: 'type, particulars, and amount are required' });
        }
        if (!['CASH_IN', 'CASH_OUT', 'BANK_IN', 'BANK_OUT'].includes(type)) {
            return res.status(400).json({ error: 'type must be CASH_IN, CASH_OUT, BANK_IN, or BANK_OUT' });
        }

        const result = await query(
            `INSERT INTO cash_book_entries
             (tenant_id, entry_date, type, particulars, reference, amount, payment_mode, category, notes, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [
                tenantId,
                entry_date || new Date().toISOString().split('T')[0],
                type, particulars, reference || null,
                parseFloat(amount), payment_mode || (type.includes('CASH') ? 'CASH' : 'BANK'),
                category || null, notes || null, userId
            ]
        );

        await logAuditEvent({
            tenantId, userId, action: 'CREATE',
            entityType: 'CASH_BOOK_ENTRY', entityId: result.rows[0].id,
            newValues: { type, particulars, amount },
            details: `Created ${type} cash book entry: ${particulars} - ₹${amount}`
        });

        res.status(201).json({ message: 'Entry created', entry: result.rows[0] });
    } catch (err) {
        console.error('Create cash book entry error:', err);
        res.status(500).json({ error: 'Failed to create entry' });
    }
};

/**
 * Update a manual cash book entry
 */
const updateEntry = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const {
            entry_date, type, particulars, reference,
            amount, payment_mode, category, notes
        } = req.body;

        const result = await query(
            `UPDATE cash_book_entries SET
                entry_date   = COALESCE($1, entry_date),
                type         = COALESCE($2, type),
                particulars  = COALESCE($3, particulars),
                reference    = COALESCE($4, reference),
                amount       = COALESCE($5, amount),
                payment_mode = COALESCE($6, payment_mode),
                category     = COALESCE($7, category),
                notes        = COALESCE($8, notes)
             WHERE id = $9 AND tenant_id = $10
             RETURNING *`,
            [entry_date, type, particulars, reference, amount ? parseFloat(amount) : null,
                payment_mode, category, notes, id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        res.json({ message: 'Entry updated', entry: result.rows[0] });
    } catch (err) {
        console.error('Update cash book entry error:', err);
        res.status(500).json({ error: 'Failed to update entry' });
    }
};

/**
 * Delete a manual cash book entry
 */
const deleteEntry = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;

        const result = await query(
            'DELETE FROM cash_book_entries WHERE id = $1 AND tenant_id = $2 RETURNING id',
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        res.json({ message: 'Entry deleted' });
    } catch (err) {
        console.error('Delete cash book entry error:', err);
        res.status(500).json({ error: 'Failed to delete entry' });
    }
};

module.exports = { getEntries, createEntry, updateEntry, deleteEntry };
