-- Full PostgreSQL Database Schema for Pathology Lab Management System

-- Drop tables if they exist (for development/reset)
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS tests CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS inventory_logs CASCADE;
DROP TABLE IF EXISTS doctor_payouts CASCADE;
DROP TABLE IF EXISTS purchase_invoices CASCADE;
DROP TABLE IF EXISTS purchase_items CASCADE;
DROP TABLE IF EXISTS external_labs CASCADE;
DROP TABLE IF EXISTS test_profile_items CASCADE;

-- 1. Tenants (Labs)
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100),
    gst_number VARCHAR(20),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    address TEXT,
    logo_url TEXT,
    subscription_plan VARCHAR(50) DEFAULT 'FREE', -- FREE, BASIC, PRO
    subscription_expiry DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Branches (Multi-branch support)
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    is_main_branch BOOLEAN DEFAULT FALSE
);

-- 3. Users (Admin, Doctor, Staff)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id INT REFERENCES branches(id) ON DELETE SET NULL, -- Can be NULL for tenant admin
    name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('ADMIN', 'DOCTOR', 'TECHNICIAN', 'RECEPTIONIST', 'RADIOLOGIST', 'ACCOUNTANT')),
    is_active BOOLEAN DEFAULT TRUE,
    can_view BOOLEAN DEFAULT TRUE,
    can_create BOOLEAN DEFAULT TRUE,
    can_update BOOLEAN DEFAULT TRUE,
    module_permissions JSONB DEFAULT '{}'::jsonb,
    sessions_invalidated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Doctors (Referrers)
CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    commission_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_introducer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Patients
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
    uhid VARCHAR(20) UNIQUE, -- Unique Health ID
    name VARCHAR(100) NOT NULL,
    age INT,
    gender VARCHAR(10),
    phone VARCHAR(20),
    address TEXT,
    branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Test Master (Service Catalog)
CREATE TABLE tests (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50),
    category VARCHAR(100), -- Hematology, Biochemistry
    price DECIMAL(10,2) NOT NULL, -- Selling Price
    cost DECIMAL(10,2), -- Cost for profit calculation
    tat_hours INT, -- Turnaround time
    normal_range_male TEXT, -- JSON or Text description
    normal_range_female TEXT,
    unit VARCHAR(20),
    sample_type VARCHAR(50), -- Blood, Urine, etc.
    gst_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_profile BOOLEAN DEFAULT FALSE -- Support for grouped tests/panels
);

CREATE TABLE test_profile_items (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES tests(id) ON DELETE CASCADE,
    test_id INT REFERENCES tests(id) ON DELETE CASCADE,
    sort_order INT DEFAULT 0
);

-- 7. Invoices (Billing)
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
    patient_id INT REFERENCES patients(id) ON DELETE SET NULL,
    doctor_id INT REFERENCES doctors(id) ON DELETE SET NULL, -- Referrer
    invoice_number VARCHAR(50) NOT NULL, -- Should be unique per branch/year
    total_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00, -- GST
    net_amount DECIMAL(10,2),
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    balance_amount DECIMAL(10,2) DEFAULT 0.00,
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    refund_note TEXT,
    payment_status VARCHAR(20) CHECK (payment_status IN ('PAID', 'PARTIAL', 'PENDING', 'REFUNDED')),
    payment_mode VARCHAR(20), -- CASH, CARD, ONLINE, UPI
    introducer_id INT REFERENCES doctors(id) ON DELETE SET NULL,
    department VARCHAR(50) DEFAULT 'GENERAL',
    commission_mode VARCHAR(20) DEFAULT 'DOCTOR'
        CHECK (commission_mode IN ('DOCTOR','INTRODUCER','SPLIT','NONE')),
    doctor_commission DECIMAL(10,2) DEFAULT 0.00,
    introducer_commission DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Invoice Items (Individual Tests per Invoice)
CREATE TABLE invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE,
    test_id INT REFERENCES tests(id) ON DELETE SET NULL,
    price DECIMAL(10,2), -- Price at time of invoicing
    gst_percentage DECIMAL(5,2) DEFAULT 0.00
);

-- 9. External Reference Labs
CREATE TABLE external_labs (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Reports (Test Results)
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE,
    test_id INT REFERENCES tests(id) ON DELETE CASCADE,
    result_value TEXT,
    is_abnormal BOOLEAN DEFAULT FALSE,
    technician_id INT REFERENCES users(id),
    pathologist_id INT REFERENCES users(id), -- Verifier
    status VARCHAR(20) CHECK (status IN ('PENDING', 'COMPLETED', 'VERIFIED', 'DELIVERED')),
    verified_at TIMESTAMP,
    report_pdf_url TEXT,
    comments TEXT,
    sample_id VARCHAR(50),
    external_lab_id INT REFERENCES external_labs(id) ON DELETE SET NULL,
    outbound_status VARCHAR(20) DEFAULT 'NOT_SENT' CHECK (outbound_status IN ('NOT_SENT', 'SENT', 'RECEIVED', 'REPORT_UPLOADED')),
    tracking_number VARCHAR(100),
    courier_name VARCHAR(100),
    external_cost DECIMAL(10,2) DEFAULT 0.00
);

-- 11. Inventory Items
CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
    name VARCHAR(100),
    item_code VARCHAR(50),
    category VARCHAR(100),
    unit VARCHAR(20),
    quantity DECIMAL(10, 2),
    reorder_level INT DEFAULT 10,
    unit_price DECIMAL(10, 2),
    supplier_name VARCHAR(100),
    supplier_contact VARCHAR(100),
    batch_number VARCHAR(50),
    expiry_date DATE,
    location VARCHAR(100),
    manufacturer VARCHAR(100),
    last_reorder_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Inventory Logs (Transaction History)
CREATE TABLE inventory_logs (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
    item_id INT REFERENCES inventory_items(id) ON DELETE CASCADE,
    type VARCHAR(20), -- ADD, REMOVE, INITIAL
    quantity DECIMAL(10, 2),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Doctor Payouts
CREATE TABLE doctor_payouts (
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

-- 14. Purchase Invoices
CREATE TABLE purchase_invoices (
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

-- 15. Purchase Items
CREATE TABLE purchase_items (
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

-- 16. Audit Logs (System Activity)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50),
    old_values JSONB,
    new_values JSONB,
    details TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. Notification Settings (Per Tenant)
CREATE TABLE notification_settings (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    whatsapp_enabled BOOLEAN DEFAULT FALSE,
    provider VARCHAR(50) DEFAULT 'FAST2SMS',
    api_key TEXT,
    sender_id VARCHAR(20),
    whatsapp_api_url TEXT,
    whatsapp_token TEXT,
    notify_on_report_ready BOOLEAN DEFAULT TRUE,
    notify_on_report_verified BOOLEAN DEFAULT TRUE,
    notify_on_invoice_created BOOLEAN DEFAULT TRUE,
    report_ready_template TEXT DEFAULT 'Dear {name}, your report for {test} is ready. Download: {link}',
    report_verified_template TEXT DEFAULT 'Dear {name}, your report has been verified. Invoice: {invoice}. Download: {link}',
    invoice_template TEXT DEFAULT 'Dear {name}, invoice {invoice} of Rs.{amount} created. Balance: Rs.{balance}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. Notification Logs
CREATE TABLE notification_logs (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id INT REFERENCES patients(id) ON DELETE SET NULL,
    invoice_id INT REFERENCES invoices(id) ON DELETE SET NULL,
    channel VARCHAR(20) NOT NULL,
    phone VARCHAR(20),
    message TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    provider_response TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);