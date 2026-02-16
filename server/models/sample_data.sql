-- Sample data for testing the LabSys application

-- Insert a test tenant (Lab)
INSERT INTO tenants (name, license_number, gst_number, contact_email, contact_phone, address, subscription_plan)
VALUES 
('City Diagnostics', 'LAB/2026/001', '29ABCDE1234F1Z5', 'contact@citydiag.com', '9876543210', '123 Main Street, Mumbai, Maharashtra 400001', 'GROWTH');

-- Insert main branch
INSERT INTO branches (tenant_id, name, address, phone, is_main_branch)
VALUES 
(1, 'City Diagnostics - Main Branch', '123 Main Street, Mumbai, Maharashtra 400001', '9876543210', true);

-- Insert users (password: Test123!)
-- Password hash for 'Test123!' using bcrypt
INSERT INTO users (tenant_id, branch_id, name, email, password_hash, role, is_active)
VALUES 
(1, 1, 'Dr. Sharma', 'admin@citydiag.com', '$2a$10$sDZuR7BWXF4x9EoN3jyQ5.p9dylv83hoNbpwB5cvl1vFQTuiE3EbW', 'ADMIN', true),
(1, 1, 'Rajesh Kumar', 'tech@citydiag.com', '$2a$10$sDZuR7BWXF4x9EoN3jyQ5.p9dylv83hoNbpwB5cvl1vFQTuiE3EbW', 'TECHNICIAN', true),
(1, 1, 'Priya Singh', 'reception@citydiag.com', '$2a$10$sDZuR7BWXF4x9EoN3jyQ5.p9dylv83hoNbpwB5cvl1vFQTuiE3EbW', 'RECEPTIONIST', true);

-- Insert doctors (referrers)
INSERT INTO doctors (tenant_id, name, specialization, phone, email, commission_percentage)
VALUES 
(1, 'Dr. Anil Kumar', 'General Physician', '9876543211', 'anil@example.com', 10.00),
(1, 'Dr. Sunita Patel', 'Cardiologist', '9876543212', 'sunita@example.com', 15.00),
(1, 'Dr. Ramesh Verma', 'Orthopedic', '9876543213', 'ramesh@example.com', 12.00);

-- Insert test catalog
INSERT INTO tests (tenant_id, name, code, category, price, cost, tat_hours, normal_range_male, normal_range_female, unit, sample_type)
VALUES 
(1, 'Complete Blood Count (CBC)', 'CBC001', 'Hematology', 500.00, 150.00, 4, '13-17 g/dL', '12-15 g/dL', 'g/dL', 'Blood'),
(1, 'Blood Sugar Fasting (BSF)', 'BSF001', 'Biochemistry', 150.00, 50.00, 2, '70-100 mg/dL', '70-100 mg/dL', 'mg/dL', 'Blood'),
(1, 'Lipid Profile', 'LP001', 'Biochemistry', 800.00, 250.00, 6, '<200 mg/dL', '<200 mg/dL', 'mg/dL', 'Blood'),
(1, 'Liver Function Test (LFT)', 'LFT001', 'Biochemistry', 600.00, 200.00, 6, '0.3-1.2 mg/dL', '0.3-1.2 mg/dL', 'mg/dL', 'Blood'),
(1, 'Kidney Function Test (KFT)', 'KFT001', 'Biochemistry', 550.00, 180.00, 6, '0.7-1.3 mg/dL', '0.6-1.1 mg/dL', 'mg/dL', 'Blood'),
(1, 'Thyroid Profile (T3, T4, TSH)', 'THY001', 'Endocrinology', 700.00, 220.00, 8, '0.4-4.0 mIU/L', '0.4-4.0 mIU/L', 'mIU/L', 'Blood'),
(1, 'Urine Routine', 'UR001', 'Pathology', 200.00, 60.00, 2, 'Normal', 'Normal', '-', 'Urine'),
(1, 'HbA1c (Glycated Hemoglobin)', 'HBA1C001', 'Biochemistry', 450.00, 140.00, 4, '<5.7%', '<5.7%', '%', 'Blood');

