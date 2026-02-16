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
                // Example: safe add column
                await pool.query(`
                    ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS branch_id INT REFERENCES branches(id) ON DELETE SET NULL;
                    ALTER TABLE patients ADD COLUMN IF NOT EXISTS branch_id INT REFERENCES branches(id) ON DELETE SET NULL;
                `);
                console.log('Incremental updates applied.');
            } catch (err) {
                console.error('Incremental update error (may already exist):', err.message);
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
