const express = require('express');
const router = express.Router();
const {
    getResumenDiario,
    getResumenSemanal
} = require('../controllers/nomina.controller');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Todas las rutas de nómina requieren que sea Admin (Super Admin)
router.use(verifyToken);
router.use(isAdmin);

// GET - Resumen diario de ventas y comisiones
router.get('/resumen-diario', getResumenDiario);

// GET - Resumen semanal de ventas y comisiones
router.get('/resumen-semanal', getResumenSemanal);

module.exports = router;
