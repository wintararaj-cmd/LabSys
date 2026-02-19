const express = require('express');
const router = express.Router();
const radiologyController = require('../controllers/radiologyController');
const { verifyToken, tenantGuard } = require('../middlewares/auth');

// All routes require authentication and tenant isolation
router.use(verifyToken);
router.use(tenantGuard);

router.get('/', radiologyController.getRadiologyReports);
router.get('/templates', radiologyController.getTemplates);
router.get('/:id', radiologyController.getReportDetails);
router.put('/:id', radiologyController.saveReport);

module.exports = router;

