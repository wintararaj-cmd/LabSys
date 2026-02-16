# Pathology Lab Management System (SaaS) - Architecture & Design

## 1. Project Folder Structure

```
/lab-sys-saas
├── /client                 # Frontend (React + Vite)
│   ├── /public
│   ├── /src
│   │   ├── /assets
│   │   ├── /components     # Reusable UI components (Button, Input, Modal)
│   │   ├── /context        # Global state (AuthContext, LabContext)
│   │   ├── /hooks          # Custom hooks (useAuth, useFetch)
│   │   ├── /layouts        # DashboardLayout, AuthLayout
│   │   ├── /pages          # Page components (Dashboard, Patients, Billing)
│   │   ├── /services       # API service calls (api.js)
│   │   ├── /utils          # Helper functions (formatDate, currency)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env
│   ├── package.json
│   └── vite.config.js
├── /server                 # Backend (Node.js + Express)
│   ├── /config             # DB config, environment variables
│   ├── /controllers        # Request handlers (authController, patientController)
│   ├── /middlewares        # Auth, Validation, Error handling
│   ├── /models             # Database models (Sequelize/Prisma/TypeORM) or raw SQL
│   ├── /routes             # API routes definition
│   ├── /services           # Business logic (ReportGeneration, BillingService)
│   ├── /utils              # Assistants (PDFGenerator, WhatsAppSender)
│   ├── /templates          # HTML templates for PDF reports/Emails
│   ├── server.js           # Entry point
│   ├── .env
│   └── package.json
└── README.md
```

## 2. PostgreSQL Database Schema

```sql
-- Multi-tenant SaaS Architecture

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

-- 2. Users (Admin, Doctor, Staff)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id),
    name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('ADMIN', 'DOCTOR', 'TECHNICIAN', 'RECEPTIONIST')),
    branch_id INT, -- For multi-branch support
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Branches (Multi-branch support)
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    is_main_branch BOOLEAN DEFAULT FALSE
);

-- 4. Doctors (Referrers)
CREATE TABLE doctors (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id),
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
    tenant_id INT REFERENCES tenants(id),
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
    tenant_id INT REFERENCES tenants(id),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50),
    category VARCHAR(100), -- Hematology, Biochemistry
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2), -- For profit calculation
    tat_hours INT, -- Turnaround time
    normal_range_male TEXT,
    normal_range_female TEXT,
    unit VARCHAR(20),
    sample_type VARCHAR(50) -- Blood, Urine, etc.
);

-- 7. Invoices (Billing)
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id),
    branch_id INT REFERENCES branches(id),
    patient_id INT REFERENCES patients(id),
    doctor_id INT REFERENCES doctors(id), -- Referrer
    invoice_number VARCHAR(50) NOT NULL,
    total_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2),
    tax_amount DECIMAL(10,2), -- GST
    net_amount DECIMAL(10,2),
    paid_amount DECIMAL(10,2),
    balance_amount DECIMAL(10,2),
    payment_status VARCHAR(20), -- PAID, PARTIAL, PENDING
    payment_mode VARCHAR(20), -- CASH, CARD, ONLINE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Invoice Items
CREATE TABLE invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoices(id),
    test_id INT REFERENCES tests(id),
    price DECIMAL(10,2),
    gst_percentage DECIMAL(5,2)
);

-- 9. Reports (Test Results)
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    invoice_id INT REFERENCES invoices(id),
    test_id INT REFERENCES tests(id),
    result_value TEXT,
    is_abnormal BOOLEAN DEFAULT FALSE,
    technician_id INT REFERENCES users(id),
    pathologist_id INT REFERENCES users(id),
    status VARCHAR(20), -- PENDING, COMPLETED, VERIFIED, DELIVERED
    verified_at TIMESTAMP,
    report_pdf_url TEXT
);

-- 10. Inventory Items
CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id),
    name VARCHAR(100),
    batch_number VARCHAR(50),
    expiry_date DATE,
    quantity INT,
    unit VARCHAR(20),
    supplier VARCHAR(100),
    low_stock_threshold INT
);
```

## 3. API Route Structure

*   **/api/auth**
    *   `POST /login`: Authenticate user & return JWT
    *   `POST /register`: Register a new tenant (SaaS signup)
    *   `POST /refresh-token`: Refresh JWT
*   **/api/dashboard**
    *   `GET /stats`: Get daily stats (revenue, patients, pending reports)
*   **/api/patients**
    *   `GET /`: List all patients (paginated)
    *   `POST /`: Register new patient
    *   `GET /:id`: Get patient details & history
*   **/api/tests**
    *   `GET /`: Master list of tests
    *   `POST /`: Add new test to catalog
*   **/api/invoices**
    *   `POST /`: Create new invoice (billing)
    *   `GET /:id/pdf`: Generate invoice PDF
*   **/api/reports**
    *   `GET /pending`: List pending reports
    *   `POST /update`: Enter test results
    *   `POST /verify`: Pathologist verification
    *   `GET /:id/download`: Download Report PDF

## 4. Authentication & Role-Based Access Control (RBAC)

