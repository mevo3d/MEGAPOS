const express = require('express');
const router = express.Router();
const { createVenta, getVentasHoy } = require('../controllers/ventas.controller');
const { verifyToken } = require('../middleware/auth');
const { validateSucursal } = require('../middleware/sucursal');

router.use(verifyToken);
router.use(validateSucursal);

router.post('/', createVenta);
router.get('/hoy', getVentasHoy);
router.get('/cliente/:id/historial', require('../controllers/ventas.controller').getHistorialCliente);

module.exports = router;
