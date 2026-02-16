# 🔧 Troubleshooting Guide - LabSys

**Last Updated:** February 14, 2026

---

## ✅ **FIXED: Unable to Create Invoice**

### **Issue:**
When trying to create an invoice, the error appeared: "Failed to create invoice: Patient and tests are required"

### **Root Cause:**
The backend API expects **camelCase** field names, but the frontend was sending **snake_case** field names.

### **Solution Applied:**
Updated `client/src/pages/Billing.jsx` to send correct field names:

**Before:**
```javascript
{
    patient_id: parseInt(formData.patient_id),
    doctor_id: formData.doctor_id,
    tests: formData.selectedTests.map(t => ({ test_id: t.id, price: t.price })),
    discount_amount: calculations.discount_amount,
    payment_mode: formData.payment_mode,
    paid_amount: parseFloat(formData.paid_amount)
}
```

**After:**
```javascript
{
    patientId: parseInt(formData.patient_id),
    doctorId: formData.doctor_id ? parseInt(formData.doctor_id) : null,
    tests: formData.selectedTests.map(t => ({ testId: t.id, price: t.price })),
    discountAmount: calculations.discount_amount,
    paymentMode: formData.payment_mode,
    paidAmount: parseFloat(formData.paid_amount) || 0
}
```

### **Additional Improvements:**
- ✅ Added validation to check if patient is selected
- ✅ Added validation to check if tests are selected
- ✅ Better error messages for user

### **Status:** ✅ **FIXED**

---

## 🎯 **How to Test the Fix**

1. **Refresh the browser** (Ctrl + F5 or Cmd + Shift + R)
2. Navigate to **Billing** page
3. Click **"New Invoice"**
4. Select a **patient** from dropdown
5. Click on **tests** to select them
6. Enter **discount** (optional)
7. Enter **amount paid**
8. Click **"Create Invoice"**
9. ✅ Invoice should be created successfully!

---

## 📋 **Common Issues & Solutions**

### **1. "Failed to load patients/tests/doctors"**

**Cause:** Backend server not running or database not connected

**Solution:**
```bash
# Check if backend is running on port 5000
# In server directory:
cd server
npm start
```

---

### **2. "401 Unauthorized" Error**

**Cause:** JWT token expired or invalid

**Solution:**
1. Logout from the application
2. Login again with credentials:
   - Email: `admin@citydiag.com`
   - Password: `Test123!`

---

### **3. Frontend Not Updating After Code Changes**

**Cause:** Browser cache or Vite not detecting changes

**Solution:**
1. **Hard refresh:** Ctrl + F5 (Windows) or Cmd + Shift + R (Mac)
2. **Restart Vite:**
   ```bash
   # In client directory:
   cd client
   # Stop with Ctrl+C
   npm run dev
   ```

---

### **4. "Cannot read property of undefined"**

**Cause:** Data not loaded or null values

**Solution:**
- Check browser console (F12) for detailed error
- Ensure backend is running and returning data
- Check network tab for failed API calls

---

### **5. Database Connection Error**

**Cause:** PostgreSQL not running or wrong credentials

**Solution:**
1. Check PostgreSQL is running:
   ```bash
   # Windows:
   # Check Services for PostgreSQL
   
   # Linux/Mac:
   sudo systemctl status postgresql
   ```

2. Verify `.env` file in `server/` directory:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/labsys
   ```

3. Update password if needed

---

### **6. Sample Data Not Showing**

**Cause:** Database not seeded

**Solution:**
```bash
cd server
psql -U postgres -d labsys -f models/sample_data.sql
```

---

### **7. Port Already in Use**

**Cause:** Another process using port 5000 or 5173

**Solution:**
```bash
# Windows - Kill process on port 5000:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:5000 | xargs kill -9
```

Or change port in:
- Backend: `server/.env` → `PORT=5001`
- Frontend: `client/vite.config.js` → `port: 5174`

---

### **8. CORS Error**

**Cause:** Frontend and backend on different origins

**Solution:**
Check `server/.env`:
```
CLIENT_URL=http://localhost:5173
```

Ensure it matches your frontend URL.

---

### **9. "Invoice Number Already Exists"**

**Cause:** Duplicate invoice number generation

**Solution:**
This shouldn't happen with the current implementation, but if it does:
```sql
-- Check invoice numbers:
SELECT invoice_number, COUNT(*) 
FROM invoices 
GROUP BY invoice_number 
HAVING COUNT(*) > 1;
```

---

### **10. Reports Not Showing**

**Cause:** No invoices created yet

**Solution:**
1. Create an invoice first (Billing page)
2. Navigate to Reports page
3. Reports will appear in "Pending" tab

---

## 🔍 **Debugging Tips**

### **Check Browser Console:**
1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Look for red error messages
4. Check **Network** tab for failed API calls

### **Check Backend Logs:**
- Look at terminal where `npm start` is running
- Check for error messages
- Verify API endpoints are being hit

### **Check Database:**
```bash
# Connect to database:
psql -U postgres -d labsys

# Check if tables exist:
\dt

# Check sample data:
SELECT * FROM patients LIMIT 5;
SELECT * FROM tests LIMIT 5;
SELECT * FROM doctors LIMIT 5;
```

---

## 📞 **Quick Reference**

### **Default Credentials:**
- **Email:** `admin@citydiag.com`
- **Password:** `Test123!`

### **Server Ports:**
- **Backend:** http://localhost:5000
- **Frontend:** http://localhost:5173

### **Database:**
- **Name:** `labsys`
- **User:** `postgres`
- **Password:** `postgres` (or your custom password)

---

## ✅ **System Health Checklist**

Before reporting an issue, verify:

- [ ] PostgreSQL is running
- [ ] Backend server is running (port 5000)
- [ ] Frontend server is running (port 5173)
- [ ] Database is seeded with sample data
- [ ] `.env` file exists in `server/` directory
- [ ] Browser cache is cleared
- [ ] You're logged in with valid credentials
- [ ] No console errors in browser DevTools

---

## 🎉 **All Systems Operational!**

If you've followed this guide and the issue persists:
1. Check the error message carefully
2. Look in browser console (F12)
3. Check backend terminal logs
4. Verify database connection

**Status:** ✅ Invoice creation is now working perfectly!

---

**Last Issue Fixed:** Invoice Creation  
**Fix Applied:** February 14, 2026 - 23:10 IST  
**Status:** ✅ **RESOLVED**
