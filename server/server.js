
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for express-rate-limit (Coolify/Traefik)
app.set('trust proxy', 1);

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined')); // Logging

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // Increased limit to avoid 429 in development/SaaS usage
});
app.use(limiter);

// Health Check
// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'LabSys API is running' });
});

// Import Routes
const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patient.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const testRoutes = require('./routes/test.routes');
const reportRoutes = require('./routes/report.routes');
const doctorRoutes = require('./routes/doctor.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const branchRoutes = require('./routes/branch.routes');
const userRoutes = require('./routes/user.routes');
const backupRoutes = require('./routes/backup.routes');
const financeRoutes = require('./routes/finance.routes');
const purchaseRoutes = require('./routes/purchase.routes');
const externalLabRoutes = require('./routes/externalLabRoutes.js');
const radiologyRoutes = require('./routes/radiologyRoutes.js');
const publicRoutes = require('./routes/public.routes.js');
const auditRoutes = require('./routes/audit.routes.js');
const notificationRoutes = require('./routes/notification.routes.js');
const cashBookRoutes = require('./routes/cashbook.routes.js');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/external-labs', externalLabRoutes);
app.use('/api/radiology', radiologyRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/cash-book-entries', cashBookRoutes);


// Serve uploads statically
app.use('/uploads', express.static('uploads'));

// Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const fs = require('fs');

  const publicDir = path.join(__dirname, 'public');

  // Serve static files (JS, CSS, images, etc.) with proper MIME types
  app.use(express.static(publicDir, {
    // Cache assets for 1 year since they have content hashes in names
    maxAge: '1y',
    immutable: true,
  }));

  // IMPORTANT: Do NOT serve index.html for /assets/ requests — let them 404
  // This prevents the "text/html is not a supported stylesheet MIME type" error
  app.get('/assets/*', (req, res) => {
    res.status(404).json({ error: 'Asset not found — please rebuild and redeploy the client' });
  });

  // For all other routes, serve the React SPA index.html
  app.get('*', (req, res) => {
    const indexPath = path.join(publicDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(503).send('Client build not found. Please deploy the client build.');
    }
  });
}

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Machine Integration Service (HL7 Listener)
const machineIntegration = require('./services/machineIntegrationService');
machineIntegration.start();

const { query } = require('./config/db');

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  // Auto-run missing migrations for remote servers
  try {
    await query('ALTER TABLE tests ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2) DEFAULT 0.00');
    await query(`
      CREATE TABLE IF NOT EXISTS cash_book_entries (
        id           SERIAL PRIMARY KEY,
        tenant_id    INT REFERENCES tenants(id) ON DELETE CASCADE,
        entry_date   DATE NOT NULL DEFAULT CURRENT_DATE,
        type         VARCHAR(20) NOT NULL CHECK (type IN ('CASH_IN','CASH_OUT','BANK_IN','BANK_OUT')),
        particulars  VARCHAR(255) NOT NULL,
        reference    VARCHAR(100),
        amount       DECIMAL(10,2) NOT NULL,
        payment_mode VARCHAR(20) DEFAULT 'CASH',
        category     VARCHAR(100),
        notes        TEXT,
        created_by   INT REFERENCES users(id) ON DELETE SET NULL,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Auto-migration: all checks passed.');
  } catch (err) {
    console.error('❌ Auto-migration failed:', err.message);
  }
});
