const express = require('express');
const router = express.Router();
const recepcionesController = require('../controllers/recepciones.controller');
const auth = require('../middleware/auth');

router.get('/', auth.verifyToken, recepcionesController.getRecepciones);
router.get('/:id', auth.verifyToken, recepcionesController.getRecepcionById);
router.post('/', auth.verifyToken, recepcionesController.createRecepcion);

module.exports = router;
