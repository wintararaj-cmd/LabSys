const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { verifyToken, tenantGuard, checkRole } = require('../middlewares/auth');

// All routes require authentication and admin/manager role (simplified to ADMIN for now)
router.use(verifyToken);
router.use(tenantGuard);
router.use(checkRole(['ADMIN', 'ACCOUNTANT']));

// GST Report
router.get('/gst', financeController.getGSTReport);

// Cash Book
router.get('/cash-book', financeController.getCashBook);

// Sale Report
router.get('/sale', financeController.getSaleReport);

module.exports = router;
