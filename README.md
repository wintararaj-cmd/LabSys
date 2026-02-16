# Pathology Lab Management System (LabSys) - Complete SaaS Platform

## 🎯 Overview
A complete, production-ready **Multi-Tenant SaaS** platform for Pathology Labs in India, similar to LabPro and OxyLab.

## 🏗️ Tech Stack
- **Frontend**: React.js + Vite
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **PDF Generation**: Puppeteer
- **Deployment**: VPS / Railway / Render

## 📁 Project Structure
```
/LabSys
├── /client                 # React Frontend
│   ├── /src
│   │   ├── /components    # Reusable UI components
│   │   ├── /pages         # Page components
│   │   ├── /context       # Global state management
│   │   ├── /services      # API service calls
│   │   └── /utils         # Helper functions
│   └── package.json
├── /server                # Node.js Backend
│   ├── /config           # Database & environment config
│   ├── /controllers      # Request handlers
│   ├── /middlewares      # Auth, validation, error handling
│   ├── /models           # Database schema
│   ├── /routes           # API route definitions
│   ├── /services         # Business logic (PDF, WhatsApp)
│   ├── /utils            # Helper utilities
│   ├── server.js         # Entry point
│   └── package.json
└── DESIGN.md             # Complete architecture documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- PostgreSQL (v13+)
- npm or yarn

### 1. Database Setup
```bash
# Create database
createdb labsys

# Run schema
psql -U postgres -d labsys -f server/models/schema.sql
```

### 2. Backend Setup
```bash
cd server
npm install

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Start development server
npm run dev
```

### 3. Frontend Setup
```bash
cd client
npm install
npm run dev
```

## 📊 Database Schema

### Core Tables
1. **tenants** - Lab organizations (Multi-tenant isolation)
2. **users** - Admin, Doctors, Technicians, Receptionists
3. **branches** - Multi-branch support
4. **patients** - Patient records with UHID
5. **tests** - Test catalog with pricing & normal ranges
6. **invoices** - Billing with GST calculation
7. **invoice_items** - Individual tests per invoice
8. **reports** - Test results with verification workflow
9. **doctors** - Referral doctors with commission tracking
10. **inventory_items** - Stock management with expiry alerts

## 🔐 Authentication & Security

### JWT Token Structure
```json
{
  "userId": 123,
  "tenantId": 45,
  "branchId": 67,
  "role": "ADMIN",
  "email": "admin@lab.com"
}
```

### Role-Based Access Control (RBAC)
- **ADMIN**: Full access to all modules
- **DOCTOR**: Report verification
- **TECHNICIAN**: Result entry
- **RECEPTIONIST**: Patient registration, billing

### Security Features
- ✅ Helmet.js for security headers
- ✅ Rate limiting (100 requests/15 min)
- ✅ CORS protection
- ✅ Password hashing (bcrypt)
- ✅ Tenant data isolation (Critical for SaaS)

## 📡 API Endpoints

### Authentication
```
POST /api/auth/register      # Register new lab (SaaS signup)
POST /api/auth/login         # Login & get JWT token
POST /api/auth/refresh-token # Refresh expired token
```

### Dashboard
```
GET /api/dashboard/stats     # Today's collection, pending reports, alerts
GET /api/dashboard/analytics # Monthly revenue, doctor referrals
```

### Patients
```
GET    /api/patients         # List all patients (paginated, searchable)
POST   /api/patients         # Register new patient (auto-generates UHID)
GET    /api/patients/:id     # Get patient details with history
PUT    /api/patients/:id     # Update patient info
```

### Tests (Master Catalog)
```
GET    /api/tests            # Get all tests
POST   /api/tests            # Add new test
PUT    /api/tests/:id        # Update test
DELETE /api/tests/:id        # Delete test
```

### Invoices (Billing)
```
POST /api/invoices           # Create invoice (auto-generates invoice number)
GET  /api/invoices           # List invoices (filterable by status, date)
GET  /api/invoices/:id       # Get invoice details
PUT  /api/invoices/:id/payment # Update payment
```

### Reports
```
GET /api/reports/pending              # Get pending reports
PUT /api/reports/:id/result           # Enter test result (Technician)
PUT /api/reports/:id/verify           # Verify report (Pathologist)
GET /api/reports/invoice/:invoiceId   # Get all reports for invoice
```

### Doctors
```
GET /api/doctors                      # List all doctors
POST /api/doctors                     # Add new doctor
PUT /api/doctors/:id                  # Update doctor
GET /api/doctors/:id/commission       # Get commission report
```

### Inventory
```
GET /api/inventory                    # List inventory items
GET /api/inventory/alerts             # Low stock & expiring items
POST /api/inventory                   # Add inventory item
PUT /api/inventory/:id                # Update stock
```

## 💰 Billing & GST (India Compliant)

### GST Calculation
```javascript
// For medical services (usually exempt, but if applicable):
CGST = (Amount × GST%) / 2
SGST = (Amount × GST%) / 2
IGST = Amount × GST%  // For inter-state

