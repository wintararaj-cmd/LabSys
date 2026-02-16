const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, tenantGuard, checkRole } = require('../middlewares/auth');

// All routes require authentication
router.use(verifyToken);
router.use(tenantGuard);

// Get all reports (with optional filtering)
router.get('/', reportController.getAllReports);

// Get single report by ID
router.get('/:id', reportController.getReportById);

// Get pending reports
router.get('/pending', reportController.getPendingReports);

// Update test result (single)
router.put('/:id/result', checkRole(['ADMIN', 'TECHNICIAN']), reportController.updateTestResult);

// Update multiple results (bulk)
router.put('/:id/results', checkRole(['ADMIN', 'TECHNICIAN']), reportController.updateReportResults);

// Verify report
router.put('/:id/verify', checkRole(['ADMIN', 'DOCTOR']), reportController.verifyReport);

// Get reports by invoice
router.get('/invoice/:invoiceId', reportController.getReportsByInvoice);

// Download report PDF
router.get('/:id/pdf', reportController.downloadReportPDF);

module.exports = router;
