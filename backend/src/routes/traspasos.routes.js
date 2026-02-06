const express = require('express');
const router = express.Router();
const traspasosController = require('../controllers/traspasos.controller');
const auth = require('../middleware/auth');

router.get('/', [auth.verifyToken], traspasosController.getTraspasos);
router.get('/:id', [auth.verifyToken], traspasosController.getTraspasoById);
router.post('/', [auth.verifyToken], traspasosController.crearSolicitud);
router.post('/:id/aprobar', [auth.verifyToken, auth.isBodeguero], traspasosController.aprobarTraspaso); // Solo bodeguero/admin aprueba envíos
router.post('/:id/recibir', [auth.verifyToken], traspasosController.recibirTraspaso);

module.exports = router;
