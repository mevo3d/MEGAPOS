const express = require('express');
const router = express.Router();
const comprasController = require('../controllers/compras.controller');
const auth = require('../middleware/auth');

router.get('/', auth.verifyToken, comprasController.getOrdenes);
router.get('/:id', auth.verifyToken, comprasController.getOrdenById);
router.post('/', auth.verifyToken, comprasController.createOrden);
router.put('/:id/emitir', auth.verifyToken, comprasController.emitirOrden);

module.exports = router;
