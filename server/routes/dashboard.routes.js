const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, tenantGuard } = require('../middlewares/auth');

// All routes require authentication
router.use(verifyToken);
router.use(tenantGuard);

router.get('/stats', dashboardController.getDashboardStats);
router.get('/analytics', dashboardController.getMonthlyAnalytics);

module.exports = router;