Total = Amount + GST - Discount
```

### Invoice Number Format
```
INV/YYMM/0001
Example: INV/2602/0001 (Feb 2026, Invoice #1)
```

## 📄 Report Generation

### PDF Features
- ✅ Professional lab report layout
- ✅ QR code for verification
- ✅ Abnormal values highlighted (Bold + Red)
- ✅ Gender-specific normal ranges
- ✅ Digital signatures (Technician + Pathologist)

### Abnormal Value Detection
```javascript
// Automatic detection based on normal range
if (result < normalMin || result > normalMax) {
  isAbnormal = true;
  // Highlighted in PDF
}
```

## 🏥 Multi-Tenant Architecture

### Data Isolation
Every query MUST include `tenant_id`:
```sql
SELECT * FROM patients WHERE tenant_id = $1 AND id = $2
```

### Middleware Protection
```javascript
// tenantGuard middleware ensures all queries are scoped
app.use(tenantGuard); // Attaches req.tenantId from JWT
```

## 📊 SaaS Subscription Plans

| Plan | Invoices/Month | Users | Price |
|------|----------------|-------|-------|
| **Starter** | 100 | 1 | Free |
| **Growth** | 1,000 | 5 | ₹2,999/mo |
| **Enterprise** | Unlimited | Unlimited | ₹9,999/mo |

## 🔔 Alerts & Notifications

### Inventory Alerts
- Low stock (quantity ≤ threshold)
- Expiring items (within 30 days)
- Expired items

### Report Alerts
- Pending reports
- Abnormal values detected
- Verification pending

## 📈 Analytics & Reports

### Dashboard Metrics
- Today's collection
- Today's patients
- Pending reports
- Pending payments
- Low stock items
- Revenue trend (6 months)
- Top 5 tests

### Doctor Commission Report
```sql
Commission = Total Business × (Commission % / 100)
```

## 🚀 Deployment Checklist

### Environment Variables
```env
DATABASE_URL=postgresql://...
JWT_SECRET=<strong-random-string>
NODE_ENV=production
AWS_BUCKET_NAME=...
WHATSAPP_API_KEY=...
```

### Production Setup
1. ✅ Enable HTTPS (Let's Encrypt)
2. ✅ Use managed PostgreSQL (AWS RDS / Railway)
3. ✅ Enable daily database backups
4. ✅ Use PM2 for process management
5. ✅ Set up monitoring (Sentry / LogRocket)
6. ✅ Configure CORS for production domain
7. ✅ Upload PDFs to S3 (not local storage)

### Docker Deployment (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

## 🔮 Future Enhancements

### Phase 2
- [ ] WhatsApp report delivery integration
- [ ] SMS notifications
- [ ] Email report delivery
- [ ] Barcode scanning for samples
- [ ] Mobile app (React Native)

### Phase 3
- [ ] Redis caching for performance
- [ ] Queue system (BullMQ) for PDF generation
- [ ] Read replicas for analytics
- [ ] Multi-language support
- [ ] Advanced analytics dashboard

### Phase 4
- [ ] AI-powered abnormal value detection
- [ ] Integration with lab equipment (LIS)
- [ ] Telemedicine integration
- [ ] Patient portal
- [ ] Insurance claim integration

## 📞 Support & Documentation

For detailed architecture and design decisions, see [DESIGN.md](./DESIGN.md)

## 📝 License
Proprietary - All rights reserved

## 👨‍💻 Development Team
Built by Senior Full-Stack SaaS Architects

---

**Version**: 1.0.0  
**Last Updated**: February 2026
