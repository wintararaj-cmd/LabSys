const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { verifyToken, tenantGuard, checkRole } = require('../middlewares/auth');

// All routes require authentication
router.use(verifyToken);
router.use(tenantGuard);

router.get('/', doctorController.getDoctors);
router.post('/', checkRole(['ADMIN']), doctorController.addDoctor);
router.put('/:id', checkRole(['ADMIN']), doctorController.updateDoctor);
router.get('/:id/commission', checkRole(['ADMIN']), doctorController.getDoctorCommission);
router.get('/:id/outstanding', checkRole(['ADMIN']), doctorController.getOutstandingCommission);
router.post('/:id/payout', checkRole(['ADMIN']), doctorController.createPayout);
router.get('/:id/payouts', checkRole(['ADMIN']), doctorController.getPayoutHistory);

module.exports = router;
