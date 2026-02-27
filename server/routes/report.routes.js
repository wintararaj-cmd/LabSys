const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, tenantGuard, checkRole } = require('../middlewares/auth');

// All routes require authentication
router.use(verifyToken);
router.use(tenantGuard);

// Get all reports (with optional filtering)
router.get('/', reportController.getAllReports);

// Get pending reports
router.get('/pending', reportController.getPendingReports);

// Get single report by ID
router.get('/:id', reportController.getReportById);

// Update test result (single)
router.put('/:id/result', checkRole(['ADMIN', 'TECHNICIAN', 'RADIOLOGIST']), reportController.updateTestResult);

// Update multiple results (bulk)
router.put('/:id/results', checkRole(['ADMIN', 'TECHNICIAN', 'RADIOLOGIST']), reportController.updateReportResults);

// Verify report
router.put('/:id/verify', checkRole(['ADMIN', 'DOCTOR', 'RADIOLOGIST']), reportController.verifyReport);

// Get reports by invoice
router.get('/invoice/:invoiceId', reportController.getReportsByInvoice);

// Download report PDF
router.get('/:id/pdf', reportController.downloadReportPDF);

// Update outbound status
router.put('/:id/outbound-status', checkRole(['ADMIN', 'TECHNICIAN', 'RADIOLOGIST']), reportController.updateOutboundStatus);

// Search by sample ID
router.get('/sample/:sampleId', reportController.getReportBySampleId);

module.exports = router;
