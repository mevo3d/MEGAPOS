const { pool } = require('../config/db');
const logger = require('../config/logger');

class InventarioService {

    async getInventarioSucursal(sucursalId, options = {}) {
        const { limit = 50, offset = 0, search = '' } = options;

        let query = `
      SELECT 
        p.id, p.codigo as sku, p.nombre, p.descripcion, 
        p.categoria,
        COALESCE(i.stock_actual, 0) as stock_fisico, 0 as stock_disponible, 0 as stock_reservado,
        p.precio_venta as precio,
        COALESCE(ventas_count.total_vendido, 0) as veces_vendido
      FROM productos_catalogo p
      LEFT JOIN inventario_sucursal i ON p.id = i.producto_id AND i.sucursal_id = $1
      LEFT JOIN (
        SELECT producto_id, SUM(cantidad) as total_vendido
        FROM pedidos_items
        GROUP BY producto_id
      ) ventas_count ON p.id = ventas_count.producto_id
      WHERE 1=1
    `;

        const params = [sucursalId];

        if (search) {
            query += ` AND (p.nombre LIKE $2 OR p.codigo LIKE $2)`;
            params.push(`%${search}%`);
        }

        // Ordenar por más vendidos primero, luego alfabéticamente
        query += ` ORDER BY veces_vendido DESC, p.nombre ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    async getBajoStock(sucursalId) {
        let query = `
            SELECT p.nombre, p.codigo as sku, i.stock_actual, i.stock_minimo, s.nombre as sucursal
            FROM inventario_sucursal i
            JOIN productos_catalogo p ON i.producto_id = p.id
            JOIN sucursales s ON i.sucursal_id = s.id
            WHERE i.stock_actual <= i.stock_minimo
        `;
        const params = [];

        if (sucursalId) {
            query += ` AND i.sucursal_id = $1`;
            params.push(sucursalId);
        }

        query += ` ORDER BY i.stock_actual ASC`;

        const result = await pool.query(query, params);
        return result.rows;
    }

    async ajustarStock(sucursalId, empleadoId, ajustes) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const ajuste of ajustes) {
                // ajuste: { producto_id, cantidad_real, motivo }

                // 1. Obtener stock actual para calcular diferencia
                const current = await client.query(
                    'SELECT stock_actual FROM inventario_sucursal WHERE producto_id = $1 AND sucursal_id = $2',
                    [ajuste.producto_id, sucursalId]
                );

                const stockActual = current.rows[0]?.stock_actual || 0;
                const diferencia = ajuste.cantidad_real - stockActual;

                if (diferencia === 0) continue;

                // 2. Actualizar Inventario
                await client.query(`
          UPDATE inventario_sucursal 
          SET stock_actual = $1, updated_at = CURRENT_TIMESTAMP
          WHERE producto_id = $2 AND sucursal_id = $3
        `, [ajuste.cantidad_real, ajuste.producto_id, sucursalId]);

                // 3. Registrar Movimiento (Eventualidad o Log)
                // Por ahora usamos sync_log como auditoría simple, idealmente una tabla movimientos_inventario
                await client.query(`
          INSERT INTO sync_log (sucursal_id, entidad, operacion, mensaje_error)
          VALUES ($1, 'inventario', 'ajuste', $2)
        `, [sucursalId, `Ajuste manual por empleado ${empleadoId}: ${diferencia} unidades. Motivo: ${ajuste.motivo}`]);
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
    // --- TRANSFERENCIAS ---

    async crearTransferencia(data) {
        const { sucursal_origen_id, sucursal_destino_id, usuario_id, items, tipo = 'envio', observaciones } = data;
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Crear cabecera
            const resHeader = await client.query(`
                INSERT INTO transferencias_inventario 
                (sucursal_origen_id, sucursal_destino_id, usuario_id, tipo, estado, observaciones)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, [sucursal_origen_id, sucursal_destino_id, usuario_id, tipo, tipo === 'envio' ? 'en_transito' : 'solicitada', observaciones]);

            const transferenciaId = resHeader.rows[0].id;

