const inventarioService = require('../services/inventario.service');
const logger = require('../config/logger');

const getTraspasos = async (req, res) => {
    try {
        const filtros = {
            sucursal_id: req.query.sucursal_id || req.sucursalId,
            estado: req.query.estado
        };
        const transferencias = await inventarioService.getTransferencias(filtros);
        res.json(transferencias);
    } catch (error) {
        logger.error('Error getting traspasos:', error);
        res.status(500).json({ message: 'Error al obtener traspasos' });
    }
};

const getTraspasoById = async (req, res) => {
    try {
        const transferencia = await inventarioService.getTransferenciaById(req.params.id);
        if (!transferencia) return res.status(404).json({ message: 'Traspaso no encontrado' });
        res.json(transferencia);
    } catch (error) {
        logger.error('Error getting traspaso by id:', error);
        res.status(500).json({ message: 'Error al obtener traspaso' });
    }
};

const crearSolicitud = async (req, res) => {
    try {
        const { origen_sucursal_id, destino_sucursal_id, items, notas, tipo } = req.body;

        const data = {
            sucursal_origen_id: origen_sucursal_id,
            sucursal_destino_id: destino_sucursal_id || req.sucursalId,
            usuario_id: req.user.id,
            items: items.map(item => ({
                producto_id: item.producto_id,
                cantidad: item.cantidad
            })),
            tipo: tipo || 'solicitud', // Si viene de "Nueva Solicitud", es pull
            observaciones: notas
        };

        const result = await inventarioService.crearTransferencia(data);
        res.status(201).json(result);
    } catch (error) {
        logger.error('Error creando traspaso:', error);
        res.status(500).json({ message: error.message });
    }
};

const aprobarTraspaso = async (req, res) => {
    // En el nuevo sistema, "aprobar" un traspaso tipo 'solicitud' significa
    // que el origen ahora lo envía. 
    // Por ahora, el inventarioService.crearTransferencia con tipo 'envio' ya descuenta stock.
    // Si queremos un flujo Solicitud -> Aprobación -> Envío, necesitaríamos más estados.
    // El usuario pidió: Envío (Dispersión) -> Aceptación (Gerente).

    // Si la solicitud ya existe como 'solicitada', aprobarla implica pasarla a 'en_transito'
    // y descontar el stock del origen.

    try {
        const result = await inventarioService.aprobarTransferencia(req.params.id, req.user.id);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const recibirTraspaso = async (req, res) => {
    try {
        const { items } = req.body; // Opcional: recibir cantidades reales
        // Si no vienen items, usamos los de la transferencia
        let itemsParaRecepcion = items;

        if (!itemsParaRecepcion) {
            const trans = await inventarioService.getTransferenciaById(req.params.id);
            itemsParaRecepcion = trans.items.map(i => ({
                producto_id: i.producto_id,
                cantidad_recibida: i.cantidad_enviada
            }));
        }

        const result = await inventarioService.confirmarRecepcion(req.params.id, itemsParaRecepcion, req.user.id);
        res.json(result);
    } catch (error) {
        logger.error('Error recibiendo traspaso:', error);
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    getTraspasos,
    getTraspasoById,
    crearSolicitud,
    aprobarTraspaso,
    recibirTraspaso
};
