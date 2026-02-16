const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { verifyToken, tenantGuard, checkRole } = require('../middlewares/auth');

// All routes require authentication
router.use(verifyToken);
router.use(tenantGuard);

router.get('/', inventoryController.getInventoryItems);
router.get('/alerts', inventoryController.getInventoryAlerts);
router.get('/logs', inventoryController.getInventoryLogs);
router.post('/', checkRole(['ADMIN']), inventoryController.addInventoryItem);
router.put('/:id', checkRole(['ADMIN']), inventoryController.updateInventoryItem);
router.post('/:id/adjust', checkRole(['ADMIN', 'RECEPTIONIST']), inventoryController.adjustStock);
router.delete('/:id', checkRole(['ADMIN']), inventoryController.deleteInventoryItem);

module.exports = router;
