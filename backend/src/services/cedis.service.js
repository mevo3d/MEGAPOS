const { pool } = require('../config/db');

class CedisService {

    // --- KPIs y Dashboard ---

    async getKPIs(sucursalId) {
        const client = await pool.connect();
        try {
            // 1. Órdenes pendientes de recepción
            const pendientesRes = await client.query(`
                SELECT COUNT(*) as total 
                FROM ordenes_compra 
                WHERE sucursal_destino_id = $1 AND estado != 'recibida'
            `, [sucursalId]);

            // 2. Recepciones del mes actual
            const recepcionesMesRes = await client.query(`
                SELECT COUNT(*) as total, COALESCE(SUM(rd.cantidad_recibida), 0) as unidades
                FROM recepciones r
                LEFT JOIN recepciones_detalle rd ON r.id = rd.recepcion_id
                WHERE r.sucursal_id = $1 
                AND r.fecha_recepcion >= DATE_TRUNC('month', CURRENT_DATE)
            `, [sucursalId]);

            // 3. Productos por caducar (próximos 30 días)
            const porCaducarRes = await client.query(`
                SELECT COUNT(DISTINCT rd.producto_id) as productos, SUM(rd.cantidad_recibida) as unidades
                FROM recepciones_detalle rd
                JOIN recepciones r ON rd.recepcion_id = r.id
                WHERE r.sucursal_id = $1 
                AND rd.fecha_caducidad IS NOT NULL
                AND rd.fecha_caducidad <= CURRENT_DATE + INTERVAL '30 days'
                AND rd.fecha_caducidad >= CURRENT_DATE
            `, [sucursalId]);

            // 4. Productos caducados
            const caducadosRes = await client.query(`
                SELECT COUNT(DISTINCT rd.producto_id) as productos
                FROM recepciones_detalle rd
                JOIN recepciones r ON rd.recepcion_id = r.id
                WHERE r.sucursal_id = $1 
                AND rd.fecha_caducidad IS NOT NULL
                AND rd.fecha_caducidad < CURRENT_DATE
            `, [sucursalId]);

            // 5. Stock bajo (productos con stock < stock_minimo)
            const stockBajoRes = await client.query(`
                SELECT COUNT(*) as total
                FROM inventario_sucursal i
                JOIN productos_catalogo p ON i.producto_id = p.id
                WHERE i.sucursal_id = $1 
                AND i.stock_actual <= i.stock_minimo
            `, [sucursalId]);

            // 6. Ubicaciones ocupadas vs totales
            const ubicacionesRes = await client.query(`
                SELECT 
                    COUNT(DISTINCT u.id) as total,
                    COUNT(DISTINCT CASE WHEN pu.cantidad > 0 THEN u.id END) as ocupadas
                FROM ubicaciones u
                LEFT JOIN producto_ubicaciones pu ON u.id = pu.ubicacion_id
                WHERE u.sucursal_id = $1
            `, [sucursalId]);

            // 7. Traspasos pendientes de envío
            const traspasosPendientesRes = await client.query(`
                SELECT COUNT(*) as total
                FROM traspasos
                WHERE sucursal_origen_id = $1 AND estado = 'aprobado'
            `, [sucursalId]);

            // 8. Actividad reciente (últimas 5 recepciones)
            const actividadRes = await client.query(`
                SELECT r.id, r.fecha_recepcion, p.nombre as proveedor_nombre,
                       COUNT(rd.id) as productos, SUM(rd.cantidad_recibida) as unidades
                FROM recepciones r
                LEFT JOIN proveedores p ON r.proveedor_id = p.id
                LEFT JOIN recepciones_detalle rd ON r.id = rd.recepcion_id
                WHERE r.sucursal_id = $1
                GROUP BY r.id, r.fecha_recepcion, p.nombre
                ORDER BY r.fecha_recepcion DESC
                LIMIT 5
            `, [sucursalId]);

            return {
                ordenesPendientes: parseInt(pendientesRes.rows[0]?.total || 0),
                recepcionesMes: parseInt(recepcionesMesRes.rows[0]?.total || 0),
                unidadesRecibidasMes: parseInt(recepcionesMesRes.rows[0]?.unidades || 0),
                productosPorCaducar: parseInt(porCaducarRes.rows[0]?.productos || 0),
                unidadesPorCaducar: parseInt(porCaducarRes.rows[0]?.unidades || 0),
                productosCaducados: parseInt(caducadosRes.rows[0]?.productos || 0),
                stockBajo: parseInt(stockBajoRes.rows[0]?.total || 0),
                ubicacionesTotal: parseInt(ubicacionesRes.rows[0]?.total || 0),
                ubicacionesOcupadas: parseInt(ubicacionesRes.rows[0]?.ocupadas || 0),
                traspasosPendientes: parseInt(traspasosPendientesRes.rows[0]?.total || 0),
                actividadReciente: actividadRes.rows
            };
        } finally {
            client.release();
        }
    }

    // --- Recepciones ---

