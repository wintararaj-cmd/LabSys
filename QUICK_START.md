# 🚀 Quick Start Guide - LabSys

## Prerequisites Checklist
- [ ] Node.js v16+ installed
- [ ] PostgreSQL v13+ installed
- [ ] Git installed (optional)
- [ ] Code editor (VS Code recommended)

## Step-by-Step Setup

### 1️⃣ Database Setup (5 minutes)

```bash
# Open PostgreSQL command line (psql)
# On Windows: Search for "SQL Shell (psql)" in Start Menu

# Create database
CREATE DATABASE labsys;

# Exit psql
\q

# Run schema file
psql -U postgres -d labsys -f server/models/schema.sql

# (Optional) Load sample data for testing
psql -U postgres -d labsys -f server/models/sample_data.sql
```

**Expected Output:**
```
CREATE TABLE
CREATE TABLE
...
Sample data inserted successfully!
```

### 2️⃣ Backend Setup (3 minutes)

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create environment file
copy .env.example .env    # Windows
# OR
cp .env.example .env      # Mac/Linux

# Edit .env file with your database credentials
# Use Notepad or VS Code to edit
```

**Edit `.env` file:**
```env
PORT=5000
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/labsys
JWT_SECRET=your_super_secret_random_string_min_32_chars
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

**Start the server:**
```bash
npm run dev
```

**Expected Output:**
```
Server running on port 5000
✅ Database connected successfully
```

### 3️⃣ Test the API (2 minutes)

**Open a new terminal and test:**

```bash
# Test health check
curl http://localhost:5000/

# Expected: {"status":"ok","message":"LabSys API is running"}
```

**Register a test lab:**
```bash
curl -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"labName\":\"Test Lab\",\"adminEmail\":\"admin@test.com\",\"password\":\"Test123!\",\"adminName\":\"Admin User\",\"contactEmail\":\"admin@test.com\",\"contactPhone\":\"9876543210\",\"address\":\"Test Address\"}"
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@test.com\",\"password\":\"Test123!\"}"
```

**Expected:** You'll receive a JWT token in response.

### 4️⃣ Frontend Setup (Coming Soon)

The frontend React app will be set up in the `client` directory.

## 🧪 Testing with Sample Data

If you loaded `sample_data.sql`, you can test with these credentials:

**Login Credentials:**
- **Email:** admin@citydiag.com
- **Password:** Test123!
- **Role:** ADMIN

**Test API with Token:**
```bash
# Save your token from login response
set TOKEN=your_jwt_token_here

# Get dashboard stats
curl http://localhost:5000/api/dashboard/stats ^
  -H "Authorization: Bearer %TOKEN%"

# Get all patients
curl http://localhost:5000/api/patients ^
  -H "Authorization: Bearer %TOKEN%"

# Get all tests
curl http://localhost:5000/api/tests ^
  -H "Authorization: Bearer %TOKEN%"
```

## 📊 What You Can Do Now

With the backend running, you can:

1. ✅ Register new labs (SaaS signup)
2. ✅ Login and get JWT tokens
3. ✅ Register patients (auto-generates UHID)
4. ✅ Create test catalog
5. ✅ Create invoices with GST calculation
6. ✅ Enter test results
7. ✅ Verify reports
8. ✅ Track doctor commissions
9. ✅ Manage inventory
10. ✅ View dashboard analytics

## 🔍 Explore the API

**Use Postman or Thunder Client (VS Code extension):**

1. Import the API endpoints from `API_DOCS.md`
2. Set base URL: `http://localhost:5000/api`
3. Add Authorization header: `Bearer <your_token>`
4. Start testing!

## 📁 Project Structure

```
LabSys/
├── 📄 README.md                    # Project overview
├── 📄 DESIGN.md                    # Architecture details
├── 📄 API_DOCS.md                  # API documentation
├── 📄 DEPLOYMENT.md                # Production checklist
├── 📄 IMPLEMENTATION_SUMMARY.md    # What's built
├── 📄 QUICK_START.md               # This file
│
└── 📁 server/
    ├── 📄 server.js                # Entry point
    ├── 📄 package.json
    ├── 📄 .env.example
    │
    ├── 📁 config/
    │   └── db.js                   # Database connection
    │
    ├── 📁 controllers/             # 8 controllers
    │   ├── authController.js
    │   ├── patientController.js
    │   ├── invoiceController.js
    │   ├── reportController.js
    │   ├── testController.js
    │   ├── dashboardController.js
    │   ├── doctorController.js
    │   └── inventoryController.js
    │
    ├── 📁 routes/                  # 8 route modules
    │   ├── auth.routes.js
    │   ├── patient.routes.js
    │   ├── invoice.routes.js
    │   ├── report.routes.js
    │   ├── test.routes.js
    │   ├── dashboard.routes.js
    │   ├── doctor.routes.js
    │   └── inventory.routes.js
    │
    ├── 📁 middlewares/
    │   └── auth.js                 # JWT & RBAC
    │
    ├── 📁 services/
    │   └── pdfService.js           # PDF generation
    │
    └── 📁 models/
        ├── schema.sql              # Database schema
        └── sample_data.sql         # Test data
```

## 🐛 Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED
```
**Solution:** 
- Check if PostgreSQL is running
- Verify DATABASE_URL in .env
- Check username/password

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:**
- Change PORT in .env to 5001
- Or kill the process using port 5000

### Module Not Found
```
Error: Cannot find module 'express'
```
**Solution:**
```bash
cd server
npm install
```

## 📚 Next Steps

1. **Read Documentation:**
   - `DESIGN.md` - Understand the architecture
   - `API_DOCS.md` - Learn all API endpoints
   - `DEPLOYMENT.md` - Production deployment

2. **Customize:**
   - Add more tests to the catalog
   - Configure GST percentages
   - Add more user roles
   - Customize invoice format

3. **Deploy:**
   - Follow `DEPLOYMENT.md`
   - Deploy to Railway/Render/VPS
   - Configure production database
   - Set up SSL certificate

## 💡 Tips

- Use **Postman** or **Thunder Client** for API testing
- Check `sample_data.sql` for example data structure
- All passwords are hashed with bcrypt
- JWT tokens expire in 7 days (configurable)
- Multi-tenant isolation is automatic via middleware

## 🎯 Common Tasks

### Add a New Test
```bash
curl -X POST http://localhost:5000/api/tests ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Blood Sugar\",\"code\":\"BS001\",\"category\":\"Biochemistry\",\"price\":150,\"normalRangeMale\":\"70-100 mg/dL\",\"normalRangeFemale\":\"70-100 mg/dL\",\"unit\":\"mg/dL\",\"sampleType\":\"Blood\"}"
```

### Register a Patient
```bash
curl -X POST http://localhost:5000/api/patients ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"John Doe\",\"age\":35,\"gender\":\"Male\",\"phone\":\"9876543210\"}"
```

### Create an Invoice
```bash
curl -X POST http://localhost:5000/api/invoices ^
  -H "Authorization: Bearer %TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"patientId\":1,\"tests\":[{\"testId\":1,\"price\":500,\"gstPercentage\":0}],\"paymentMode\":\"CASH\",\"paidAmount\":500}"
```

## 📞 Support

- Check `API_DOCS.md` for detailed API reference
- Review `DESIGN.md` for architecture questions
- See `DEPLOYMENT.md` for production setup

---

**Happy Coding! 🚀**

Built with ❤️ by Senior Full-Stack SaaS Architects
