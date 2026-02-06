const express = require('express');
const router = express.Router();
const { getVentasReport, getTopProductos } = require('../controllers/reportes.controller');
const { verifyToken, isGerenteOrAdmin } = require('../middleware/auth');

router.use(verifyToken);
router.use(isGerenteOrAdmin); // Solo gerentes y admins ven reportes

router.get('/ventas', getVentasReport);
router.get('/top-productos', getTopProductos);

module.exports = router;
