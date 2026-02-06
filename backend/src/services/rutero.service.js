const { pool } = require('../config/db');
const logger = require('../config/logger');

class RuteroService {

    // Obtener inventario de la camioneta
    async getInventarioRuta(rutaId) {
        const query = `
            SELECT ir.producto_id, p.nombre, p.sku, p.precio_base, ir.cantidad, p.imagen_url
            FROM inventario_ruta ir
            JOIN productos p ON ir.producto_id = p.id
            WHERE ir.ruta_id = $1 AND ir.cantidad > 0
        `;
        const res = await pool.query(query, [rutaId]);
        return res.rows;
    }

    // Registrar una venta en ruta (descuenta de inventario_ruta)
    async registrarVentaRuta(ventaData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const { ruta_id, cliente_id, items, total, usuario_id, coordenadas } = ventaData;

            // 1. Crear Venta en tabla 'ventas' (Asumimos que la ruta pertenece a una sucursal, o usamos una sucursal 'Ruta')
            // Necesitamos saber a qué sucursal 'pertenece' la ruta para reportes, o si la ruta es una 'sucursal' virtual.
            // Por ahora, usaremos la sucursal del usuario (vendedor).

            // Obtener sucursal del rutero
            const ruteroRes = await client.query('SELECT sucursal_id FROM empleados WHERE id = $1', [usuario_id]);
            const sucursalId = ruteroRes.rows[0]?.sucursal_id || 1; // Fallback 1

            const ventaRes = await client.query(`
                INSERT INTO ventas (
                    sucursal_id, caja_id, empleado_id, cliente_id, 
                    subtotal, impuestos, total, 
                    metodo_pago, estatus, tipo_venta
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pagada', 'ruta')
                RETURNING id
            `, [
                sucursalId,
                9999, // Caja virtual de ruta? O null. Usando 9999 como placeholder.
                usuario_id,
                cliente_id,
                total / 1.16, // Subtotal aprox
                total - (total / 1.16),
                total,
                'efectivo' // Por defecto en ruta
            ]);

            const ventaId = ventaRes.rows[0].id;

            // 2. Procesar Items y Descontar Inventario RUTA
            for (const item of items) {
                // Verificar Stock en Ruta
                const stockRes = await client.query(
                    'SELECT cantidad FROM inventario_ruta WHERE ruta_id = $1 AND producto_id = $2',
                    [ruta_id, item.producto_id]
                );
                const stockActual = stockRes.rows[0]?.cantidad || 0;

                if (stockActual < item.cantidad) {
                    throw new Error(`Stock insuficiente en ruta para producto ${item.nombre}`);
                }

                // Insertar Detalle Venta
                await client.query(`
                    INSERT INTO ventas_detalle (venta_id, producto_id, cantidad, precio_unitario, subtotal)
                    VALUES ($1, $2, $3, $4, $5)
                `, [ventaId, item.producto_id, item.cantidad, item.precio, item.cantidad * item.precio]);

                // Descontar de Inventario Ruta
                await client.query(`
                    UPDATE inventario_ruta 
                    SET cantidad = cantidad - $1, last_updated = CURRENT_TIMESTAMP
                    WHERE ruta_id = $2 AND producto_id = $3
                `, [item.cantidad, ruta_id, item.producto_id]);
            }

            // 3. Registrar Visita con Venta (si aplica)
            if (cliente_id) {
                await client.query(`
                    INSERT INTO visitas_ruteros (ruta_id, cliente_id, fecha_hora, latitud, longitud, notas, resultado, venta_id)
                    VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, 'Venta realizada', 'venta', $5)
                `, [ruta_id, cliente_id, coordenadas?.lat, coordenadas?.lng, ventaId]);
            }

            // 4. Puntos (Reutilizar lógica básica o llamar servicio? Copiaremos lógica simple por ahora)
            // ... (Omitido para brevedad, se podría agregar luego)

            await client.query('COMMIT');
            return { id: ventaId, total };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async cargarCamioneta(rutaId, items) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // items: [{ producto_id, cantidad }]
            // Origen: Bodega Principal (Sucursal del rutero?)
            // Destino: Inventario Ruta

            // Por simplicidad, asumiremos que ya se validó el stock en bodega y se descontó (Traspaso aprobado).
            // Aquí solo SUMAMOS a la ruta. (En un flujo real, sería: Bodega -> Traspaso -> Ruta)

            for (const item of items) {
                // Upsert inventario ruta
                const exists = await client.query(
                    'SELECT id FROM inventario_ruta WHERE ruta_id=$1 AND producto_id=$2',
                    [rutaId, item.producto_id]
                );

                if (exists.rows.length > 0) {
                    await client.query(`
                        UPDATE inventario_ruta SET cantidad = cantidad + $1, last_updated = CURRENT_TIMESTAMP
                        WHERE ruta_id=$2 AND producto_id=$3
                    `, [item.cantidad, rutaId, item.producto_id]);
                } else {
                    await client.query(`
                        INSERT INTO inventario_ruta (ruta_id, producto_id, cantidad, last_updated)
                        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                    `, [rutaId, item.producto_id, item.cantidad]);
                }
            }

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new RuteroService();
