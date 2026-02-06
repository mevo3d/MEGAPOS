const express = require('express');
const router = express.Router();
const tiposSucursalController = require('../controllers/tiposSucursal.controller');
const auth = require('../middleware/auth');

// Rutas públicas (para selects en formularios)
router.get('/activos', auth.verifyToken, tiposSucursalController.getTiposSucursalActivos);

// Rutas protegidas (solo admin)
router.get('/', auth.verifyToken, tiposSucursalController.getAllTiposSucursal);
router.post('/', auth.verifyToken, tiposSucursalController.createTipoSucursal);
router.put('/reorder', auth.verifyToken, tiposSucursalController.reorderTiposSucursal);
router.put('/:id', auth.verifyToken, tiposSucursalController.updateTipoSucursal);
router.delete('/:id', auth.verifyToken, tiposSucursalController.deleteTipoSucursal);

module.exports = router;
