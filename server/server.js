
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


// Serve uploads statically
app.use('/uploads', express.static('uploads'));

// Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  // Serve static files from the React app build directory
  app.use(express.static(path.join(__dirname, 'public')));

  // The "catchall" handler: for any request that doesn't
  // match one above, send back React's index.html file.
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
    console.log('✅ Auto-migration: gst_percentage column check passed.');
  } catch (err) {
    console.error('❌ Auto-migration failed:', err.message);
  }
});
