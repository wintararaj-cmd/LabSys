require('dotenv').config();
const { query } = require('../config/db');

const addPurchaseTables = async () => {
    try {
        console.log('Adding purchase invoice tables...');

        await query(`
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

        console.log('Purchase invoice tables added successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Failed to add purchase tables:', error);
        process.exit(1);
    }
};

addPurchaseTables();
