const express = require('express');
const router = express.Router();
const pagosB2BController = require('../controllers/pagos_b2b.controller');
const auth = require('../middleware/auth');

// Generar Referencia
router.get('/referencia/:pedidoId', auth.verifyToken, pagosB2BController.generarReferencia);

// Webhook (Simulado - debería ser público o validado por signature)
router.post('/webhook', pagosB2BController.recibirWebhook);

// Acciones Contador
router.post('/confirmar/:id', auth.verifyToken, pagosB2BController.confirmarPago);
router.get('/pendientes', auth.verifyToken, pagosB2BController.getPedidosPorVerificar);

module.exports = router;