            // 2. Insertar detalles
            for (const item of items) {
                await client.query(`
                    INSERT INTO transferencias_detalles (transferencia_id, producto_id, cantidad_solicitada, cantidad_enviada)
                    VALUES ($1, $2, $3, $4)
                `, [transferenciaId, item.producto_id, item.cantidad, tipo === 'envio' ? item.cantidad : 0]);

                // Si es ENVIO directo (push), descontar stock origen de una vez
                if (tipo === 'envio') {
                    // Descontar de Origen
                    await client.query(`
                        UPDATE inventario_sucursal
                        SET stock_actual = stock_actual - $1, updated_at = CURRENT_TIMESTAMP
                        WHERE sucursal_id = $2 AND producto_id = $3
                    `, [item.cantidad, sucursal_origen_id, item.producto_id]);

                    // Registrar Movimiento Salida
                    await client.query(`
                        INSERT INTO movimientos_inventario 
                        (sucursal_id, producto_id, tipo_movimiento, cantidad, referencia_id, usuario_id, observaciones)
                        VALUES ($1, $2, 'transferencia_salida', $3, $4, $5, 'Envío a sucursal ' || $6)
                    `, [sucursal_origen_id, item.producto_id, item.cantidad, transferenciaId, usuario_id, sucursal_destino_id]);
                }
            }

            await client.query('COMMIT');
            return { id: transferenciaId, message: 'Transferencia creada' };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getTransferencias(filtros = {}) {
        const { sucursal_id, estado, tipo } = filtros;
        let query = `
            SELECT t.*, 
                   so.nombre as origen_nombre, 
                   sd.nombre as destino_nombre,
                   (SELECT COUNT(*) FROM transferencias_detalles d WHERE d.transferencia_id = t.id) as total_items
            FROM transferencias_inventario t
            JOIN sucursales so ON t.sucursal_origen_id = so.id
            JOIN sucursales sd ON t.sucursal_destino_id = sd.id
            WHERE 1=1
        `;
        const params = [];

        if (sucursal_id) {
            query += ` AND (t.sucursal_origen_id = $${params.length + 1} OR t.sucursal_destino_id = $${params.length + 1})`;
            params.push(sucursal_id);
        }
        if (estado) {
            query += ` AND t.estado = $${params.length + 1}`;
            params.push(estado);
        }

        query += ` ORDER BY t.fecha_creacion DESC`;

        const result = await pool.query(query, params);
        return result.rows;
    }

    async getTransferenciaById(id) {
        const header = await pool.query(`
            SELECT t.*, so.nombre as origen_nombre, sd.nombre as destino_nombre 
            FROM transferencias_inventario t
            JOIN sucursales so ON t.sucursal_origen_id = so.id
            JOIN sucursales sd ON t.sucursal_destino_id = sd.id
            WHERE t.id = $1
        `, [id]);

        if (header.rows.length === 0) return null;

        const details = await pool.query(`
            SELECT d.*, p.nombre as producto_nombre, p.codigo as sku
            FROM transferencias_detalles d
            JOIN productos_catalogo p ON d.producto_id = p.id
            WHERE d.transferencia_id = $1
        `, [id]);

        return { ...header.rows[0], items: details.rows };
    }

