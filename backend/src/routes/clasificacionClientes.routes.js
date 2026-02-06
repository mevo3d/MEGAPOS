const express = require('express');
const router = express.Router();
const clasificacionService = require('../services/clasificacionClientes.service');
const auth = require('../middleware/auth');

// Middleware para verificar roles permitidos
const canAccessClasificacion = (req, res, next) => {
    if (!['admin', 'superadmin', 'telemarketing', 'gerente'].includes(req.user.rol)) {
        return res.status(403).json({ message: 'Acceso denegado' });
    }
    next();
};

router.use(auth.verifyToken, canAccessClasificacion);

// ==================== TIPOS DE CLIENTE ====================

// GET /api/clasificacion-clientes/tipos - Obtener todos los tipos de cliente
router.get('/tipos', async (req, res) => {
    try {
        const tipos = await clasificacionService.getTiposCliente();
        res.json(tipos);
    } catch (error) {
        console.error('Error al obtener tipos de cliente:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST /api/clasificacion-clientes/tipos - Crear tipo de cliente
router.post('/tipos', async (req, res) => {
    try {
        const tipo = await clasificacionService.crearTipoCliente(req.body);
        res.status(201).json(tipo);
    } catch (error) {
        console.error('Error al crear tipo de cliente:', error);
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/clasificacion-clientes/tipos/:id - Actualizar tipo de cliente
router.put('/tipos/:id', async (req, res) => {
    try {
        const tipo = await clasificacionService.actualizarTipoCliente(req.params.id, req.body);
        res.json(tipo);
    } catch (error) {
        console.error('Error al actualizar tipo de cliente:', error);
        res.status(500).json({ message: error.message });
    }
});

// ==================== ETIQUETAS ====================

// GET /api/clasificacion-clientes/etiquetas - Obtener todas las etiquetas
router.get('/etiquetas', async (req, res) => {
    try {
        const etiquetas = await clasificacionService.getEtiquetas();
        res.json(etiquetas);
    } catch (error) {
        console.error('Error al obtener etiquetas:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST /api/clasificacion-clientes/etiquetas - Crear etiqueta
router.post('/etiquetas', async (req, res) => {
    try {
        const etiqueta = await clasificacionService.crearEtiqueta(req.body);
        res.status(201).json(etiqueta);
    } catch (error) {
        console.error('Error al crear etiqueta:', error);
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/clasificacion-clientes/etiquetas/:id - Eliminar etiqueta
router.delete('/etiquetas/:id', async (req, res) => {
    try {
        await clasificacionService.eliminarEtiqueta(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error al eliminar etiqueta:', error);
        res.status(500).json({ message: error.message });
    }
});

// ==================== CLIENTES CON CLASIFICACIÓN ====================

// GET /api/clasificacion-clientes/clientes - Obtener clientes con filtros
router.get('/clientes', async (req, res) => {
    try {
        const clientes = await clasificacionService.getClientesConClasificacion(req.query);
        res.json(clientes);
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/clasificacion-clientes/clientes/:id - Actualizar clasificación de cliente
router.put('/clientes/:id', async (req, res) => {
    try {
        const cliente = await clasificacionService.actualizarClasificacion(req.params.id, req.body);
        res.json(cliente);
    } catch (error) {
        console.error('Error al actualizar clasificación:', error);
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/clasificacion-clientes/clientes/:id/etiquetas - Asignar etiquetas a cliente
router.put('/clientes/:id/etiquetas', async (req, res) => {
    try {
        const { etiqueta_ids } = req.body;
        await clasificacionService.asignarEtiquetas(req.params.id, etiqueta_ids);
        res.json({ success: true });
    } catch (error) {
        console.error('Error al asignar etiquetas:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST /api/clasificacion-clientes/clientes/:id/etiquetas/:etiquetaId - Agregar una etiqueta
router.post('/clientes/:id/etiquetas/:etiquetaId', async (req, res) => {
    try {
        await clasificacionService.agregarEtiqueta(req.params.id, req.params.etiquetaId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error al agregar etiqueta:', error);
        res.status(500).json({ message: error.message });
    }
});

// DELETE /api/clasificacion-clientes/clientes/:id/etiquetas/:etiquetaId - Quitar una etiqueta
router.delete('/clientes/:id/etiquetas/:etiquetaId', async (req, res) => {
    try {
        await clasificacionService.quitarEtiqueta(req.params.id, req.params.etiquetaId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error al quitar etiqueta:', error);
        res.status(500).json({ message: error.message });
    }
});

// ==================== ESTADÍSTICAS ====================

// GET /api/clasificacion-clientes/estadisticas - Estadísticas de clasificación
router.get('/estadisticas', async (req, res) => {
    try {
        const estadisticas = await clasificacionService.getEstadisticasClasificacion();
        res.json(estadisticas);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET /api/clasificacion-clientes/destacados - Clientes destacados
router.get('/destacados', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const destacados = await clasificacionService.getClientesDestacados(limit);
        res.json(destacados);
    } catch (error) {
        console.error('Error al obtener clientes destacados:', error);
        res.status(500).json({ message: error.message });
    }
});

// POST /api/clasificacion-clientes/clasificacion-automatica - Ejecutar clasificación automática
router.post('/clasificacion-automatica', async (req, res) => {
    try {
        const resultado = await clasificacionService.clasificacionAutomatica();
        res.json(resultado);
    } catch (error) {
        console.error('Error en clasificación automática:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
