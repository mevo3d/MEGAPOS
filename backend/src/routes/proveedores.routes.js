const express = require('express');
const router = express.Router();
const proveedoresController = require('../controllers/proveedores.controller');
const auth = require('../middleware/auth');

router.get('/', auth.verifyToken, proveedoresController.getAllProveedores);
router.post('/', auth.verifyToken, proveedoresController.createProveedor);
router.put('/:id', auth.verifyToken, proveedoresController.updateProveedor);
router.delete('/:id', auth.verifyToken, proveedoresController.deleteProveedor);

module.exports = router;
