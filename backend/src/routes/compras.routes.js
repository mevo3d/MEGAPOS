const express = require('express');
const router = express.Router();
const comprasController = require('../controllers/compras.controller');
const auth = require('../middleware/auth');

// Estadísticas (KPIs)
router.get('/estadisticas', auth.verifyToken, comprasController.getEstadisticas);

// Inventario Global (todas las sucursales)
router.get('/inventario-global', auth.verifyToken, comprasController.getInventarioGlobal);

// Facturas Importadas
router.get('/facturas', auth.verifyToken, comprasController.getFacturasImportadas);

// Traspasos en tiempo real
router.get('/traspasos', auth.verifyToken, comprasController.getTraspasos);

// Órdenes de compra
router.get('/', auth.verifyToken, comprasController.getOrdenes);
router.get('/:id', auth.verifyToken, comprasController.getOrdenById);
router.post('/', auth.verifyToken, comprasController.createOrden);
router.put('/:id/emitir', auth.verifyToken, comprasController.emitirOrden);
router.put('/:id/estado', auth.verifyToken, comprasController.cambiarEstado);

module.exports = router;

