const monitorService = require('../services/monitor.service');
const logger = require('../config/logger');

const getDashboardData = async (req, res) => {
    try {
        const [cajas, ventasRecientes, consolidado] = await Promise.all([
            monitorService.getCajasActivas(),
            monitorService.getVentasEnVivo(),
            monitorService.getConsolidadoDia()
        ]);

        res.json({
            timestamp: new Date(),
            consolidado,
            cajas,
            ventas_recientes: ventasRecientes
        });

    } catch (error) {
        logger.error('Error en dashboard data:', error);
        res.status(500).json({ message: 'Error obteniendo datos del monitor' });
    }
};

module.exports = { getDashboardData };