    async getOrdenesPendientes(sucursalId) {
        // En teoría, una sucursal ve las órdenes destinadas a ella
        const res = await pool.query(`
            SELECT oc.*, p.nombre as proveedor_nombre
            FROM ordenes_compra oc
            LEFT JOIN proveedores p ON oc.proveedor_id = p.id
            WHERE oc.sucursal_destino_id = $1 AND oc.estado != 'recibida'
            ORDER BY oc.fecha_emision DESC
        `, [sucursalId]);
        return res.rows;
    }

    async getOrdenDetalle(ordenId) {
        const res = await pool.query(`
            SELECT ocd.*, p.nombre as producto_nombre, p.sku
            FROM ordenes_compra_detalle ocd
            JOIN productos p ON ocd.producto_id = p.id
            WHERE ocd.orden_compra_id = $1
        `, [ordenId]);
        return res.rows;
    }

    async registrarRecepcion(data) {
        const { orden_compra_id, sucursal_id, usuario_id, items, notas, proveedor_id } = data;
        // items: [{ producto_id, cantidad_recibida, ubicacion_id, lote, fecha_caducidad }]

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Crear Recepción
            const resRec = await client.query(`
                INSERT INTO recepciones (orden_compra_id, sucursal_id, usuario_recibe_id, notas, proveedor_id)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `, [orden_compra_id, sucursal_id, usuario_id, notas, proveedor_id]);
            const recepcionId = resRec.rows[0].id;

            // 2. Procesar detalles
            for (const item of items) {
                // Insertar detalle recepción CON lote y caducidad
                await client.query(`
                    INSERT INTO recepciones_detalle (recepcion_id, producto_id, cantidad_recibida, cantidad_esperada, lote, fecha_caducidad)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [recepcionId, item.producto_id, item.cantidad_recibida, item.cantidad_esperada || 0, item.lote || null, item.fecha_caducidad || null]);

                // 3. Actualizar Inventario General (Disponibilidad)
                // Upsert inventario
                const invCheck = await client.query(
                    'SELECT id FROM inventario_sucursal WHERE producto_id=$1 AND sucursal_id=$2',
                    [item.producto_id, sucursal_id]
                );

                if (invCheck.rows.length > 0) {
                    await client.query(`
                        UPDATE inventario_sucursal SET stock_actual = stock_actual + $1, updated_at = CURRENT_TIMESTAMP
                        WHERE producto_id=$2 AND sucursal_id=$3
                    `, [item.cantidad_recibida, item.producto_id, sucursal_id]);
                } else {
                    await client.query(`
                        INSERT INTO inventario_sucursal (sucursal_id, producto_id, stock_actual)
                        VALUES ($1, $2, $3)
                    `, [sucursal_id, item.producto_id, item.cantidad_recibida]);
                }

                // 4. (Opcional) Guardar en Ubicación específica si se proveyó
                if (item.ubicacion_id) {
                    const ubiCheck = await client.query(
                        'SELECT id FROM producto_ubicaciones WHERE ubicacion_id=$1 AND producto_id=$2',
                        [item.ubicacion_id, item.producto_id]
                    );

                    if (ubiCheck.rows.length > 0) {
                        await client.query(`
                            UPDATE producto_ubicaciones SET cantidad = cantidad + $1
                            WHERE id=$2
                         `, [item.cantidad_recibida, ubiCheck.rows[0].id]);
                    } else {
                        await client.query(`
                            INSERT INTO producto_ubicaciones (ubicacion_id, producto_id, cantidad)
                            VALUES ($1, $2, $3)
                         `, [item.ubicacion_id, item.producto_id, item.cantidad_recibida]);
                    }
                }
            }

            // 5. Actualizar Estado de Orden de Compra (si existe)
            if (orden_compra_id) {
                await client.query(`
                    UPDATE ordenes_compra SET estado = 'recibida', updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                `, [orden_compra_id]);
            }

            await client.query('COMMIT');
            return { id: recepcionId };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // --- Ubicaciones ---

    async getUbicaciones(sucursalId) {
        const res = await pool.query('SELECT * FROM ubicaciones WHERE sucursal_id = $1 ORDER BY codigo', [sucursalId]);
        return res.rows;
    }

    async crearUbicacion(data) {
        const { sucursal_id, codigo, tipo, notas } = data;
        const res = await pool.query(`
            INSERT INTO ubicaciones (sucursal_id, codigo, tipo, notas)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [sucursal_id, codigo, tipo, notas]);
        return res.rows[0];
    }

    async getContenidoUbicacion(ubicacionId) {
        const res = await pool.query(`
            SELECT pu.*, p.nombre, p.sku, p.imagen_url
            FROM producto_ubicaciones pu
            JOIN productos p ON pu.producto_id = p.id
            WHERE pu.ubicacion_id = $1 AND pu.cantidad > 0
        `, [ubicacionId]);
        return res.rows;
    }

    async getUbicacionesProducto(sku, sucursalId) {
        const res = await pool.query(`
            SELECT pu.cantidad, u.codigo, u.tipo
            FROM producto_ubicaciones pu
            JOIN ubicaciones u ON pu.ubicacion_id = u.id
            JOIN productos p ON pu.producto_id = p.id
            WHERE p.sku = $1 AND u.sucursal_id = $2 AND pu.cantidad > 0
        `, [sku, sucursalId]);
        return res.rows;
    }
}

module.exports = new CedisService();
