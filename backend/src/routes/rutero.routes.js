const express = require('express');
const router = express.Router();
const ruteroController = require('../controllers/rutero.controller');
const auth = require('../middleware/auth');

// Información de ruta
router.get('/info', [auth.verifyToken], ruteroController.getMiRuta);

// Inventario de la camioneta
router.get('/inventario', [auth.verifyToken], ruteroController.getInventario);

// Ventas en ruta
router.post('/ventas', [auth.verifyToken], ruteroController.registrarVenta);

// Visitas
router.get('/visitas/hoy', [auth.verifyToken], ruteroController.getVisitasHoy);
router.post('/visitas', [auth.verifyToken], ruteroController.registrarVisita);
router.put('/visitas/:id/calificacion', [auth.verifyToken], ruteroController.calificarVisita);
router.get('/visitas/estadisticas', [auth.verifyToken], ruteroController.getEstadisticas);

// Clientes
router.get('/clientes/pendientes', [auth.verifyToken], ruteroController.getClientesPendientes);

// Zonas de precio
router.get('/zonas-precio', [auth.verifyToken], ruteroController.getZonasPrecios);

// Pagos - Mercado Pago
router.post('/pagos/link', [auth.verifyToken], ruteroController.generarLinkPago);
router.post('/pagos/enviar-whatsapp', [auth.verifyToken], ruteroController.enviarLinkWhatsApp);

module.exports = router;
