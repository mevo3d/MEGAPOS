const { transaction, query } = require('../config/dbAdapter');
const logger = require('../config/logger');

class VentasService {

    async createVenta(ventaData) {
        return await transaction(async (client) => {
            // 1. Insertar Venta (SQLite structure)
            const ventaResult = await client.query(`
                INSERT INTO ventas (
                    sucursal_id, caja_id, empleado_id, cliente_nombre, 
                    total, metodo_pago, estado, fecha_venta
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            `, [
                ventaData.sucursal_id,
                ventaData.caja_id,
                ventaData.empleado_id,
                ventaData.cliente_nombre || 'Publico General',
                ventaData.total,
                ventaData.pagos && ventaData.pagos.length > 0 ? ventaData.pagos[0].metodo : 'efectivo',
                'completada'
            ]);

            const ventaId = ventaResult.rows[0].id;

            // 2. Insertar Detalles
            for (const item of ventaData.items) {
                await client.query(`
                    INSERT INTO ventas_detalle (
                        venta_id, producto_id, cantidad, precio_unitario, subtotal, nombre_producto
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                `, [
                    ventaId, item.producto_id, item.cantidad, item.precio_unitario,
                    item.subtotal, item.nombre_producto
                ]);

                // 3. Actualizar Stock
                await client.query(`
                    UPDATE inventario_sucursal 
                    SET stock_actual = stock_actual - $1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE producto_id = $2 AND sucursal_id = $3
                `, [item.cantidad, item.producto_id, ventaData.sucursal_id]);
            }

            // 4. Insertar Pagos
            for (const pago of ventaData.pagos) {
                await client.query(`
                    INSERT INTO metodos_pago (venta_id, metodo, monto, referencia)
                    VALUES ($1, $2, $3, $4)
                `, [ventaId, pago.metodo, pago.monto, pago.referencia]);
            }

            return { id: ventaId, ...ventaData };
        });
    }

    async getVentasHoy(sucursalId) {
        const result = await query(`
      SELECT v.*, c.nombre as cliente_nombre, e.nombre as empleado_nombre
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN empleados e ON v.empleado_id = e.id
      WHERE v.sucursal_id = $1 
      AND DATE(v.fecha_venta) = CURRENT_DATE
      ORDER BY v.fecha_venta DESC
    `, [sucursalId]);
        return result.rows;
    }


    async getHistorialCliente(clienteId) {
        const res = await query(`
            SELECT v.id, v.fecha_venta as fecha, v.total, s.nombre as sucursal,
            (SELECT COUNT(*) FROM ventas_detalle WHERE venta_id = v.id) as items
            FROM ventas v
            JOIN sucursales s ON v.sucursal_id = s.id
            WHERE v.cliente_id = $1
            ORDER BY v.fecha_venta DESC
            LIMIT 20
        `, [clienteId]);
        return res.rows;
    }
}

module.exports = new VentasService();
