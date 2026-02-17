const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');
const { verifyToken, tenantGuard, checkRole } = require('../middlewares/auth');

// All routes require authentication
router.use(verifyToken);
router.use(tenantGuard);

// Record a new purchase
router.post('/', checkRole(['ADMIN']), purchaseController.createPurchase);

// Get all purchases
router.get('/', purchaseController.getPurchases);

// Get purchase details
router.get('/:id', purchaseController.getPurchaseById);

// Update purchase
router.put('/:id', checkRole(['ADMIN']), purchaseController.updatePurchase);

// Delete purchase
router.delete('/:id', checkRole(['ADMIN']), purchaseController.deletePurchase);

module.exports = router;
