const traspasosService = require('../services/traspasos.service');
const logger = require('../config/logger');

const getTraspasos = async (req, res) => {
    try {
        const traspasos = await traspasosService.getTraspasos(req.sucursalId);
        res.json(traspasos);
    } catch (error) {
        logger.error('Error getting traspasos:', error);
        res.status(500).json({ message: 'Error al obtener traspasos' });
    }
};

const getTraspasoById = async (req, res) => {
    try {
        const traspaso = await traspasosService.getTraspasoById(req.params.id);
        if (!traspaso) return res.status(404).json({ message: 'Traspaso no encontrado' });
        res.json(traspaso);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener traspaso' });
    }
};

const crearSolicitud = async (req, res) => {
    try {
        const { origen_sucursal_id, items, notas } = req.body;
        // Destino es mi sucursal actual si yo estoy pidiendo? NO.
        // Si SOLICITO mercancía: 
        // Origen = CEDIS (o quien tenga stock)
        // Destino = Mi Sucursal (req.sucursalId)

        // Pero la UI podría permitir elegir origen.
        // Asumiremos que el frontend manda origen y destino claros.

        const data = {
            origen_sucursal_id,
            destino_sucursal_id: req.body.destino_sucursal_id || req.sucursalId,
            usuario_solicita_id: req.user.id,
            items,
            notas
        };

        const result = await traspasosService.solicitarTraspaso(data);
        res.status(201).json(result);
    } catch (error) {
        logger.error('Error creando traspaso:', error);
        res.status(500).json({ message: error.message });
    }
};

const aprobarTraspaso = async (req, res) => {
    try {
        await traspasosService.aprobarTraspaso(req.params.id, req.user.id);
        res.json({ success: true, message: 'Traspaso aprobado y enviado' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const recibirTraspaso = async (req, res) => {
    try {
        await traspasosService.recibirTraspaso(req.params.id, req.user.id);
        res.json({ success: true, message: 'Traspaso recibido correctamente' });
    } catch (error) {
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
