const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { previewCommission } = require('../services/commissionService');
const { verifyToken, tenantGuard, checkRole } = require('../middlewares/auth');

// All routes require authentication
router.use(verifyToken);
router.use(tenantGuard);

// Commission preview (for billing form live preview)
router.post('/commission-preview', checkRole(['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT']), previewCommission);

// Invoice routes
router.post('/', checkRole(['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT']), invoiceController.createInvoice);
router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.put('/:id/payment', checkRole(['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT']), invoiceController.updatePayment);
router.post('/:id/refund', checkRole(['ADMIN', 'ACCOUNTANT']), invoiceController.processRefund);
router.get('/:id/pdf', invoiceController.downloadInvoicePDF);

module.exports = router;

