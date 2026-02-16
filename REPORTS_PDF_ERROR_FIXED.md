# ✅ Reports PDF Fix - Column Name Correction

**Date:** February 15, 2026 - 17:00 IST  
**Status:** Resolved ✅

---

## 🔧 **Issue Identified**

### **Error Message:**
```
error: column ten.phone does not exist
```

### **Root Cause:**
The SQL query was trying to select `ten.phone` and `ten.email`, but in our database schema, the columns are named **`contact_phone`** and **`contact_email`**.

---

## ✅ **The Solution**

I updated `server/controllers/reportController.js` to use the correct column names:

**Before:**
```sql
SELECT ... ten.phone as lab_phone, ten.email as lab_email
```

**After:**
```sql
SELECT ... ten.contact_phone as lab_phone, ten.contact_email as lab_email
```

---

## 🚀 **Action Required**

Since this is a backend change, please:

1.  **Restart the Backend Server**:
    - If you are running `npm run dev`, it might restart automatically.
    - To be safe, run `stop-servers.bat` then `start-servers.bat`.

2.  **Try Downloading PDF Again**:
    - Go to Reports page.
    - Click "PDF" button.
    - It should now work perfectly! 🎉

---

**Thank you for reporting the specific error! It helped locate the issue instantly.**
