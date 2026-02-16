require('dotenv').config();
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

const seed = async () => {
    try {
        console.log('Starting data seeding...');

        // Check if Admin User exists specifically (by email)
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@labsys.com';
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [adminEmail]);
        if (userCheck.rows.length > 0) {
            console.log(`Admin user ${adminEmail} already exists. Skipping seed.`);
            process.exit(0);
        }

        console.log(`Admin user ${adminEmail} not found. Seeding...`);

        // Ensure tenants exist
        let tenantId;
        const tenantCheck = await pool.query('SELECT id FROM tenants LIMIT 1');
        if (tenantCheck.rows.length > 0) {
            tenantId = tenantCheck.rows[0].id;
            console.log(`Using existing tenant ID: ${tenantId}`);
        } else {
            const tenantRes = await pool.query(`
                INSERT INTO tenants (name, license_number, contact_email, subscription_plan)
                VALUES ($1, $2, $3, $4) RETURNING id
            `, ['Demo Lab', 'DEMO-12345', 'admin@demolab.com', 'PRO']);
            tenantId = tenantRes.rows[0].id;
            console.log(`Created Tenant: Demo Lab (ID: ${tenantId})`);
        }

        // Ensure branches exist
        let branchId;
        const branchCheck = await pool.query('SELECT id FROM branches WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        if (branchCheck.rows.length > 0) {
            branchId = branchCheck.rows[0].id;
            console.log(`Using existing branch ID: ${branchId}`);
        } else {
            const branchRes = await pool.query(`
                INSERT INTO branches (tenant_id, name, address, is_main_branch)
                VALUES ($1, $2, $3, $4) RETURNING id
            `, [tenantId, 'Main Branch', '123 Health St', true]);
            branchId = branchRes.rows[0].id;
            console.log(`Created Branch: Main Branch (ID: ${branchId})`);
        }

        // Create Admin User
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        await pool.query(`
            INSERT INTO users (tenant_id, branch_id, name, email, password_hash, role)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [tenantId, branchId, 'Super Admin', adminEmail, hashedPassword, 'ADMIN']);

        console.log('Seeding completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seed();
