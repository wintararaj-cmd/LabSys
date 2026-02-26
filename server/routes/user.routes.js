const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, tenantGuard, checkRole } = require('../middlewares/auth');

router.use(verifyToken);
router.use(tenantGuard);

// Only ADMIN can manage staff
router.get('/', checkRole(['ADMIN']), userController.getUsers);
router.post('/', checkRole(['ADMIN']), userController.createUser);
router.put('/:id', checkRole(['ADMIN']), userController.updateUser);
router.put('/:id/status', checkRole(['ADMIN']), userController.toggleUserStatus);

module.exports = router;
