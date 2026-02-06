const express = require('express');
const router = express.Router();
const {
    getAllSucursales,
    getSucursalById,
    createSucursal,
    updateSucursal,
    deleteSucursal
} = require('../controllers/sucursales.controller');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Aplicar middleware a todas las rutas
router.use(verifyToken);
router.use(isAdmin);

// GET - Obtener todas las sucursales
router.get('/', getAllSucursales);

// GET - Obtener sucursal por ID
router.get('/:id', getSucursalById);

// POST - Crear nueva sucursal
router.post('/', createSucursal);

// PUT - Actualizar sucursal
router.put('/:id', updateSucursal);

// DELETE - Eliminar sucursal
router.delete('/:id', deleteSucursal);

module.exports = router;