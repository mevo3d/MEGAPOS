const express = require('express');
const router = express.Router();
const cedisController = require('../controllers/cedis.controller');
const auth = require('../middleware/auth');

// Dashboard KPIs
router.get('/kpis', [auth.verifyToken, auth.isGerenteCedis], cedisController.getKPIs);

// Recepciones
router.get('/ordenes-pendientes', [auth.verifyToken, auth.isGerenteCedis], cedisController.getOrdenesPendientes);
router.get('/ordenes/:id/detalle', [auth.verifyToken], cedisController.getOrdenDetalle);
router.post('/recepcion', [auth.verifyToken, auth.isBodeguero], cedisController.recibirMercancia); // Bodeguero recibe

// Ubicaciones
router.get('/ubicaciones', [auth.verifyToken], cedisController.getUbicaciones);
router.post('/ubicaciones', [auth.verifyToken, auth.isBodeguero], cedisController.crearUbicacion);
router.get('/ubicaciones/:id/contenido', [auth.verifyToken], cedisController.getContenidoUbicacion);
router.get('/ubicaciones/buscar', [auth.verifyToken], cedisController.buscarProductoUbicaciones);

module.exports = router;
