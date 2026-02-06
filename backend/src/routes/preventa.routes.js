const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
    crearPreventa,
    enviarACobro,
    getPendientesBySucursal,
    getDetalle
} = require('../controllers/preventa.controller');

router.use(verifyToken);

router.post('/', crearPreventa);
router.get('/sucursal/:sucursalId/pendientes', getPendientesBySucursal);
router.get('/:id', getDetalle);
router.put('/:id/enviar-cobro', enviarACobro);

module.exports = router;
