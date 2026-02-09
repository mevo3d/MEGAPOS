const express = require('express');
const router = express.Router();
const {
    getInventario,
    getBajoStock,
    ajustarStock,
    crearTransferencia,
    getTransferencias,
    getTransferenciaById,
    confirmarRecepcion,

    getGlobalStock,
    getStockPorSucursal
} = require('../controllers/inventario.controller');
const { verifyToken, isGerenteOrAdmin } = require('../middleware/auth');
const { validateSucursal } = require('../middleware/sucursal');

router.use(verifyToken);
// Global Stock doesn't strictly depend on one sucursal context, but we keep middleware order
// However, ensure specific routes come before param routes if any.

router.get('/global', getGlobalStock); // Stock Global para Compras

router.get('/transferencias', getTransferencias); // Historial
router.get('/transferencias/:id', getTransferenciaById); // Detalle
router.post('/transferencias', crearTransferencia); // Crear envío o solicitud
router.post('/transferencias/:id/recepcion', confirmarRecepcion); // Recibir

// Stock por sucursal para un producto específico
router.get('/producto/:id/sucursales', getStockPorSucursal);

router.use(validateSucursal); // Sucursal context needed for these:

router.get('/', getInventario);
router.get('/bajo-stock', getBajoStock);
router.post('/ajuste', isGerenteOrAdmin, ajustarStock); // Solo gerentes pueden ajustar

module.exports = router;
