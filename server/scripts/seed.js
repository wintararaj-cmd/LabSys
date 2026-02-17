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
            console.log(`Admin user ${adminEmail} already exists. Skipping admin creation.`);
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

        if (userCheck.rows.length === 0) {
            // Create Admin User
            const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminPassword, salt);

            await pool.query(`
                INSERT INTO users (tenant_id, branch_id, name, email, password_hash, role)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [tenantId, branchId, 'Super Admin', adminEmail, hashedPassword, 'ADMIN']);

            console.log(`Created Admin User: ${adminEmail}`);
        } else {
            console.log(`Admin user ${adminEmail} already exists. Skipping admin creation.`);
        }

        // --- EXTENDED DEMO DATA ---

        // 5. Seed Doctors
        const doctorsCheck = await pool.query('SELECT id FROM doctors WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        if (doctorsCheck.rows.length === 0) {
            console.log('Seeding demo doctors...');
            await pool.query(`
                INSERT INTO doctors (tenant_id, name, specialization, phone, email, commission_percentage)
                VALUES 
                ($1, 'Dr. Arpit Sharma', 'General Physician', '9876543210', 'arpit@example.com', 10.00),
                ($1, 'Dr. Kavita Reddy', 'Cardiologist', '9876543211', 'kavita@example.com', 15.00),
                ($1, 'Dr. Samuel Jackson', 'Pediatrician', '9876543212', 'samuel@example.com', 12.00)
            `, [tenantId]);
        }

        // 6. Seed Patients
        const patientsCheck = await pool.query('SELECT id FROM patients WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        if (patientsCheck.rows.length === 0) {
            console.log('Seeding demo patients...');
            await pool.query(`
                INSERT INTO patients (tenant_id, uhid, name, age, gender, phone, address)
                VALUES 
                ($1, 'UHID001', 'Rahul Kumar', 34, 'Male', '9988776655', 'Sector 15, Gurgaon'),
                ($1, 'UHID002', 'Priya Singh', 28, 'Female', '9988776656', 'HSR Layout, Bangalore'),
                ($1, 'UHID003', 'Mohammad Ali', 45, 'Male', '9988776657', 'Andheri West, Mumbai')
            `, [tenantId]);
        }

        // 7. Seed Tests
        const testsCheck = await pool.query('SELECT id FROM tests WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        if (testsCheck.rows.length === 0) {
            console.log('Seeding demo tests...');
            await pool.query(`
                INSERT INTO tests (tenant_id, name, code, category, price, cost, tat_hours, normal_range_male, normal_range_female, unit, sample_type)
                VALUES 
                ($1, 'Complete Blood Count (CBC)', 'CBC01', 'Hematology', 500.00, 150.00, 24, '13.5-17.5', '12.0-15.5', 'g/dL', 'Blood'),
                ($1, 'Lipid Profile', 'LP01', 'Biochemistry', 1200.00, 400.00, 48, '<200', '<200', 'mg/dL', 'Blood'),
                ($1, 'HbA1c', 'HBA1C', 'Biochemistry', 800.00, 250.00, 24, '4.0-5.6', '4.0-5.6', '%', 'Blood'),
                ($1, 'Urine Routine', 'UR01', 'Clinical Pathology', 250.00, 50.00, 12, 'Negative', 'Negative', '', 'Urine'),
                ($1, 'Thyroid Profile (T3, T4, TSH)', 'TFT01', 'Hormones', 1500.00, 600.00, 48, '0.4-4.0', '0.4-4.0', 'uIU/mL', 'Blood')
            `, [tenantId]);
        }

        // 8. Seed Inventory
        const inventoryCheck = await pool.query('SELECT id FROM inventory_items WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        if (inventoryCheck.rows.length === 0) {
            console.log('Seeding demo inventory...');
            await pool.query(`
                INSERT INTO inventory_items (tenant_id, name, batch_number, expiry_date, quantity, unit, supplier_name, reorder_level)
                VALUES 
                ($1, 'Vacutainer (Edta)', 'BTCH-001', '2025-12-31', 500, 'Pack', 'LabSupplies Inc', 50),
                ($1, 'Glucose Reagent', 'REAG-99', '2025-06-30', 20, 'Vial', 'BioTech Solutions', 5),
                ($1, 'Nitrile Gloves', 'GLV-102', '2026-03-15', 100, 'Box', 'SafeTouch', 10)
            `, [tenantId]);
        }

        // 9. Seed External Labs
        const labsCheck = await pool.query('SELECT id FROM external_labs WHERE tenant_id = $1 LIMIT 1', [tenantId]);
        if (labsCheck.rows.length === 0) {
            console.log('Seeding demo external labs...');
            await pool.query(`
                INSERT INTO external_labs (tenant_id, name, contact_person, phone, email, address)
                VALUES 
                ($1, 'City Referral Lab', 'Mr. Verma', '9898989898', 'city@referral.com', 'Downtown, City Center'),
                ($1, 'Apex Diagnostic Center', 'Ms. Sneha', '9797979797', 'contact@apex.com', 'Main Rd, Uplands')
            `, [tenantId]);
        }

        // 10. Seed Invoices & Reports (Transactional Data for Dashboard)
        const invoiceCheck = await pool.query('SELECT id FROM invoices WHERE invoice_number = $1 AND tenant_id = $2', ['INV-DEMO-001', tenantId]);

        if (invoiceCheck.rows.length === 0) {
            console.log('Seeding demo invoices and reports...');

            // Get IDs
            const pRes = await pool.query('SELECT id FROM patients WHERE uhid = $1', ['UHID001']);
            const dRes = await pool.query('SELECT id FROM doctors WHERE email = $1', ['arpit@example.com']);
            const tRes = await pool.query('SELECT id, price FROM tests WHERE code = $1', ['CBC01']);

            if (pRes.rows.length > 0 && dRes.rows.length > 0 && tRes.rows.length > 0) {
                const pid = pRes.rows[0].id;
                const did = dRes.rows[0].id;
                const tid = tRes.rows[0].id;
                const price = tRes.rows[0].price; // 500

                // Create Invoice
                const invRes = await pool.query(`
                    INSERT INTO invoices (tenant_id, branch_id, patient_id, doctor_id, invoice_number, total_amount, net_amount, paid_amount, payment_status, payment_mode)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
                `, [tenantId, branchId, pid, did, 'INV-DEMO-001', price, price, price, 'PAID', 'CASH']);

                const invId = invRes.rows[0].id;

                // Create Invoice Item
                await pool.query(`
                    INSERT INTO invoice_items (invoice_id, test_id, price)
                    VALUES ($1, $2, $3)
                `, [invId, tid, price]);

                // Create Report (Pending)
                await pool.query(`
                    INSERT INTO reports (invoice_id, test_id, status, sample_id)
                    VALUES ($1, $2, 'PENDING', 'SMP-001')
                `, [invId, tid]);

                console.log('Seeded Invoice INV-DEMO-001 with Pending Report');
            } else {
                console.log('Skipping invoice seed: Missing dependencies (patient/doctor/test)');
            }
        }

        console.log('Seeding completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seed();
