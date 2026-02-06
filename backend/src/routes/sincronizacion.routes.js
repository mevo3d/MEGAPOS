const express = require('express');
const router = express.Router();
const { syncVentas, getInventarioUpdates } = require('../controllers/sync.controller');
const { verifyToken } = require('../middleware/auth');
const { validateSucursal } = require('../middleware/sucursal');

// Todas las rutas de sync requieren autenticación y validación de sucursal
router.use(verifyToken);
router.use(validateSucursal);

router.post('/ventas', syncVentas);
router.get('/inventario', getInventarioUpdates);

module.exports = router;
