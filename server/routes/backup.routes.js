const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { verifyToken, tenantGuard, checkRole } = require('../middlewares/auth');

// All backup routes require ADMIN role
router.use(verifyToken);
router.use(tenantGuard);
router.use(checkRole(['ADMIN']));

router.get('/export', backupController.exportData);
router.post('/import', backupController.importData);

module.exports = router;
