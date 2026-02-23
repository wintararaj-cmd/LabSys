const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, tenantGuard } = require('../middlewares/auth');

// Public routes
router.post('/register', authController.registerTenant);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);

// Protected routes (requires valid JWT)
router.put('/change-password', verifyToken, tenantGuard, authController.changePassword);

module.exports = router;
