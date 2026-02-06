const coordinacionService = require('../services/coordinacion.service');
const logger = require('../config/logger');

// ====================================================
// PEDIDOS
// ====================================================

// Crear pedido
const crearPedido = async (req, res) => {
    try {
        const data = {
            ...req.body,
            empleado_solicitante_id: req.body.empleado_solicitante_id || req.userId
        };

        const result = await coordinacionService.crearPedido(data);
        res.status(201).json(result);
    } catch (error) {
        logger.error('Error creando pedido:', error);
        res.status(500).json({ error: 'Error al crear pedido', details: error.message });
    }
};

// Obtener pedidos con filtros
const getPedidos = async (req, res) => {
    try {
        const filtros = {
            estado: req.query.estado,
            rutero_id: req.query.rutero_id,
            sucursal_id: req.query.sucursal_id,
            cliente_id: req.query.cliente_id,
            fecha_desde: req.query.fecha_desde,
            fecha_hasta: req.query.fecha_hasta,
            origen: req.query.origen,
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0
        };

        const pedidos = await coordinacionService.getPedidos(filtros);
        res.json(pedidos);
    } catch (error) {
        logger.error('Error obteniendo pedidos:', error);
        res.status(500).json({ error: 'Error al obtener pedidos' });
    }
};

// Obtener pedido por ID
const getPedidoById = async (req, res) => {
    try {
        const pedido = await coordinacionService.getPedidoById(req.params.id);
        if (!pedido) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        res.json(pedido);
    } catch (error) {
        logger.error('Error obteniendo pedido:', error);
        res.status(500).json({ error: 'Error al obtener pedido' });
    }
};

// Aprobar pedido
const aprobarPedido = async (req, res) => {
    try {
        const result = await coordinacionService.aprobarPedido(
            req.params.id,
            req.userId,
            req.body.notas
        );
        res.json(result);
    } catch (error) {
        logger.error('Error aprobando pedido:', error);
        res.status(400).json({ error: error.message });
    }
};

// Rechazar pedido
const rechazarPedido = async (req, res) => {
    try {
        const result = await coordinacionService.rechazarPedido(
            req.params.id,
            req.userId,
            req.body.motivo
        );
        res.json(result);
    } catch (error) {
        logger.error('Error rechazando pedido:', error);
        res.status(400).json({ error: error.message });
    }
};

// Asignar rutero
const asignarRutero = async (req, res) => {
    try {
        const { rutero_id, ruta_id, fecha_entrega_estimada } = req.body;
        const result = await coordinacionService.asignarRutero(
            req.params.id,
            rutero_id,
            ruta_id,
            req.userId,
            fecha_entrega_estimada
        );
        res.json(result);
    } catch (error) {
        logger.error('Error asignando rutero:', error);
        res.status(400).json({ error: error.message });
    }
};

// Cambiar estado
const cambiarEstado = async (req, res) => {
    try {
        const { estado, notas, ubicacion } = req.body;
        const result = await coordinacionService.cambiarEstado(
            req.params.id,
            estado,
            req.userId,
            notas,
            ubicacion
        );
        res.json(result);
    } catch (error) {
        logger.error('Error cambiando estado:', error);
        res.status(400).json({ error: error.message });
    }
};

// ====================================================
// TRACKING
// ====================================================

// Actualizar ubicación del rutero
const actualizarUbicacion = async (req, res) => {
    try {
        const result = await coordinacionService.actualizarUbicacionRutero(
            req.userId, // El rutero autenticado
            req.body
        );
        res.json(result);
    } catch (error) {
        logger.error('Error actualizando ubicación:', error);
        res.status(500).json({ error: 'Error al actualizar ubicación' });
    }
};

// Obtener ubicaciones de ruteros
const getUbicacionesRuteros = async (req, res) => {
    try {
        const ubicaciones = await coordinacionService.getUbicacionesRuteros();
        res.json(ubicaciones);
    } catch (error) {
        logger.error('Error obteniendo ubicaciones:', error);
        res.status(500).json({ error: 'Error al obtener ubicaciones' });
    }
};

// Obtener tracking de pedido
const getTrackingPedido = async (req, res) => {
    try {
        const tracking = await coordinacionService.getTrackingPedido(req.params.id);
        res.json(tracking);
    } catch (error) {
        logger.error('Error obteniendo tracking:', error);
        res.status(500).json({ error: 'Error al obtener tracking' });
    }
};

// ====================================================
// DASHBOARD Y ESTADÍSTICAS
// ====================================================

// Estadísticas
const getEstadisticas = async (req, res) => {
    try {
        const filtros = {
            fecha_desde: req.query.fecha_desde,
            fecha_hasta: req.query.fecha_hasta
        };
        const stats = await coordinacionService.getEstadisticasCoordinacion(filtros);
        res.json(stats);
    } catch (error) {
        logger.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
};

// Ruteros disponibles
const getRuterosDisponibles = async (req, res) => {
    try {
        const ruteros = await coordinacionService.getRuterosDisponibles();
        res.json(ruteros);
    } catch (error) {
        logger.error('Error obteniendo ruteros:', error);
        res.status(500).json({ error: 'Error al obtener ruteros' });
    }
};

// Pedidos para mapa
const getPedidosMapa = async (req, res) => {
    try {
        const pedidos = await coordinacionService.getPedidosParaMapa({
            estado: req.query.estado
        });
        res.json(pedidos);
    } catch (error) {
        logger.error('Error obteniendo pedidos para mapa:', error);
        res.status(500).json({ error: 'Error al obtener pedidos' });
    }
};

module.exports = {
    crearPedido,
    getPedidos,
    getPedidoById,
    aprobarPedido,
    rechazarPedido,
    asignarRutero,
    cambiarEstado,
    actualizarUbicacion,
    getUbicacionesRuteros,
    getTrackingPedido,
    getEstadisticas,
    getRuterosDisponibles,
    getPedidosMapa
};
