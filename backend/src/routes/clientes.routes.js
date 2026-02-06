const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientes.controller');
const auth = require('../middleware/auth');

router.get('/tareas', auth.verifyToken, clientesController.getTareasPendientes);
router.put('/tareas/:id/completar', auth.verifyToken, clientesController.completarTarea);

router.get('/', auth.verifyToken, clientesController.getClientes);
router.get('/:id', auth.verifyToken, clientesController.getClienteById);
router.post('/', auth.verifyToken, clientesController.createCliente);
router.put('/:id', auth.verifyToken, clientesController.updateCliente);
router.post('/:id/notas', auth.verifyToken, clientesController.addNotaCRM);

module.exports = router;
