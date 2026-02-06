const express = require('express');
const router = express.Router();
const {
    getAllPuntosVenta,
    getPuntoVentaById,
    createPuntoVenta,
    updatePuntoVenta,
    deletePuntoVenta,
    getPuntosVentaBySucursal
} = require('../controllers/puntosVenta.controller');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Aplicar middleware a todas las rutas
router.use(verifyToken);
router.use(isAdmin);

// GET - Obtener todos los puntos de venta
router.get('/', getAllPuntosVenta);

// GET - Obtener puntos de venta por sucursal
router.get('/sucursal/:sucursalId', getPuntosVentaBySucursal);

// GET - Obtener punto de venta por ID
router.get('/:id', getPuntoVentaById);

// POST - Crear nuevo punto de venta
router.post('/', createPuntoVenta);

// PUT - Actualizar punto de venta
router.put('/:id', updatePuntoVenta);

// DELETE - Eliminar punto de venta
router.delete('/:id', deletePuntoVenta);

module.exports = router;