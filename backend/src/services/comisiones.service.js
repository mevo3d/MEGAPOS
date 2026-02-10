const { query } = require('../config/dbAdapter');
const logger = require('../config/logger');

/**
 * Servicio para gestionar el cálculo y registro de comisiones
 */
class ComisionesService {
    /**
     * Genera la comisión para un vendedor por una venta específica
     * @param {string} ventaId UUID de la venta
     * @param {number} vendedorId ID del empleado vendedor
     * @param {number} montoTotal Monto total de la venta (o subtotal según política)
     */
    async generarComision(ventaId, vendedorId, montoTotal) {
        try {
            if (!vendedorId) return null;

            // 1. Obtener la configuración de comisión del vendedor
            const configResult = await query(
                'SELECT porcentaje_comision FROM configuracion_comisiones WHERE empleado_id = $1 AND activo = 1',
                [vendedorId]
            );

            let porcentaje = 0;
            if (configResult.rows.length > 0) {
                porcentaje = configResult.rows[0].porcentaje_comision;
            }

            if (porcentaje <= 0) {
                logger.info(`Vendedor ${vendedorId} no tiene comisión configurada o es 0%.`);
                return null;
            }

            // 2. Calcular monto
            const montoComision = (montoTotal * porcentaje) / 100;

            // 3. Registrar en la tabla de comisiones
            await query(`
                INSERT INTO comisiones_generadas (
                    venta_id, vendedor_id, monto_venta, porcentaje_aplicado, monto_comision, estado
                ) VALUES ($1, $2, $3, $4, $5, 'pendiente')
            `, [ventaId, vendedorId, montoTotal, porcentaje, montoComision]);

            logger.info(`✅ Comisión generada: $${montoComision} para vendedor ${vendedorId} por venta ${ventaId}`);

            return montoComision;
        } catch (error) {
            logger.error('Error generando comisión:', error);
            // No bloqueamos la venta si falla la comisión, pero logueamos el error
            return null;
        }
    }

    /**
     * Obtiene el acumulado de comisiones de un vendedor en un rango de fechas
     */
    async getComisionesVendedor(vendedorId, fechaInicio, fechaFin) {
        const result = await query(`
            SELECT 
                SUM(monto_comision) as total_comisiones,
                SUM(monto_venta) as total_ventas,
                COUNT(*) as num_ventas
            FROM comisiones_generadas
            WHERE vendedor_id = $1 
            AND fecha_generacion BETWEEN $2 AND $3
            AND estado != 'cancelado'
        `, [vendedorId, fechaInicio, fechaFin]);

        return result.rows[0];
    }
}

module.exports = new ComisionesService();
