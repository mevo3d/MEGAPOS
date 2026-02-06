const express = require('express');
const router = express.Router();
const preciosController = require('../controllers/precios.controller');
const auth = require('../middleware/auth');

router.get('/listas', auth.verifyToken, preciosController.getListas);
router.post('/listas', auth.verifyToken, preciosController.createLista);
router.put('/listas/:id', auth.verifyToken, preciosController.updateLista);

// Ruta para actualización masiva de precios globales
router.post('/global', auth.verifyToken, preciosController.updateGlobalPrices);

module.exports = router;