*   **Technology:** JWT (JSON Web Tokens)
*   **Token Payload:** `{ userId, tenantId, role, branchId }`
*   **Middleware:**
    *   `verifyToken`: Decodes JWT and attaches user to `req.user`.
    *   `checkRole(['ADMIN', 'DOCTOR'])`: Checks if `req.user.role` is allowed.
    *   `tenantGuard`: Ensures all queries are scoped to `WHERE tenant_id = req.user.tenantId`. **CRITICAL for SaaS data isolation.**

## 5. Clean Admin Dashboard Layout

*   **Sidebar (Left):**
    *   Dashboard (Home icon)
    *   Registration (User plus icon)
    *   Billing (Credit card icon)
    *   Lab Reports (Flask icon)
    *   Doctors (Stethoscope icon)
    *   Inventory (Box icon)
    *   Settings (Gear icon)
*   **Top Header:**
    *   Tenant/Lab Name & Logo
    *   Global Search Bar (Search Patient by Name/ID/Mobile)
    *   Notification Bell (Low stock, Abnormal reports)
    *   User Profile Dropdown
*   **Main Content Area:**
    *   Breadcrumbs
    *   Page Title & Action Buttons
    *   Cards/Tables/Forms

## 6. Report PDF Generation Logic

*   **Library:** `Puppeteer` or `PDFKit` (Puppeteer recommended for complex layouts).
*   **Process:**
    1.  Fetch report data (Patient info, Test results, Normal ranges).
    2.  Load HTML Template (Handlebars/EJS).
    3.  Inject data into template.
    4.  Logic for **Abnormal Highlighting**: If `result < min || result > max`, add class `.abnormal` (Bold + Red).
    5.  Generate QR Code containing `https://lab.com/verify/REPORT_ID`.
    6.  Convert HTML to PDF.
    7.  Upload to S3/Local Storage and return URL.

## 7. Billing & GST Logic (India Compliant)

*   **Logic:**
    *   Each Test has a Base Price.
    *   GST is usually exempt for medical services in India, but if applicable (e.g., cosmetic):
        *   `CGST = (Price * Rate) / 2`
        *   `SGST = (Price * Rate) / 2`
        *   `IGST = (Price * Rate)` (Inter-state)
*   **Invoice Numbering:** Sequential per branch/financial year (e.g., `INV/24-25/001`).

## 8. Multi-Branch Support

*   **Schema:** `branch_id` in `users`, `invoices`, `inventory`.
*   **Logic:**
    *   Admin sees aggregate data of all branches.
    *   Staff sees data *only* for their assigned `branch_id`.
    *   Prefix keys/IDs with branch codes to avoid collisions if needed.

## 9. Doctor Referral & Commission

*   **Module:**
    *   **Referral Master:** Store doctor details & default commission %.
    *   **Calculation:** On Invoice generation, link `invoice.doctor_id`.
    *   **Report:** "Monthly Doctor Commission Statement".
        *   `Commission = Total Referred Business * (Doctor % / 100)`

## 10. Inventory Module

*   **Features:**
    *   **Stock In:** Add items, Batch No, Expiry.
    *   **Consumption:** Auto-deduct reagents based on tests performed (Advanced) or Manual stock adjustment.
    *   **Expiry Alert:** Cron job runs daily -> Checks `inventory_items WHERE expiry_date < NOW() + INTERVAL '30 DAYS'`. Sends notification.

## 11. Daily Collection & Analytics Queries

*   **Daily Collection:**
    ```sql
    SELECT SUM(paid_amount) FROM invoices 
    WHERE tenant_id = $1 AND DATE(created_at) = CURRENT_DATE;
    ```
*   **Monthly Trend:**
    ```sql
    SELECT DATE_TRUNC('month', created_at), COUNT(*) 
    FROM patients 
    WHERE tenant_id = $1 
    GROUP BY 1;
    ```

## 12. SaaS Subscription & Plan Structure

*   **Plans:**
    *   **Starter:** Max 100 invoices/month, 1 user.
    *   **Growth:** Max 1000 invoices/month, 5 users.
    *   **Enterprise:** Unlimited.
*   **Enforcement:** Middleware checks usage stats before creating new records.

## 13. Secure Production Deployment Checklist

1.  **Environment Variables:** NEVER commit `.env`.
2.  **HTTPS:** Mandatory (Let's Encrypt).
3.  **Database:** Use a managed Postgres (AWS RDS / Railway) with daily backups.
4.  **Security Headers:** Use `helmet` in Express.
5.  **Rate Limiting:** Use `express-rate-limit` to prevent abuse.
6.  **Logs:** Use `winston` or `morgan` for logging errors.
7.  **Process Manager:** Use `PM2` to keep Node.js alive.

## 14. Environment Variables Structure

```env
PORT=5000
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=super_secure_random_string
NODE_ENV=production
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=...
WHATSAPP_API_KEY=...
```

## 15. Future Scalability Suggestions

1.  **Read Replicas:** Send `GET` requests to a read-only DB replica.
2.  **Caching:** Use Redis to cache `Tests Master` and `User Profile` data.
3.  **Queue System:** Use BullMQ/Redis for generating PDFs and sending Emails/WhatsApp to avoid blocking the main thread.
4.  **Horizontal Scaling:** Run multiple instances of the Node.js server behind a load balancer (Nginx/AWS ALB).
