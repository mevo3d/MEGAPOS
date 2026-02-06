const express = require('express');
const router = express.Router();
const coordinacionController = require('../controllers/coordinacion.controller');
const auth = require('../middleware/auth');

// ====================================================
// PEDIDOS
// ====================================================
router.post('/pedidos', auth.verifyToken, coordinacionController.crearPedido);
router.get('/pedidos', auth.verifyToken, coordinacionController.getPedidos);
router.get('/pedidos/mapa', auth.verifyToken, coordinacionController.getPedidosMapa);
router.get('/pedidos/:id', auth.verifyToken, coordinacionController.getPedidoById);
router.put('/pedidos/:id/aprobar', auth.verifyToken, coordinacionController.aprobarPedido);
router.put('/pedidos/:id/rechazar', auth.verifyToken, coordinacionController.rechazarPedido);
router.put('/pedidos/:id/asignar-rutero', auth.verifyToken, coordinacionController.asignarRutero);
router.put('/pedidos/:id/estado', auth.verifyToken, coordinacionController.cambiarEstado);
router.get('/pedidos/:id/tracking', auth.verifyToken, coordinacionController.getTrackingPedido);

// ====================================================
// TRACKING Y RUTEROS
// ====================================================
router.post('/tracking/ubicacion', auth.verifyToken, coordinacionController.actualizarUbicacion);
router.get('/tracking/ruteros', auth.verifyToken, coordinacionController.getUbicacionesRuteros);
router.get('/ruteros/disponibles', auth.verifyToken, coordinacionController.getRuterosDisponibles);

// ====================================================
// ESTADÍSTICAS
// ====================================================
router.get('/estadisticas', auth.verifyToken, coordinacionController.getEstadisticas);

module.exports = router;