    async aprobarTransferencia(id, userId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const transRes = await client.query('SELECT * FROM transferencias_inventario WHERE id = $1', [id]);
            const transferencia = transRes.rows[0];

            if (!transferencia || transferencia.estado !== 'solicitada') {
                throw new Error('Transferencia no válida para aprobación (debe estar en estado "solicitada")');
            }

            const detailsRes = await client.query('SELECT * FROM transferencias_detalles WHERE transferencia_id = $1', [id]);
            const items = detailsRes.rows;

            for (const item of items) {
                // Descontar de Origen
                await client.query(`
                    UPDATE inventario_sucursal
                    SET stock_actual = stock_actual - $1, updated_at = CURRENT_TIMESTAMP
                    WHERE sucursal_id = $2 AND producto_id = $3
                `, [item.cantidad_solicitada, transferencia.sucursal_origen_id, item.producto_id]);

                // Registrar Movimiento Salida
                await client.query(`
                    INSERT INTO movimientos_inventario 
                    (sucursal_id, producto_id, tipo_movimiento, cantidad, referencia_id, usuario_id, observaciones)
                    VALUES ($1, $2, 'transferencia_salida', $3, $4, $5, 'Envío aprobado para sucursal ' || $6)
                `, [transferencia.sucursal_origen_id, item.producto_id, item.cantidad_solicitada, id, userId, transferencia.sucursal_destino_id]);

                // Marcar cantidad enviada
                await client.query(`
                    UPDATE transferencias_detalles
                    SET cantidad_enviada = $1
                    WHERE id = $2
                `, [item.cantidad_solicitada, item.id]);
            }

            // Actualizar estado Transferencia
            await client.query(`
                UPDATE transferencias_inventario 
                SET estado = 'en_transito', fecha_envio = CURRENT_TIMESTAMP 
                WHERE id = $1
            `, [id]);

            await client.query('COMMIT');
            return { success: true };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async confirmarRecepcion(id, itemsRecibidos, userId) {
        // itemsRecibidos: [{ producto_id, cantidad_recibida }]
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const transRes = await client.query('SELECT * FROM transferencias_inventario WHERE id = $1', [id]);
            const transferencia = transRes.rows[0];

            if (!transferencia || transferencia.estado === 'completada') {
                throw new Error('Transferencia inválida o ya completada');
            }

            for (const item of itemsRecibidos) {
                // Actualizar detalle
                await client.query(`
                    UPDATE transferencias_detalles 
                    SET cantidad_recibida = $1 
                    WHERE transferencia_id = $2 AND producto_id = $3
                `, [item.cantidad_recibida, id, item.producto_id]);

                // Sumar al Stock Destino (UPSERT)
                // SQLite note: upsert query might differ slightly depending on version, but `INSERT ... ON CONFLICT` is standard enough.
                // Assuming `inventario_sucursal` has UNIQUE(sucursal_id, producto_id)
                await client.query(`
                    INSERT INTO inventario_sucursal (sucursal_id, producto_id, stock_actual)
                    VALUES ($1, $2, $3)
                    ON CONFLICT(sucursal_id, producto_id) 
                    DO UPDATE SET stock_actual = inventario_sucursal.stock_actual + $3, updated_at = CURRENT_TIMESTAMP
                `, [transferencia.sucursal_destino_id, item.producto_id, item.cantidad_recibida]);

                // Registrar Movimiento Entrada
                await client.query(`
                    INSERT INTO movimientos_inventario 
                    (sucursal_id, producto_id, tipo_movimiento, cantidad, referencia_id, usuario_id, observaciones)
                    VALUES ($1, $2, 'transferencia_entrada', $3, $4, $5, 'Recepción de sucursal ' || $6)
                `, [transferencia.sucursal_destino_id, item.producto_id, item.cantidad_recibida, id, userId, transferencia.sucursal_origen_id]);
            }

            // Actualizar estado Transferencia
            await client.query(`
                UPDATE transferencias_inventario 
                SET estado = 'completada', fecha_recepcion = CURRENT_TIMESTAMP 
                WHERE id = $1
            `, [id]);

            await client.query('COMMIT');
            return { success: true };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // --- GLOBAL VIEW FOR PROCUREMENT ---
    async getGlobalStock() {
        const query = `
            SELECT 
                p.id, p.codigo as sku, p.nombre, p.categoria,
                COALESCE(SUM(i.stock_actual), 0) as stock_global_total
            FROM productos_catalogo p
            LEFT JOIN inventario_sucursal i ON p.id = i.producto_id
            GROUP BY p.id, p.codigo, p.nombre, p.categoria
            ORDER BY stock_global_total ASC
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    async getStockPorSucursal(productoId) {
        // Obtener todas las sucursales activas y unir con el inventario de este producto
        const query = `
            SELECT 
                s.id as sucursal_id, 
                s.nombre as sucursal_nombre,
                COALESCE(i.stock_actual, 0) as stock_actual,
                COALESCE(i.stock_minimo, 0) as stock_minimo
            FROM sucursales s
            LEFT JOIN inventario_sucursal i ON s.id = i.sucursal_id AND i.producto_id = $1
            WHERE s.activo = 1
            ORDER BY s.id ASC
        `;
        const result = await pool.query(query, [productoId]);
        return result.rows;
    }
}


module.exports = new InventarioService();
