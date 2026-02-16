require('dotenv').config(); // Should pick up .env from CWD (server/)
const { pool } = require('../config/db');

console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD length:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 'undefined');

const migrate = async () => {
    try {
        console.log('Starting migration...');

        await pool.query(`
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
        `);

        console.log('Migration completed: doctor_payouts table created.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
