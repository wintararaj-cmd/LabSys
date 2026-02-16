require('dotenv').config();
const { pool } = require('../config/db');

const migrate = async () => {
    try {
        console.log('Starting schema update...');

        await pool.query(`
            ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS branch_id INT REFERENCES branches(id) ON DELETE SET NULL;
            ALTER TABLE patients ADD COLUMN IF NOT EXISTS branch_id INT REFERENCES branches(id) ON DELETE SET NULL;
        `);

        console.log('Schema update completed: branch_id added to inventory_items and patients.');
        process.exit(0);
    } catch (error) {
        console.error('Schema update failed:', error);
        process.exit(1);
    }
};

migrate();
