const { pool } = require('../config/db');
const logger = require('../config/logger');

const getRecepciones = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, 
                   p.nombre as proveedor_nombre,
                   s.nombre as sucursal_nombre,
                   u.nombre as usuario_nombre
            FROM recepciones r
            LEFT JOIN ordenes_compra oc ON r.orden_compra_id = oc.id
            LEFT JOIN proveedores p ON oc.proveedor_id = p.id
            LEFT JOIN sucursales s ON r.sucursal_id = s.id
            LEFT JOIN empleados u ON r.usuario_recibio_id = u.id
            ORDER BY r.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error al obtener recepciones:', error);
        res.status(500).json({ message: 'Error obteniendo recepciones' });
    }
};

const getRecepcionById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT r.*, 
                   oc.id as orden_folio,
                   p.nombre as proveedor_nombre
            FROM recepciones r
            LEFT JOIN ordenes_compra oc ON r.orden_compra_id = oc.id
            LEFT JOIN proveedores p ON oc.proveedor_id = p.id
            WHERE r.id = $1
        `, [id]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'Recepción no encontrada' });

        const detalles = await pool.query(`
            SELECT rd.*, pc.nombre as producto_nombre, pc.codigo
            FROM recepciones_detalles rd
            JOIN productos_catalogo pc ON rd.producto_id = pc.id
            WHERE rd.recepcion_id = $1
        `, [id]);

        res.json({ ...result.rows[0], items: detalles.rows });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener detalle de recepción' });
    }
};

const createRecepcion = async (req, res) => {
    const client = pool; // En pg usaríamos client del pool, aquí pool directo para sqlite
    // Nota: Para transacciones reales en SQLite con este wrapper, usamos BEGIN/COMMIT manuales.

    try {
        const { orden_compra_id, sucursal_id, usuario_id, factura_proveedor, observaciones, items } = req.body;

        if (!items || items.length === 0) return res.status(400).json({ message: 'No hay items para recibir' });

        // 1. Iniciar Transacción
        await client.query('BEGIN TRANSACTION');

        // 2. Crear Header Recepción
        const recepcionResult = await client.query(`
            INSERT INTO recepciones (orden_compra_id, sucursal_id, usuario_recibio_id, factura_proveedor, observaciones, estado)
            VALUES ($1, $2, $3, $4, $5, 'finalizada')
        `, [orden_compra_id, sucursal_id, usuario_id, factura_proveedor, observaciones]);

        const recepcionId = recepcionResult.id;

        if (!recepcionId) throw new Error("No se pudo generar ID de recepción");

        // 3. Procesar Items
        for (const item of items) {
            const { producto_id, cantidad_recibida, lote, fecha_caducidad, costo_nuevo } = item;

            if (cantidad_recibida > 0) {
                // a. Insertar detalle recepción
                await client.query(`
                    INSERT INTO recepciones_detalles (recepcion_id, producto_id, cantidad_recibida, lote, fecha_caducidad)
                    VALUES ($1, $2, $3, $4, $5)
                `, [recepcionId, producto_id, cantidad_recibida, lote, fecha_caducidad]);

                // b. Actualizar Inventario (Upsert)
                // SQLite: INSERT OR REPLACE no suma, reemplaza. Usamos ON CONFLICT.
                await client.query(`
                    INSERT INTO inventario_sucursal (sucursal_id, producto_id, stock_actual, stock_minimo)
                    VALUES ($1, $2, $3, 0)
                    ON CONFLICT(sucursal_id, producto_id) 
                    DO UPDATE SET stock_actual = stock_actual + $3, updated_at = CURRENT_TIMESTAMP
                `, [sucursal_id, producto_id, cantidad_recibida]);

                // c. Registrar Movimiento Kardex
                await client.query(`
                    INSERT INTO movimientos_inventario (sucursal_id, producto_id, tipo_movimiento, cantidad, referencia_id, usuario_id, observaciones)
                    VALUES ($1, $2, 'entrada_compra', $3, $4, $5, $6)
                `, [sucursal_id, producto_id, cantidad_recibida, recepcionId, usuario_id, `Recepción Orden #${orden_compra_id}`]);

                // d. Registrar cantidar recibida en la Orden
                if (orden_compra_id) {
                    await client.query(`
                        UPDATE ordenes_compra_detalles 
                        SET cantidad_recibida = cantidad_recibida + $1
                        WHERE orden_id = $2 AND producto_id = $3
                    `, [cantidad_recibida, orden_compra_id, producto_id]);
                }

                // e. Actualizar costo en catálogo si cambio (Promedio o Último? Usaremos Último según práctica común retail)
                if (costo_nuevo) {
                    await client.query(`UPDATE productos_catalogo SET precio_compra = $1 WHERE id = $2`, [costo_nuevo, producto_id]);
                }
            }
        }

        // 4. Actualizar Estado de Orden de Compra
        if (orden_compra_id) {
            // Verificar si todo fue recibido
            const ordenDetalles = await client.query(`
                SELECT cantidad_solicitada, cantidad_recibida FROM ordenes_compra_detalles WHERE orden_id = $1
            `, [orden_compra_id]);

            const allReceived = ordenDetalles.rows.every(row => row.cantidad_recibida >= row.cantidad_solicitada);
            const newState = allReceived ? 'recibida_total' : 'recibida_parcial';

            await client.query(`UPDATE ordenes_compra SET estado = $1 WHERE id = $2`, [newState, orden_compra_id]);
        }

        await client.query('COMMIT');

        res.status(201).json({ success: true, message: 'Recepción procesada correctamente', recepcion_id: recepcionId });

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error creando recepción:', error);
        res.status(500).json({ message: 'Error procesando la recepción', error: error.message });
    }
};

module.exports = {
    getRecepciones,
    getRecepcionById,
    createRecepcion
};
