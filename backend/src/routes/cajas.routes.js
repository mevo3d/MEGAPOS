const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
    abrirCaja,
    getEstado,
    registrarMovimiento,
    cerrarCaja,
    getHistorial,
    getMiCaja
} = require('../controllers/cajas.controller');

router.use(verifyToken);

// Rutas de operación de caja
router.get('/mi-caja', getMiCaja);
router.post('/abrir', abrirCaja);
router.get('/:cajaId/estado', getEstado);
router.post('/:cajaId/movimiento', registrarMovimiento);
router.post('/:cajaId/cerrar', cerrarCaja);
router.get('/:cajaId/historial', getHistorial);

module.exports = router;
