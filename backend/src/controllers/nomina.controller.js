const { query } = require('../config/dbAdapter');
const logger = require('../config/logger');

/**
 * Obtener resumen de nómina diaria
 */
const getResumenDiario = async (req, res) => {
    try {
        const { fecha } = req.query;
        const targetDate = fecha || new Date().toISOString().split('T')[0];

        const result = await query(`
            SELECT 
                e.nombre,
                COUNT(v.id) as num_ventas,
                SUM(v.total) as total_ventas,
                SUM(cg.monto_comision) as total_comision
            FROM empleados e
            LEFT JOIN ventas v ON e.id = v.vendedor_id AND DATE(v.fecha_venta) = $1
            LEFT JOIN comisiones_generadas cg ON v.id = cg.venta_id
            WHERE e.activo = 1
            GROUP BY e.id, e.nombre
            HAVING COUNT(v.id) > 0
            ORDER BY total_ventas DESC
        `, [targetDate]);

        res.json(result.rows);
    } catch (error) {
        logger.error('Error en resumen diario:', error);
        res.status(500).json({ message: 'Error obteniendo resumen diario' });
    }
};

/**
 * Obtener resumen de nómina semanal
 */
const getResumenSemanal = async (req, res) => {
    try {
        const { inicio, fin } = req.query; // Formato YYYY-MM-DD

        const result = await query(`
            SELECT 
                e.nombre,
                COUNT(v.id) as num_ventas,
                SUM(v.total) as total_ventas,
                SUM(cg.monto_comision) as total_comision
            FROM empleados e
            JOIN comisiones_generadas cg ON e.id = cg.vendedor_id
            JOIN ventas v ON cg.venta_id = v.id
            WHERE v.fecha_venta BETWEEN $1 AND $2
            GROUP BY e.id, e.nombre
            ORDER BY total_comision DESC
        `, [inicio, fin]);

        res.json(result.rows);
    } catch (error) {
        logger.error('Error en resumen semanal:', error);
        res.status(500).json({ message: 'Error obteniendo resumen semanal' });
    }
};

module.exports = {
    getResumenDiario,
    getResumenSemanal
};
