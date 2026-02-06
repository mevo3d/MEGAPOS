const reportesService = require('../services/reportes.service');
const logger = require('../config/logger');

const getVentasReport = async (req, res) => {
    try {
        const { inicio, fin, sucursal_id } = req.query;
        // Si es admin, puede filtrar por sucursal. Si no, usa su propia sucursal.
        const targetSucursal = req.user.rol === 'admin' ? sucursal_id : req.sucursalId;

        const reporte = await reportesService.getVentasPorPeriodo(
            targetSucursal,
            inicio || new Date().toISOString().split('T')[0],
            fin || new Date().toISOString().split('T')[0]
        );
        res.json(reporte);
    } catch (error) {
        logger.error('Error en reporte ventas:', error);
        res.status(500).json({ message: 'Error generando reporte' });
    }
};

const getTopProductos = async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        const targetSucursal = req.user.rol === 'admin' ? sucursal_id : req.sucursalId;

        const productos = await reportesService.getProductosMasVendidos(targetSucursal);
        res.json(productos);
    } catch (error) {
        logger.error('Error en top productos:', error);
        res.status(500).json({ message: 'Error generando reporte' });
    }
};

module.exports = { getVentasReport, getTopProductos };
