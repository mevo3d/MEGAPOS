const express = require('express');
const router = express.Router();
const { verifyToken, isSuperAdmin } = require('../middleware/auth');
const aiAssistantController = require('../controllers/aiAssistant.controller');

// Todas las rutas requieren superadmin
router.use(verifyToken);

// Consulta en lenguaje natural (solo superadmin)
router.post('/query', isSuperAdmin, aiAssistantController.query);

// Historial de consultas
router.get('/history', isSuperAdmin, aiAssistantController.getHistory);

// Sugerencias de consultas
router.get('/suggestions', isSuperAdmin, aiAssistantController.getSuggestions);

// Configuración de IA
router.get('/config', isSuperAdmin, aiAssistantController.getConfig);
router.put('/config', isSuperAdmin, aiAssistantController.updateConfig);

module.exports = router;
