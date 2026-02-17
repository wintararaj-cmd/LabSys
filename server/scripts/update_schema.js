require('dotenv').config();
const { pool } = require('../config/db');

const migrate = async () => {
    try {
        console.log('Starting schema update...');

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
        `);

        console.log('Schema update completed: branch_id added to inventory/patients, sample_id added to reports.');
        process.exit(0);
    } catch (error) {
        console.error('Schema update failed:', error);
        process.exit(1);
    }
};

migrate();
