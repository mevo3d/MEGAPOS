const express = require('express');
const router = express.Router();
const pagosController = require('../controllers/pagos.controller');
const auth = require('../middleware/auth');

router.post('/', auth.verifyToken, pagosController.registrarPago);
router.get('/cliente/:id', auth.verifyToken, pagosController.getPagosCliente);

module.exports = router;
