const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { verifyToken, tenantGuard, checkRole } = require('../middlewares/auth');

// All routes require authentication and tenant isolation
router.use(verifyToken);
router.use(tenantGuard);

// Patient routes
router.post('/', checkRole(['ADMIN', 'RECEPTIONIST']), patientController.registerPatient);
router.get('/', patientController.getPatients);
router.get('/:id', patientController.getPatientById);
router.put('/:id', checkRole(['ADMIN', 'RECEPTIONIST']), patientController.updatePatient);

module.exports = router;
