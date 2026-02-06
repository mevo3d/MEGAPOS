const express = require('express');
const router = express.Router();
const { registrarEntrada, registrarSalida, getAsistenciasHoy } = require('../controllers/asistencia.controller');
const { verifyToken } = require('../middleware/auth');
const { validateSucursal } = require('../middleware/sucursal');

router.use(verifyToken);
router.use(validateSucursal);

router.post('/entrada', registrarEntrada);
router.post('/salida', registrarSalida);
router.get('/hoy', getAsistenciasHoy);

module.exports = router;
