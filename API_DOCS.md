# API Documentation - LabSys

Base URL: `http://localhost:5000/api`

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## 🔐 Auth Endpoints

### Register New Lab (SaaS Signup)
```http
POST /auth/register
```

**Request Body:**
```json
{
  "labName": "City Diagnostics",
  "licenseNumber": "LAB/2026/001",
  "gstNumber": "29ABCDE1234F1Z5",
  "contactEmail": "contact@citydiag.com",
  "contactPhone": "9876543210",
  "address": "123 Main St, Mumbai",
  "adminName": "Dr. Sharma",
  "adminEmail": "admin@citydiag.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "message": "Lab registered successfully",
  "tenantId": 1,
  "email": "admin@citydiag.com"
}
```

### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "admin@citydiag.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Dr. Sharma",
    "email": "admin@citydiag.com",
    "role": "ADMIN",
    "tenantName": "City Diagnostics",
    "subscriptionPlan": "FREE"
  }
}
```

---

## 👤 Patient Endpoints

### Register Patient
```http
POST /patients
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "John Doe",
  "age": 35,
  "gender": "Male",
  "phone": "9876543210",
  "address": "456 Park Ave, Mumbai"
}
```

**Response:**
```json
{
  "message": "Patient registered successfully",
  "patient": {
    "id": 1,
    "uhid": "PAT260001",
    "name": "John Doe",
    "age": 35,
    "gender": "Male",
    "phone": "9876543210",
    "created_at": "2026-02-14T16:15:00.000Z"
  }
}
```

### Get All Patients
```http
GET /patients?page=1&limit=20&search=John
Authorization: Bearer <token>
```

**Response:**
```json
{
  "patients": [...],
  "total": 150,
  "page": 1,
  "totalPages": 8
}
```

---

## 🧪 Test Master Endpoints

### Get All Tests
```http
GET /tests?category=Hematology&search=CBC
Authorization: Bearer <token>
```

**Response:**
```json
{
  "tests": [
    {
      "id": 1,
      "name": "Complete Blood Count (CBC)",
      "code": "CBC001",
      "category": "Hematology",
      "price": 500.00,
      "normal_range_male": "13-17 g/dL",
      "normal_range_female": "12-15 g/dL",
      "unit": "g/dL",
      "sample_type": "Blood"
    }
  ]
}
```

### Add New Test
```http
POST /tests
Authorization: Bearer <token>
Role: ADMIN
```

**Request Body:**
```json
{
  "name": "Blood Sugar Fasting",
  "code": "BSF001",
  "category": "Biochemistry",
  "price": 150.00,
  "cost": 50.00,
  "tatHours": 2,
  "normalRangeMale": "70-100 mg/dL",
  "normalRangeFemale": "70-100 mg/dL",
  "unit": "mg/dL",
  "sampleType": "Blood"
}
```

---

## 💰 Invoice Endpoints

### Create Invoice
```http
POST /invoices
Authorization: Bearer <token>
Role: ADMIN, RECEPTIONIST
```

**Request Body:**
```json
{
  "patientId": 1,
  "doctorId": 2,
  "tests": [
    {
      "testId": 1,
      "price": 500.00,
      "gstPercentage": 0
    },
    {
      "testId": 3,
      "price": 150.00,
      "gstPercentage": 0
    }
  ],
  "discountAmount": 50.00,
  "paymentMode": "CASH",
  "paidAmount": 600.00
}
```

**Response:**
```json
{
  "message": "Invoice created successfully",
  "invoice": {
    "id": 1,
    "invoice_number": "INV/2602/0001",
    "total_amount": 650.00,
    "discount_amount": 50.00,
    "net_amount": 600.00,
    "paid_amount": 600.00,
    "balance_amount": 0.00,
    "payment_status": "PAID"
  }
}
```

### Get Invoice Details
```http
GET /invoices/:id
Authorization: Bearer <token>
```

**Response:**
```json
{
  "invoice": {
    "id": 1,
    "invoice_number": "INV/2602/0001",
    "patient_name": "John Doe",
    "uhid": "PAT260001",
    "doctor_name": "Dr. Kumar",
    "total_amount": 650.00,
    "net_amount": 600.00,
    "payment_status": "PAID"
  },
  "items": [
    {
      "test_name": "Complete Blood Count (CBC)",
      "test_code": "CBC001",
      "price": 500.00
    },
    {
      "test_name": "Blood Sugar Fasting",
      "test_code": "BSF001",
      "price": 150.00
    }
  ]
}
```

---

## 📊 Report Endpoints

### Get Pending Reports
```http
GET /reports/pending
Authorization: Bearer <token>
```

**Response:**
```json
{
  "reports": [
    {
      "id": 1,
      "test_name": "Complete Blood Count (CBC)",
      "patient_name": "John Doe",
      "uhid": "PAT260001",
      "invoice_number": "INV/2602/0001",
      "status": "PENDING",
      "sample_date": "2026-02-14T10:00:00.000Z"
    }
  ]
}
```

### Enter Test Result
```http
PUT /reports/:id/result
Authorization: Bearer <token>
Role: ADMIN, TECHNICIAN
```

**Request Body:**
```json
{
  "resultValue": "14.5",
  "comments": "Normal range"
}
```

**Response:**
```json
{
  "message": "Test result updated successfully",
  "report": {
    "id": 1,
    "result_value": "14.5",
    "is_abnormal": false,
    "status": "COMPLETED"
  }
}
```

### Verify Report
```http
PUT /reports/:id/verify
Authorization: Bearer <token>
Role: ADMIN, DOCTOR
```

**Response:**
```json
{
  "message": "Report verified successfully",
  "report": {
    "id": 1,
    "status": "VERIFIED",
    "verified_at": "2026-02-14T16:30:00.000Z"
  }
}
```

---

## 📈 Dashboard Endpoints

### Get Dashboard Stats
```http
GET /dashboard/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "todayCollection": 15000.00,
  "todayPatients": 25,
  "pendingReports": 8,
  "pendingPayments": 5000.00,
  "lowStockItems": 3,
  "expiringItems": 2,
  "revenueChart": [
    { "month": "Feb 2026", "revenue": 150000 },
    { "month": "Jan 2026", "revenue": 120000 }
  ],
  "topTests": [
    { "name": "CBC", "count": 150 },
    { "name": "Blood Sugar", "count": 120 }
  ]
}
```

---

## 👨‍⚕️ Doctor Endpoints

### Get All Doctors
```http
GET /doctors?search=Kumar
Authorization: Bearer <token>
```

**Response:**
```json
{
  "doctors": [
    {
      "id": 1,
      "name": "Dr. Kumar",
      "specialization": "General Physician",
      "phone": "9876543210",
      "commission_percentage": 10.00
    }
  ]
}
```

### Get Doctor Commission Report
```http
GET /doctors/:id/commission?fromDate=2026-02-01&toDate=2026-02-28
Authorization: Bearer <token>
Role: ADMIN
```

**Response:**
```json
{
  "commission": {
    "name": "Dr. Kumar",
    "commission_percentage": 10.00,
    "total_referrals": 50,
    "total_business": 50000.00,
    "total_commission": 5000.00
  }
}
```

---

## 📦 Inventory Endpoints

### Get Inventory Items
```http
GET /inventory?lowStock=true&expiring=true
Authorization: Bearer <token>
```

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Blood Collection Tubes",
      "batch_number": "BATCH001",
      "expiry_date": "2026-03-15",
      "quantity": 50,
      "low_stock_threshold": 100
    }
  ]
}
```

### Get Inventory Alerts
```http
GET /inventory/alerts
Authorization: Bearer <token>
```

**Response:**
```json
{
  "lowStock": [...],
  "expiring": [...],
  "expired": [...]
}
```

---

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "error": "Missing required fields"
}
```

### 401 Unauthorized
```json
{
  "error": "No token provided"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden: Insufficient permissions",
  "required": ["ADMIN"],
  "current": "RECEPTIONIST"
}
```

### 404 Not Found
```json
{
  "error": "Patient not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Something went wrong!"
}
```

---

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Response when exceeded**:
```json
{
  "error": "Too many requests, please try again later."
}
```
