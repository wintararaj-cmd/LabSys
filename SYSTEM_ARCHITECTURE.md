# 🏥 LabSys - Pathology Lab Management SaaS Architecture

**System Version:** 1.0.0  
**Tech Stack:** React (Frontend) + Node.js/Express (Backend) + PostgreSQL (Database)

---

## 1. Project Folder Structure

```
LabSys/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # Reusable UI components (Sidebar, Navbar, Cards)
│   │   ├── services/       # API Integration (axios instance, endpoint methods)
│   │   ├── pages/          # Main Views (Dashboard, Patients, Billing, Reports)
│   │   ├── context/        # State Management (AuthContext)
│   │   └── styles/         # CSS/SCSS files
│   └── package.json
│
├── server/                 # Backend (Node.js + Express)
│   ├── config/             # DB Connection, Env Vars
│   ├── controllers/        # Business Logic (Auth, Patients, Reports)
│   ├── middlewares/        # Auth Guards, Tenant Isolation, Error Handling
│   ├── models/             # SQL Schema & Migrations
│   ├── routes/             # API Endpoint Definitions
│   ├── services/           # Helper Services (PDF Generation, Email)
│   ├── uploads/            # Generated PDF storage (Temp)
│   └── package.json
│
└── .env                    # Environment Variables
```

---

## 2. Database Schema (PostgreSQL)

Designed for **Multi-Tenancy** (every table has `tenant_id`).

### **Core Tables**
- **Tenants:** Lab profiles, license info, SaaS plan (Free/Pro).
- **Users:** Staff login (Admin, Technician, Receptionist) linked to Tenant.
- **Patients:** Patient demographics, UHID.
- **Doctors:** Referring doctors & commission rates.

### **Operational Tables**
- **Tests:** Service catalog (Hematology, Biochemistry) with prices & normal ranges.
- **Invoices:** Billing master, GST tax, payment status, doctor reference.
- **Invoice_Items:** Individual tests linked to invoices.
- **Reports:** Test results, abnormality flags, technician/pathologist signatures.
- **Doctor_Payouts:** Track commission payments to doctors.
- **Inventory_Items:** Stock tracking with expiry dates.

---

## 3. REST API Structure

**Base URL:** `/api/v1`

| Module | Route | Methods | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `/auth` | POST | Login, Register, Refresh Token |
| **Patients** | `/patients` | GET, POST, PUT | Manage patient records |
| **Tests** | `/tests` | GET, POST, PUT | Manage test catalog & prices |
| **Invoices** | `/invoices` | GET, POST | Billing & GST calculation |
| **Reports** | `/reports` | GET, PUT | Enter results, Verify, Print PDF |
| **Doctors** | `/doctors` | GET, POST, PUT | Manage doctors & commissions |
| **Dashboard** | `/dashboard` | GET | Analytics & Daily Stats |
| **Inventory** | `/inventory` | GET, POST | Stock & Expiry Alerts |

---

## 4. Authentication & Security

- **JWT (JSON Web Tokens):** Stateless authentication.
- **Tenant Isolation:** Middleware (`req.tenantId`) ensures users only access their own lab's data.
- **Role-Based Access Control (RBAC):**
    - `ADMIN`: Full Access.
    - `PATHOLOGIST`: Verify reports, Sign reports.
    - `TECHNICIAN`: Enter results.
    - `RECEPTIONIST`: Billing, Patient Registration.

---

## 5. Admin Dashboard Layout

- **Stats Cards:** Total Patients, Revenue, Pending Reports, Critical Inventory.
- **Charts:** Revenue Trends (Monthly), Test Frequency.
- **Quick Actions:** "New Invoice", "Register Patient".
- **Sidebar Navigation:** Persistent access to all modules.

---

## 6. Report PDF Generation

- **Library:** `Puppeteer` (Headless Chrome) for high-fidelity rendering.
- **Features:**
    - Custom Letterhead (Logo, Address).
    - Dynamic Patient & Doctor details.
    - **Smart Highlighting:** Bolds/Colors values outside normal range.
    - **QR Code:** For verifying report authenticity.
    - **Digital Signatures:** Auto-appended based on verifying pathologist.

---

## 7. Billing & GST Logic

- **Structure:**
    - Base Price (from Test Master).
    - GST Calculation (CGST + SGST).
    - Discount Logic (Flat amount).
- **Compliance:**
    - Generates unique Invoice Number (`INV/YYMM/0001`).
    - Tracks Payment Mode (Cash/UPI/Card).
    - Split payments (Partial/Paid/Pending).

---

## 8. Multi-Branch Support

- **Database:** `branches` table linked to `tenants`.
- **Logic:** Users are assigned to a specific `branch_id`.
- **Data Scope:** Admins see all branches; Staff sees only local branch data.

---

## 9. Doctor Commission Module

- **Configuration:** Set percentage (`10%`) or fixed amount (`₹100`) per doctor.
- **Calculation:** Auto-calculated when Invoice is generated.
- **Payouts:**
    - `getOutstandingCommission`: Calculates `(Total Referred Revenue * %) - Paid Amount`.
    - `Doctor_Payouts`: Table to record cash/online payments to doctors.

---

## 10. Inventory Management

- **Expiry Logic:**
    - Tracks `expiry_date` per batch.
    - **Dashboard Alert:** Shows items expiring in < 30 days.
- **Low Stock:** Alerts when `quantity < low_stock_threshold`.

---

## 11. SaaS Subscription Plan

- **Free Tier:** Limited Patients/Month.
- **Pro Tier:** Unlimited, Multi-branch, WhatsApp Support.
- **Implementation:** `tenants.subscription_plan` column. Middleware checks limits before actions (e.g., creating 101st invoice).

---

## 12. Deployment Checklist (Production)

1.  **Environment Variables:** Securely set `DB_PASSWORD`, `JWT_SECRET`.
2.  **Process Management:** Use `PM2` to keep Node.js alive.
    - `pm2 start server/index.js --name "labsys-backend"`
3.  **Reverse Proxy:** Nginx to handle SSL and forward port 80 -> 5000.
4.  **Database Backups:** Cron job for `pg_dump`.
    - `0 2 * * * pg_dump -U postgres labsys > /backups/labsys_$(date +\%F).sql`
5.  **Frontend Build:** `npm run build` -> Serve static files via Nginx.

---

## 13. Future Scalability

- **Queue System:** Use Redis/BullMQ for generating PDFs asynchronously during high load.
- **S3 Storage:** Move PDF storage from local disk to AWS S3 / DigitalOcean Spaces.
- **WhatsApp Integration:** Integrate Twilio/Meta API for auto-sending PDFs.
- **Patient Portal:** Mobile app for patients to download history.

---

**Generated by LabSys Architect AI** 🚀
