const express = require('express');
const { verifyToken, tenantGuard } = require('../middlewares/auth.js');
const {
    getExternalLabs,
    createExternalLab,
    updateExternalLab,
    deleteExternalLab
} = require('../controllers/externalLabController.js');

const router = express.Router();

router.use(verifyToken);
router.use(tenantGuard);

router.get('/', getExternalLabs);
router.post('/', createExternalLab);
router.put('/:id', updateExternalLab);
router.delete('/:id', deleteExternalLab);

module.exports = router;
