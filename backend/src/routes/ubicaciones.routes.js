const express = require('express');
const router = express.Router();
const ubicacionesController = require('../controllers/ubicaciones.controller');
const auth = require('../middleware/auth');

router.get('/', auth.verifyToken, ubicacionesController.getUbicaciones);
router.post('/', auth.verifyToken, ubicacionesController.createUbicacion);
router.delete('/:id', auth.verifyToken, ubicacionesController.deleteUbicacion);

module.exports = router;
