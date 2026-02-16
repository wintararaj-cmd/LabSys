const express = require('express');
const router = express.Router();
const testController = require('../controllers/testController');
const { verifyToken, tenantGuard, checkRole } = require('../middlewares/auth');

// All routes require authentication
router.use(verifyToken);
router.use(tenantGuard);

router.get('/', testController.getTests);
router.post('/', checkRole(['ADMIN']), testController.addTest);
router.put('/:id', checkRole(['ADMIN']), testController.updateTest);
router.delete('/:id', checkRole(['ADMIN']), testController.deleteTest);

module.exports = router;
