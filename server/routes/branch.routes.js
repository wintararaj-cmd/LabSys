const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const { verifyToken, tenantGuard } = require('../middlewares/auth');

router.use(verifyToken);
router.use(tenantGuard);

router.get('/', branchController.getBranches);
router.post('/', branchController.createBranch); // Ideally restricted to ADMIN

module.exports = router;
