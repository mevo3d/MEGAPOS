const express = require('express');
const router = express.Router();
const {
    getAllEmpleados,
    getEmpleadoById,
    createEmpleado,
    updateEmpleado,
    changePassword,
    deleteEmpleado,
    getSucursales
} = require('../controllers/empleados.controller');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Aplicar middleware a todas las rutas
router.use(verifyToken);
router.use(isAdmin);

// GET - Obtener todos los empleados
router.get('/', getAllEmpleados);

// GET - Obtener sucursales para formularios
router.get('/sucursales', getSucursales);

// GET - Obtener empleado por ID
router.get('/:id', getEmpleadoById);

// POST - Crear nuevo empleado
router.post('/', createEmpleado);

// PUT - Actualizar empleado
router.put('/:id', updateEmpleado);

// PUT - Cambiar contraseña de empleado
router.put('/:id/password', changePassword);

// DELETE - Desactivar empleado
router.delete('/:id', deleteEmpleado);

module.exports = router;