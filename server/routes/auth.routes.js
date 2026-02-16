const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Public routes
router.post('/register', authController.registerTenant);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);

module.exports = router;
