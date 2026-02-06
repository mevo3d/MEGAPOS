const { pool } = require('../config/db');
const logger = require('../config/logger');

class TraspasosService {

    async solicitarTraspaso(data) {
        const { origen_sucursal_id, destino_sucursal_id, usuario_solicita_id, items, notas } = data;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Crear Cabecera
            const res = await client.query(`
                INSERT INTO traspasos (origen_sucursal_id, destino_sucursal_id, usuario_solicita_id, estado, notas)
                VALUES ($1, $2, $3, 'pendiente', $4)
                RETURNING id
            `, [origen_sucursal_id, destino_sucursal_id, usuario_solicita_id, notas]);

            const traspasoId = res.rows[0].id;

            // 2. Insertar Detalles
            for (const item of items) {
                await client.query(`
                    INSERT INTO traspasos_detalle (traspaso_id, producto_id, cantidad_solicitada)
                    VALUES ($1, $2, $3)
                `, [traspasoId, item.producto_id, item.cantidad]);
            }

            await client.query('COMMIT');
            return { id: traspasoId, ...data };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getTraspasos(sucursalId) {
        // Traer traspasos donde la sucursal es origen O destino
        const query = `
            SELECT t.*, 
                so.nombre as origen_nombre, sd.nombre as destino_nombre,
                u.nombre as solicitante
            FROM traspasos t
            JOIN sucursales so ON t.origen_sucursal_id = so.id
            JOIN sucursales sd ON t.destino_sucursal_id = sd.id
            LEFT JOIN empleados u ON t.usuario_solicita_id = u.id
            WHERE t.origen_sucursal_id = $1 OR t.destino_sucursal_id = $1
            ORDER BY t.created_at DESC
        `;
        const res = await pool.query(query, [sucursalId]); // Note: created_at might be fecha_solicitud based on schema
        return res.rows;
    }

    async getTraspasoById(id) {
        const res = await pool.query(`
            SELECT t.*, 
                so.nombre as origen_nombre, sd.nombre as destino_nombre
            FROM traspasos t
            JOIN sucursales so ON t.origen_sucursal_id = so.id
            JOIN sucursales sd ON t.destino_sucursal_id = sd.id
            WHERE t.id = $1
        `, [id]);

        if (res.rows.length === 0) return null;

        const detalles = await pool.query(`
            SELECT td.*, p.nombre as producto_nombre, p.sku
            FROM traspasos_detalle td
            JOIN productos p ON td.producto_id = p.id
            WHERE td.traspaso_id = $1
        `, [id]);

        return { ...res.rows[0], items: detalles.rows };
    }

    async aprobarTraspaso(id, usuario_aprueba_id) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const traspaso = await this.getTraspasoById(id);
            if (!traspaso) throw new Error('Traspaso no encontrado');

            // Restar inventario en ORIGEN (quien envía, usualmente CEDIS)
            // Wait: Solicitud de A a B. A pide. B envía.
            // Si A solicita a CEDIS: origen=A, destino=CEDIS? No.
            // USUALMENTE: Origen = De donde sale la mercancía. Destino = A donde llega.
            // Si Tienda Solicita: Origen=CEDIS, Destino=Tienda.

            // Asumiremos: 
            // - Origen: De donde sale la mercancia (CEDIS)
            // - Destino: Quien la recibe (Tienda)
            // Al aprobar (CEDIS aprueba salida): Se resta de Origen.

            for (const item of traspaso.items) {
                // Check stock origen
                const stockRes = await client.query(
                    'SELECT stock_actual FROM inventario_sucursal WHERE producto_id=$1 AND sucursal_id=$2',
                    [item.producto_id, traspaso.origen_sucursal_id]
                );
                const stockActual = stockRes.rows[0]?.stock_fisico || 0;

                // Cantidad enviada = solicitada (por simplicidad, o permitir editar)
                const cantidadEnviar = item.cantidad_solicitada;

                if (stockActual < cantidadEnviar) {
                    throw new Error(`Stock insuficiente en origen para producto ${item.producto_nombre}`);
                }

                // Restar stock
                await client.query(`
                    UPDATE inventario SET stock_fisico = stock_fisico - $1 
                    WHERE producto_id=$2 AND sucursal_id=$3
                `, [cantidadEnviar, item.producto_id, traspaso.origen_sucursal_id]);

                // Actualizar detalle
                await client.query(`
                    UPDATE traspasos_detalle SET cantidad_enviada = $1
                    WHERE id = $2
                `, [cantidadEnviar, item.id]);
            }

            // Actualizar Cabecera
            await client.query(`
                UPDATE traspasos 
                SET estado = 'en_camino', usuario_aprueba_id = $1, fecha_envio = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [usuario_aprueba_id, id]);

            await client.query('COMMIT');
            return true;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async recibirTraspaso(id, usuario_recibe_id) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const traspaso = await this.getTraspasoById(id);
            if (!traspaso) throw new Error('Traspaso no encontrado');

            // Sumar inventario en DESTINO
            for (const item of traspaso.items) {
                const cantidadRecibida = item.cantidad_enviada; // Asumimos recepción completa

                // Upsert inventario destino
                // (Simplified logic: Update OR Insert if not exists - assuming inventory row exists usually)
                const exists = await client.query(
                    'SELECT id FROM inventario_sucursal WHERE producto_id=$1 AND sucursal_id=$2',
                    [item.producto_id, traspaso.destino_sucursal_id]
                );

                if (exists.rows.length > 0) {
                    await client.query(`
                        UPDATE inventario SET stock_fisico = stock_fisico + $1 
                        WHERE producto_id=$2 AND sucursal_id=$3
                    `, [cantidadRecibida, item.producto_id, traspaso.destino_sucursal_id]);
                } else {
                    await client.query(`
                        INSERT INTO inventario (sucursal_id, producto_id, stock_fisico)
                        VALUES ($1, $2, $3)
                    `, [traspaso.destino_sucursal_id, item.producto_id, cantidadRecibida]);
                }

                await client.query(`
                    UPDATE traspasos_detalle SET cantidad_recibida = $1
                    WHERE id = $2
                `, [cantidadRecibida, item.id]);
            }

            await client.query(`
                UPDATE traspasos 
                SET estado = 'recibido', usuario_recibe_id = $1, fecha_recepcion = CURRENT_TIMESTAMP
                WHERE id = $2
            `, [usuario_recibe_id, id]);

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

module.exports = new TraspasosService();
