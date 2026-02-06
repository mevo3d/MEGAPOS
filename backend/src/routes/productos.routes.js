const express = require('express');
const router = express.Router();
const { verifyToken, isGerenteOrAdmin, isAdmin, canCreateProducts } = require('../middleware/auth');
const {
    getProductos,
    getProducto,
    createProducto,
    updateProducto,
    deleteProducto
} = require('../controllers/productos.controller');

router.use(verifyToken);

router.get('/', getProductos);
router.get('/:id', getProducto);

// Capturistas, gerentes y admins pueden CREAR productos
router.post('/', canCreateProducts, createProducto);

// Solo gerentes y admins pueden EDITAR productos
router.put('/:id', isGerenteOrAdmin, updateProducto);

// Solo admins pueden ELIMINAR productos
router.delete('/:id', isAdmin, deleteProducto);

module.exports = router;

