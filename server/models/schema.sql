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
    role VARCHAR(20) CHECK (role IN ('ADMIN', 'DOCTOR', 'TECHNICIAN', 'RECEPTIONIST')),
    is_active BOOLEAN DEFAULT TRUE,
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
    sample_type VARCHAR(50) -- Blood, Urine, etc.
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
    payment_status VARCHAR(20) CHECK (payment_status IN ('PAID', 'PARTIAL', 'PENDING')),
    payment_mode VARCHAR(20), -- CASH, CARD, ONLINE, UPI
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

-- 9. Reports (Test Results)
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
    comments TEXT
);

-- 10. Inventory Items
CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
    name VARCHAR(100),
    item_code VARCHAR(50),
    category VARCHAR(100),
    unit VARCHAR(20),
    quantity INT,
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
