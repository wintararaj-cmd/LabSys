require('dotenv').config();
const { pool } = require('../config/db');

const migrate = async () => {
    try {
        console.log('Starting schema update...');

        await pool.query(`
            ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS branch_id INT REFERENCES branches(id) ON DELETE SET NULL;
            ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS last_reorder_date TIMESTAMP;
            ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS item_code VARCHAR(50);
            ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS category VARCHAR(100);
            ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2);
            ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(100);
            ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier_contact VARCHAR(100);
            ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS location VARCHAR(100);
            ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(100);
            ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS reorder_level INT DEFAULT 10;
            
            ALTER TABLE inventory_items ALTER COLUMN quantity TYPE DECIMAL(10, 2);
            
            ALTER TABLE patients ADD COLUMN IF NOT EXISTS branch_id INT REFERENCES branches(id) ON DELETE SET NULL;
            ALTER TABLE reports ADD COLUMN IF NOT EXISTS sample_id VARCHAR(50);
        `);

        console.log('Schema update completed: branch_id added to inventory/patients, sample_id added to reports.');
        process.exit(0);
    } catch (error) {
        console.error('Schema update failed:', error);
        process.exit(1);
    }
};

migrate();
