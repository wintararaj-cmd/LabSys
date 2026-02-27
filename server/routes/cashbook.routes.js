const express = require('express');
const router = express.Router();
const { getEntries, createEntry, updateEntry, deleteEntry } = require('../controllers/cashBookController');
const { verifyToken, tenantGuard, checkRole } = require('../middlewares/auth');

router.use(verifyToken);
router.use(tenantGuard);
router.use(checkRole(['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST']));

router.get('/', getEntries);
router.post('/', createEntry);
router.put('/:id', updateEntry);
router.delete('/:id', deleteEntry);

module.exports = router;
