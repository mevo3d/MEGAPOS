const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const productosIAController = require('../controllers/productosIA.controller');

// Generar descripción con IA para un producto
router.post('/:id/generar-descripcion', verifyToken, isAdmin, productosIAController.generarDescripcion);

// Obtener productos sin descripción (para vista de enriquecimiento)
router.get('/sin-descripcion', verifyToken, isAdmin, productosIAController.getProductosSinDescripcion);

// Enriquecer productos por lotes
router.post('/enriquecer-lote', verifyToken, isAdmin, productosIAController.enriquecerLote);

// Actualizar campos de proveedor
router.put('/:id/proveedor', verifyToken, productosIAController.updateCamposProveedor);

module.exports = router;
