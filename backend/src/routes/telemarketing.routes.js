const express = require('express');
const router = express.Router();
const telemarketingController = require('../controllers/telemarketing.controller');
const auth = require('../middleware/auth');

// Middleware para verificar rol (podemos hacer uno específico o usar verifyToken)
const isTelemarketing = (req, res, next) => {
    if (!['admin', 'superadmin', 'telemarketing'].includes(req.user.rol)) {
        return res.status(403).json({ message: 'Requiere rol de Telemarketing' });
    }
    next();
};

router.use(auth.verifyToken, isTelemarketing);

router.get('/dashboard', telemarketingController.getDashboardData);
router.get('/estadisticas', telemarketingController.getEstadisticas);
router.post('/llamadas', telemarketingController.registrarLlamada);
router.post('/tareas', telemarketingController.crearTarea);
router.put('/tareas/:id/completar', telemarketingController.completarTarea);

module.exports = router;
