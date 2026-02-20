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
            { name: 'X-Ray Chest PA View', code: 'XR001', category: 'Radiology', price: 500 },
            { name: 'USG Whole Abdomen', code: 'USG001', category: 'Radiology', price: 1500 },
            { name: 'CT Scan Brain', code: 'CT001', category: 'Radiology', price: 3500 },
            { name: 'MRI Lumbar Spine', code: 'MRI001', category: 'Radiology', price: 6500 }
        ];

        for (const test of tests) {
            await pool.query(
                `INSERT INTO tests (tenant_id, name, code, category, price) 
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT DO NOTHING`,
                [tenantId, test.name, test.code, test.category, test.price]
            );
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
