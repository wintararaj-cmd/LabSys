require('dotenv').config();
const { pool } = require('../config/db');


async function seedRadiology() {
    try {
        console.log('Seeding Radiology Data...');

        // 1. Get a tenant ID
        const tenantRes = await pool.query('SELECT id FROM tenants LIMIT 1');
        if (tenantRes.rows.length === 0) {
            console.log('No tenants found. Seed tenants first.');
            return;
        }
        const tenantId = tenantRes.rows[0].id;

        // 2. Add Radiology Tests if not exist
        const tests = [
            { name: 'X-Ray Chest PA View', code: 'XR001', category: 'Radiology', department: 'XRAY', price: 500 },
            { name: 'USG Whole Abdomen', code: 'USG001', category: 'Radiology', department: 'USG', price: 1500 },
            { name: 'CT Scan Brain', code: 'CT001', category: 'Radiology', department: 'CT', price: 3500 },
            { name: 'MRI Lumbar Spine', code: 'MRI001', category: 'Radiology', department: 'MRI', price: 6500 }
        ];

        console.log('Cleaning up any duplicate tests in test master...');
        // Repoint foreign key references in invoice_items
        await pool.query(`
            WITH duplicates AS (
                SELECT id, code, tenant_id,
                    MIN(id) OVER (PARTITION BY tenant_id, code) as first_id,
                    ROW_NUMBER() OVER (PARTITION BY tenant_id, code ORDER BY id ASC) as rn
                FROM tests
                WHERE code IS NOT NULL AND code != ''
            )
            UPDATE invoice_items
            SET test_id = d.first_id
            FROM duplicates d
            WHERE invoice_items.test_id = d.id AND d.rn > 1;
        `);

        // Repoint foreign key references in reports
        await pool.query(`
            WITH duplicates AS (
                SELECT id, code, tenant_id,
                    MIN(id) OVER (PARTITION BY tenant_id, code) as first_id,
                    ROW_NUMBER() OVER (PARTITION BY tenant_id, code ORDER BY id ASC) as rn
                FROM tests
                WHERE code IS NOT NULL AND code != ''
            )
            UPDATE reports
            SET test_id = d.first_id
            FROM duplicates d
            WHERE reports.test_id = d.id AND d.rn > 1;
        `);

        // Repoint foreign key references in test_profile_items
        await pool.query(`
            WITH duplicates AS (
                SELECT id, code, tenant_id,
                    MIN(id) OVER (PARTITION BY tenant_id, code) as first_id,
                    ROW_NUMBER() OVER (PARTITION BY tenant_id, code ORDER BY id ASC) as rn
                FROM tests
                WHERE code IS NOT NULL AND code != ''
            )
            UPDATE test_profile_items
            SET test_id = d.first_id
            FROM duplicates d
            WHERE test_profile_items.test_id = d.id AND d.rn > 1;
        `);

        // Delete the duplicate tests
        const deleteDupRes = await pool.query(`
            DELETE FROM tests
            WHERE id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id, code ORDER BY id ASC) as rn
                    FROM tests
                    WHERE code IS NOT NULL AND code != ''
                ) t WHERE t.rn > 1
            ) RETURNING id;
        `);
        console.log(`Cleaned up ${deleteDupRes.rowCount} duplicate test entries.`);

        for (const test of tests) {
            const check = await pool.query(
                'SELECT id FROM tests WHERE tenant_id = $1 AND code = $2',
                [tenantId, test.code]
            );

            if (check.rows.length === 0) {
                await pool.query(
                    `INSERT INTO tests (tenant_id, name, code, category, department, price) 
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [tenantId, test.name, test.code, test.category, test.department, test.price]
                );
            }
        }

        // 3. Add a sample Radiology Invoice and Report (only if not already seeded)
        const existingInv = await pool.query(
            `SELECT id FROM invoices WHERE invoice_number = $1 AND tenant_id = $2`,
            ['INV-RAD-001', tenantId]
        );

        if (existingInv.rows.length > 0) {
            console.log('Sample radiology invoice already exists. Skipping.');
        } else {
            const patientRes = await pool.query('SELECT id FROM patients WHERE tenant_id = $1 LIMIT 1', [tenantId]);
            if (patientRes.rows.length > 0) {
                const userIdRes = await pool.query('SELECT id FROM users WHERE tenant_id = $1 LIMIT 1', [tenantId]);
                const userId = userIdRes.rows[0].id;

                const invRes = await pool.query(
                    `INSERT INTO invoices (tenant_id, patient_id, invoice_number, total_amount, net_amount, payment_status)
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                    [tenantId, patientRes.rows[0].id, 'INV-RAD-001', 500, 500, 'PAID']
                );
                const invId = invRes.rows[0].id;

                const testRes = await pool.query("SELECT id FROM tests WHERE category = 'Radiology' LIMIT 1");
                const testId = testRes.rows[0].id;

                await pool.query(
                    `INSERT INTO reports (invoice_id, test_id, status, findings, impression)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [invId, testId, 'PENDING', '', '']
                );
                console.log('Seeded sample radiology invoice INV-RAD-001.');
            }
        }


        console.log('Radiology data seeded successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedRadiology();
