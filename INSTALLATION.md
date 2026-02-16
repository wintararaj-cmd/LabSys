# 🚀 Installation & Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- ✅ **Node.js** v16 or higher ([Download](https://nodejs.org/))
- ✅ **PostgreSQL** v13 or higher ([Download](https://www.postgresql.org/download/))
- ✅ **Git** (optional) ([Download](https://git-scm.com/))
- ✅ **Code Editor** - VS Code recommended ([Download](https://code.visualstudio.com/))

---

## 📋 Step-by-Step Installation

### **Step 1: Database Setup** (5 minutes)

#### Option A: Using psql Command Line
```bash
# Open PostgreSQL command line
# Windows: Search for "SQL Shell (psql)" in Start Menu
# Mac/Linux: Open terminal and type "psql"

# Create database
CREATE DATABASE labsys;

# Exit psql
\q

# Run schema file
psql -U postgres -d labsys -f server/models/schema.sql

# Load sample data (optional but recommended)
psql -U postgres -d labsys -f server/models/sample_data.sql
```

#### Option B: Using pgAdmin (GUI)
1. Open pgAdmin
2. Right-click on "Databases" → Create → Database
3. Name it "labsys"
4. Open Query Tool
5. Copy and paste contents of `server/models/schema.sql`
6. Execute
7. Repeat for `server/models/sample_data.sql`

**✅ Verification:**
```sql
SELECT COUNT(*) FROM tenants;
-- Should return 1 if sample data loaded
```

---

### **Step 2: Backend Setup** (3 minutes)

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create environment file
# Windows:
copy .env.example .env

# Mac/Linux:
cp .env.example .env

# Edit .env file with your settings
```

**Edit `.env` file:**
```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/labsys
JWT_SECRET=change_this_to_a_random_32_character_string_minimum
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

**Generate a secure JWT_SECRET:**
```bash
# Windows PowerShell:
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})

# Mac/Linux:
openssl rand -base64 32
```

**Start the backend:**
```bash
npm run dev
```

**✅ Expected Output:**
```
Server running on port 5000
✅ Database connected successfully
```

**Test the API:**
```bash
# Open new terminal
curl http://localhost:5000/

# Expected response:
# {"status":"ok","message":"LabSys API is running"}
```

---

### **Step 3: Frontend Setup** (3 minutes)

```bash
# Open NEW terminal (keep backend running)
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start development server
npm run dev
```

**✅ Expected Output:**
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

### **Step 4: Access the Application**

1. **Open your browser**
2. **Navigate to:** `http://localhost:5173`
3. **Login with demo credentials:**
   - **Email:** `admin@citydiag.com`
   - **Password:** `Test123!`

**✅ You should see:**
- Login page with gradient background
- After login: Dashboard with stats cards
- Sidebar navigation with all modules

---

## 🐛 Troubleshooting

### Problem: Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
1. Check if PostgreSQL is running:
   ```bash
   # Windows: Check Services
   # Mac: brew services list
   # Linux: sudo systemctl status postgresql
   ```
2. Verify DATABASE_URL in `.env`
3. Check username and password
4. Ensure database "labsys" exists

---

### Problem: Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution:**
```bash
# Option 1: Kill the process
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:5000 | xargs kill -9

# Option 2: Change port in .env
PORT=5001
```

---

### Problem: Module Not Found
```
Error: Cannot find module 'express'
```

**Solution:**
```bash
cd server
rm -rf node_modules package-lock.json
npm install
```

---

### Problem: Frontend Build Errors
```
Error: Failed to resolve import
```

**Solution:**
```bash
cd client
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 Quick Reference

### Start Both Servers
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

### Stop Servers
- Press `Ctrl + C` in each terminal

### Reset Database
```bash
psql -U postgres -d labsys -f server/models/schema.sql
psql -U postgres -d labsys -f server/models/sample_data.sql
```

### View Logs
- Backend logs appear in Terminal 1
- Frontend logs appear in Terminal 2
- Browser console (F12) for frontend errors

---

## 🧪 Testing the System

### 1. Test Backend API
```bash
# Health check
curl http://localhost:5000/

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@citydiag.com","password":"Test123!"}'

# Save the token from response
# Use it in subsequent requests:
curl http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 2. Test Frontend
1. Open `http://localhost:5173`
2. Login with demo credentials
3. Navigate through all pages
4. Check browser console for errors (F12)

---

## 📦 Production Build

### Backend
```bash
cd server
npm install --production
NODE_ENV=production node server.js
```

### Frontend
```bash
cd client
npm run build
# Output will be in client/dist/
```

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to a strong random string
- [ ] Update DATABASE_URL with production credentials
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS
- [ ] Configure CORS for production domain
- [ ] Set up database backups
- [ ] Review and update .gitignore
- [ ] Never commit .env files

---

## 📚 Next Steps

After successful installation:

1. **Explore the API** - See `API_DOCS.md`
2. **Understand Architecture** - See `DESIGN.md`
3. **Deploy to Production** - See `DEPLOYMENT.md`
4. **Customize** - Add your lab's logo, colors, etc.

---

## 💡 Tips

- Use **Postman** or **Thunder Client** for API testing
- Install **React DevTools** browser extension
- Use **PostgreSQL GUI** (pgAdmin, DBeaver) for database management
- Keep both terminals visible to monitor logs
- Check `package.json` for all available scripts

---

## 📞 Need Help?

- **Setup Issues:** Review this guide carefully
- **API Questions:** See `API_DOCS.md`
- **Architecture:** See `DESIGN.md`
- **Features:** See `FEATURES.md`

---

**🎉 Congratulations! Your Lab Management System is now running!**

Access it at: **http://localhost:5173**

---

**Last Updated:** February 2026  
**Version:** 1.0.0
