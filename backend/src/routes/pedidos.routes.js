const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidos.controller');
const auth = require('../middleware/auth');

router.get('/sucursal/:sucursalId', auth.verifyToken, pedidosController.getPedidosBySucursal);
router.get('/:id', auth.verifyToken, pedidosController.getPedidoById);
router.post('/', auth.verifyToken, pedidosController.createPedido);
router.post('/:id/items', auth.verifyToken, pedidosController.addItemsToPedido);
router.put('/:id/enviar-caja', auth.verifyToken, pedidosController.enviarACaja);
router.put('/:id/cobrar', auth.verifyToken, pedidosController.cobrarPedido);

module.exports = router;
