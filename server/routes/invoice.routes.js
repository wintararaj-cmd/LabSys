const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { verifyToken, tenantGuard, checkRole } = require('../middlewares/auth');

// All routes require authentication
router.use(verifyToken);
router.use(tenantGuard);

// Invoice routes
router.post('/', checkRole(['ADMIN', 'RECEPTIONIST']), invoiceController.createInvoice);
router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.put('/:id/payment', checkRole(['ADMIN', 'RECEPTIONIST']), invoiceController.updatePayment);
router.get('/:id/pdf', invoiceController.downloadInvoicePDF);

module.exports = router;