-- Insert sample patients
INSERT INTO patients (tenant_id, uhid, name, age, gender, phone, address)
VALUES 
(1, 'PAT260001', 'Amit Sharma', 35, 'Male', '9876543214', '456 Park Avenue, Mumbai'),
(1, 'PAT260002', 'Priya Desai', 28, 'Female', '9876543215', '789 Lake View, Mumbai'),
(1, 'PAT260003', 'Rajesh Patel', 45, 'Male', '9876543216', '321 Hill Road, Mumbai'),
(1, 'PAT260004', 'Sneha Reddy', 32, 'Female', '9876543217', '654 Beach Street, Mumbai'),
(1, 'PAT260005', 'Vikram Singh', 50, 'Male', '9876543218', '987 Garden Lane, Mumbai');

-- Insert sample invoices
INSERT INTO invoices (tenant_id, branch_id, patient_id, doctor_id, invoice_number, total_amount, discount_amount, tax_amount, net_amount, paid_amount, balance_amount, payment_status, payment_mode)
VALUES 
(1, 1, 1, 1, 'INV/2602/0001', 650.00, 50.00, 0.00, 600.00, 600.00, 0.00, 'PAID', 'CASH'),
(1, 1, 2, 2, 'INV/2602/0002', 800.00, 0.00, 0.00, 800.00, 500.00, 300.00, 'PARTIAL', 'UPI'),
(1, 1, 3, 1, 'INV/2602/0003', 1100.00, 100.00, 0.00, 1000.00, 0.00, 1000.00, 'PENDING', NULL);

-- Insert invoice items
INSERT INTO invoice_items (invoice_id, test_id, price, gst_percentage)
VALUES 
(1, 1, 500.00, 0.00),
(1, 2, 150.00, 0.00),
(2, 3, 800.00, 0.00),
(3, 1, 500.00, 0.00),
(3, 4, 600.00, 0.00);

-- Insert sample reports
INSERT INTO reports (invoice_id, test_id, result_value, is_abnormal, technician_id, pathologist_id, status, verified_at)
VALUES 
(1, 1, '14.5', false, 2, 1, 'VERIFIED', CURRENT_TIMESTAMP),
(1, 2, '95', false, 2, 1, 'VERIFIED', CURRENT_TIMESTAMP),
(2, 3, '220', true, 2, NULL, 'COMPLETED', NULL),
(3, 1, NULL, false, NULL, NULL, 'PENDING', NULL),
(3, 4, NULL, false, NULL, NULL, 'PENDING', NULL);

-- Insert inventory items
INSERT INTO inventory_items (tenant_id, name, batch_number, expiry_date, quantity, unit, supplier, low_stock_threshold)
VALUES 
(1, 'Blood Collection Tubes (EDTA)', 'BATCH001', '2026-12-31', 500, 'pieces', 'MedSupply Co.', 100),
(1, 'Reagent - Glucose', 'BATCH002', '2026-06-30', 50, 'ml', 'ChemLab Inc.', 20),
(1, 'Reagent - Cholesterol', 'BATCH003', '2026-03-15', 15, 'ml', 'ChemLab Inc.', 20),
(1, 'Urine Collection Containers', 'BATCH004', '2027-01-31', 300, 'pieces', 'MedSupply Co.', 50),
(1, 'Gloves (Latex)', 'BATCH005', '2026-08-31', 1000, 'pairs', 'SafetyFirst Ltd.', 200);

-- Display summary
SELECT 'Sample data inserted successfully!' as message;
SELECT 'Tenants: ' || COUNT(*) FROM tenants;
SELECT 'Users: ' || COUNT(*) FROM users;
SELECT 'Doctors: ' || COUNT(*) FROM doctors;
SELECT 'Patients: ' || COUNT(*) FROM patients;
SELECT 'Tests: ' || COUNT(*) FROM tests;
SELECT 'Invoices: ' || COUNT(*) FROM invoices;
SELECT 'Inventory Items: ' || COUNT(*) FROM inventory_items;
