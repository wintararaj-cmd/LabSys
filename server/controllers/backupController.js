const { query, pool } = require('../config/db');

/**
 * Export all tenant data
 */
const exportData = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const backupData = {
            tenant_id: tenantId,
            exported_at: new Date().toISOString(),
            version: '1.0',
            data: {}
        };

        const tables = [
            'branches',
            'users',
            'doctors',
            'patients',
            'tests',
            'invoices',
            'inventory_items',
            'inventory_logs',
            'doctor_payouts'
        ];

        for (const table of tables) {
            try {
                const result = await query(`SELECT * FROM ${table} WHERE tenant_id = $1`, [tenantId]);
                backupData.data[table] = result.rows;
            } catch (tableError) {
                console.warn(`Could not export table ${table}:`, tableError.message);
                backupData.data[table] = [];
            }
        }

        // Special case for tables without tenant_id but linked to tenant data
        // invoice_items and reports are actually linked to invoices which have tenant_id
        // But the schema shows they don't have tenant_id directly (let me check schema again)

        // Actually, looking at schema.sql:
        // invoice_items: invoice_id (linked to invoices)
        // reports: invoice_id (linked to invoices)

        // Let's refine the query for those:
        try {
            const invoiceItemsResult = await query(
                `SELECT ii.* FROM invoice_items ii JOIN invoices i ON ii.invoice_id = i.id WHERE i.tenant_id = $1`,
                [tenantId]
            );
            backupData.data['invoice_items'] = invoiceItemsResult.rows;
        } catch (e) {
            console.warn('Could not export invoice_items:', e.message);
            backupData.data['invoice_items'] = [];
        }

        try {
            const reportsResult = await query(
                `SELECT r.* FROM reports r JOIN invoices i ON r.invoice_id = i.id WHERE i.tenant_id = $1`,
                [tenantId]
            );
            backupData.data['reports'] = reportsResult.rows;
        } catch (e) {
            console.warn('Could not export reports:', e.message);
            backupData.data['reports'] = [];
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=backup_${tenantId}_${new Date().getTime()}.json`);
        res.send(JSON.stringify(backupData, null, 2));

    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
};

/**
 * Import tenant data
 */
const importData = async (req, res) => {
    const client = await pool.connect();
    try {
        const { backupData } = req.body;
        const tenantId = req.tenantId;

        if (!backupData || backupData.tenant_id !== tenantId) {
            return res.status(400).json({ error: 'Invalid backup file or tenant mismatch' });
        }

        await client.query('BEGIN');

        // Order matters due to foreign key constraints
        const tables = [
            'reports',
            'invoice_items',
            'invoices',
            'inventory_logs',
            'inventory_items',
            'doctor_payouts',
            'doctors',
            'patients',
            'tests',
            'users',
            'branches'
        ];

        // 1. Clear existing data for this tenant (caution!)
        for (const table of tables) {
            if (table === 'reports' || table === 'invoice_items') {
                await client.query(
                    `DELETE FROM ${table} WHERE invoice_id IN (SELECT id FROM invoices WHERE tenant_id = $1)`,
                    [tenantId]
                );
            } else {
                await client.query(`DELETE FROM ${table} WHERE tenant_id = $1`, [tenantId]);
            }
        }

        // 2. Insert data back
        // This is complex because of SERIAL IDs. We might need to handle ID mapping if we want to restore exactly.
        // For a simple backup/restore on the SAME system, we can try to force the IDs.

        const restoreOrder = [
            'branches',
            'users',
            'doctors',
            'patients',
            'tests',
            'invoices',
            'invoice_items',
            'reports',
            'inventory_items',
            'inventory_logs',
            'doctor_payouts'
        ];

        for (const table of restoreOrder) {
            const rows = backupData.data[table];
            if (!rows || rows.length === 0) continue;

            const columns = Object.keys(rows[0]);
            const columnNames = columns.join(', ');

            for (const row of rows) {
                const values = columns.map(col => row[col]);
                const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

                await client.query(
                    `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders})`,
                    values
                );
            }

            // Reset sequence for SERIAL columns
            await client.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1)) FROM ${table}`);
        }

        await client.query('COMMIT');
        res.json({ message: 'Data imported successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Import error:', error);
        res.status(500).json({ error: 'Failed to import data: ' + error.message });
    } finally {
        client.release();
    }
};

module.exports = {
    exportData,
    importData
};
