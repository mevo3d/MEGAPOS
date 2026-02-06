const syncService = require('../services/sync.service');
const logger = require('../config/logger');

const syncVentas = async (req, res) => {
    try {
        const { ventas } = req.body;
        const sucursalId = req.sucursalId; // Viene del middleware

        if (!ventas || !Array.isArray(ventas) || ventas.length === 0) {
            return res.status(400).json({ message: 'No hay ventas para sincronizar' });
        }

        // Encolar para procesamiento asíncrono
        await syncService.queueVentas(sucursalId, ventas);

        res.json({
            success: true,
            message: 'Ventas recibidas y encoladas',
            count: ventas.length
        });

    } catch (error) {
        logger.error('Error en syncVentas:', error);
        res.status(500).json({ message: 'Error interno al sincronizar ventas' });
    }
};

const getInventarioUpdates = async (req, res) => {
    try {
        const sucursalId = req.sucursalId;
        const { last_sync } = req.query;

        const updates = await syncService.getInventarioUpdates(sucursalId, last_sync);

        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            updates
        });

    } catch (error) {
        logger.error('Error en getInventarioUpdates:', error);
        res.status(500).json({ message: 'Error obteniendo actualizaciones' });
    }
};

module.exports = { syncVentas, getInventarioUpdates };
