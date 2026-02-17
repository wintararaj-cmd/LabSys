require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function migrate() {
    try {
        console.log('Starting DB Migration...');

        // 1. Check if tables exist (check crucial table 'tenants')
        const res = await pool.query("SELECT to_regclass('public.tenants')");
        const tableExists = res.rows[0].to_regclass;

        if (!tableExists) {
            console.log('Database appears empty. Running initial schema...');
            const schemaPath = path.join(__dirname, '../models/schema.sql');
            let schema = fs.readFileSync(schemaPath, 'utf8');

            // Remove dangerous DROP commands to be safe(r) even if table check failed
            schema = schema.replace(/DROP TABLE IF EXISTS .*;/g, '');

            await pool.query(schema);
            console.log('Initial schema applied successfully.');
        } else {
            console.log('Database already initialized. Skipping full schema creation.');

            // 2. Run incremental updates if any
            console.log('Running incremental updates...');
            try {
                await pool.query(`
                    ALTER TABLE inventory_items ALTER COLUMN quantity TYPE DECIMAL(10, 2);

                    CREATE TABLE IF NOT EXISTS inventory_logs (
                        id SERIAL PRIMARY KEY,
                        tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
                        branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
                        item_id INT REFERENCES inventory_items(id) ON DELETE CASCADE,
                        type VARCHAR(20),
                        quantity DECIMAL(10, 2),
                        reason TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );

                    ALTER TABLE patients ADD COLUMN IF NOT EXISTS branch_id INT REFERENCES branches(id) ON DELETE SET NULL;
                    ALTER TABLE reports ADD COLUMN IF NOT EXISTS sample_id VARCHAR(50);

                    CREATE TABLE IF NOT EXISTS doctor_payouts (
                        id SERIAL PRIMARY KEY,
                        tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
                        doctor_id INT REFERENCES doctors(id) ON DELETE CASCADE,
                        amount DECIMAL(10,2) NOT NULL,
                        payment_date DATE DEFAULT CURRENT_DATE,
                        payment_mode VARCHAR(20),
                        reference_number VARCHAR(50),
                        notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS purchase_invoices (
                        id SERIAL PRIMARY KEY,
                        tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
                        branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
                        invoice_number VARCHAR(100) NOT NULL,
                        supplier_name VARCHAR(255) NOT NULL,
                        purchase_date DATE NOT NULL,
                        total_amount DECIMAL(10,2),
                        tax_amount DECIMAL(10,2) DEFAULT 0.00,
                        net_amount DECIMAL(10,2),
                        payment_status VARCHAR(20) CHECK (payment_status IN ('PAID', 'PENDING', 'PARTIAL')),
                        payment_mode VARCHAR(20),
                        notes TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS purchase_items (
                        id SERIAL PRIMARY KEY,
                        purchase_id INT REFERENCES purchase_invoices(id) ON DELETE CASCADE,
                        item_id INT REFERENCES inventory_items(id) ON DELETE CASCADE,
                        quantity DECIMAL(10,2) NOT NULL,
                        unit_price DECIMAL(10,2) NOT NULL,
                        tax_percentage DECIMAL(5,2) DEFAULT 0.00,
                        batch_number VARCHAR(50),
                        expiry_date DATE,
                        total_price DECIMAL(10,2)
                    );
                `);
                console.log('Incremental updates applied.');
            } catch (err) {
                console.error('Incremental update error (some may already exist):', err.message);
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
