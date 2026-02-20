const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { verifyToken, tenantGuard, checkRole } = require('../middlewares/auth');

// All routes require authentication
router.use(verifyToken);
router.use(tenantGuard);

// Doctor routes
router.get('/', doctorController.getDoctors);
router.post('/', checkRole(['ADMIN']), doctorController.addDoctor);
router.put('/:id', checkRole(['ADMIN']), doctorController.updateDoctor);
router.get('/:id/commission', checkRole(['ADMIN']), doctorController.getDoctorCommission);
router.get('/:id/outstanding', checkRole(['ADMIN']), doctorController.getOutstandingCommission);
router.post('/:id/payout', checkRole(['ADMIN']), doctorController.createPayout);
router.get('/:id/payouts', checkRole(['ADMIN']), doctorController.getPayoutHistory);

// Introducer routes (reuse /doctors/:id/payout & /payouts for payouts)
router.get('/introducers/list', checkRole(['ADMIN']), doctorController.getIntroducers);
router.post('/introducers', checkRole(['ADMIN']), doctorController.addIntroducer);
router.put('/introducers/:id', checkRole(['ADMIN']), doctorController.updateIntroducer);
router.get('/introducers/:id/outstanding', checkRole(['ADMIN']), doctorController.getIntroducerOutstanding);

module.exports = router;

