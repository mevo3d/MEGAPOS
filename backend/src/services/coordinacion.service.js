const { pool } = require('../config/db');
const logger = require('../config/logger');

// Detectar si estamos usando SQLite
const isSQLite = process.env.USE_SQLITE === 'true';

class CoordinacionService {
    // ====================================================
    // HELPER para generar folio
    // ====================================================
    _generateFolio() {
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
        return `PED-${year}-${random}`;
    }

    // ====================================================
    // PEDIDOS
    // ====================================================

    // Crear nuevo pedido
    async crearPedido(data) {
        try {
            const {
                sucursal_origen_id,
                empleado_solicitante_id,
                cliente_id,
                direccion_entrega,
                lat_entrega,
                lng_entrega,
                referencia_entrega,
                contacto_entrega,
                telefono_entrega,
                fecha_entrega_estimada,
                metodo_pago,
                prioridad,
                origen,
                notas,
                items = []
            } = data;

            // Calcular totales
            let subtotal = 0;
            let impuestos = 0;
            const costo_envio = data.costo_envio || 0;
            const descuento = data.descuento || 0;

            for (const item of items) {
                const itemSubtotal = (item.cantidad * item.precio_unitario) - (item.descuento_unitario || 0);
                subtotal += itemSubtotal;
                impuestos += itemSubtotal * 0.16;
            }

            const total = subtotal + impuestos + costo_envio - descuento;
            const folio = this._generateFolio();

            // Insertar pedido
            const pedidoResult = await pool.query(`
                INSERT INTO pedidos_coordinacion (
                    folio, sucursal_origen_id, empleado_solicitante_id, cliente_id,
                    direccion_entrega, lat_entrega, lng_entrega, referencia_entrega,
                    contacto_entrega, telefono_entrega, fecha_entrega_estimada,
                    subtotal, impuestos, costo_envio, descuento, total,
                    prioridad, metodo_pago, origen, notas, estado
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')
            `, [
                folio, sucursal_origen_id, empleado_solicitante_id, cliente_id,
                direccion_entrega, lat_entrega, lng_entrega, referencia_entrega,
                contacto_entrega, telefono_entrega, fecha_entrega_estimada,
                subtotal, impuestos, costo_envio, descuento, total,
                prioridad || 'normal', metodo_pago, origen || 'telemarketing', notas
            ]);

            const pedidoId = pedidoResult.lastID || pedidoResult.insertId;

            // Insertar items
            for (const item of items) {
                const prodResult = await pool.query(
                    'SELECT nombre, sku FROM productos WHERE id = ?',
                    [item.producto_id]
                );
                const producto = prodResult.rows?.[0] || prodResult[0];

                const itemSubtotal = (item.cantidad * item.precio_unitario) - (item.descuento_unitario || 0);

                await pool.query(`
                    INSERT INTO pedidos_coordinacion_detalle (
                        pedido_id, producto_id, cantidad, precio_unitario,
                        descuento_unitario, subtotal, nombre_producto, sku, notas
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    pedidoId, item.producto_id, item.cantidad, item.precio_unitario,
                    item.descuento_unitario || 0, itemSubtotal,
                    producto?.nombre || 'Producto', producto?.sku || '', item.notas || null
                ]);
            }

            // Registrar en historial
            await pool.query(`
                INSERT INTO pedidos_historial (pedido_id, estado_nuevo, empleado_id, notas)
                VALUES (?, 'pendiente', ?, 'Pedido creado')
            `, [pedidoId, empleado_solicitante_id]);

            logger.info(`Pedido creado: ${folio}`);
            return { success: true, pedido: { id: pedidoId, folio } };

        } catch (error) {
            logger.error('Error creando pedido:', error);
            throw error;
        }
    }

    // Obtener pedidos con filtros
    async getPedidos(filtros = {}) {
        const { estado, rutero_id, sucursal_id, cliente_id, fecha_desde, fecha_hasta, origen, limit = 50, offset = 0 } = filtros;

        let query = `
            SELECT 
                p.*,
                c.nombre as cliente_nombre,
                c.telefono as cliente_telefono,
                s.nombre as sucursal_nombre,
                es.nombre as solicitante_nombre,
                er.nombre as rutero_nombre,
                ea.nombre as aprobador_nombre
            FROM pedidos_coordinacion p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN sucursales s ON p.sucursal_origen_id = s.id
            LEFT JOIN empleados es ON p.empleado_solicitante_id = es.id
            LEFT JOIN empleados er ON p.rutero_asignado_id = er.id
            LEFT JOIN empleados ea ON p.aprobado_por_id = ea.id
            WHERE 1=1
        `;

        const params = [];

        if (estado) {
            query += ` AND p.estado = ?`;
            params.push(estado);
        }
        if (rutero_id) {
            query += ` AND p.rutero_asignado_id = ?`;
            params.push(rutero_id);
        }
        if (sucursal_id) {
            query += ` AND p.sucursal_origen_id = ?`;
            params.push(sucursal_id);
        }
        if (cliente_id) {
            query += ` AND p.cliente_id = ?`;
            params.push(cliente_id);
        }
        if (fecha_desde) {
            query += ` AND p.created_at >= ?`;
            params.push(fecha_desde);
        }
        if (fecha_hasta) {
            query += ` AND p.created_at <= ?`;
            params.push(fecha_hasta);
        }
        if (origen) {
            query += ` AND p.origen = ?`;
            params.push(origen);
        }

        query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows || result;
    }

    // Obtener pedido por ID con detalles
    async getPedidoById(id) {
        const pedidoResult = await pool.query(`
            SELECT 
                p.*,
                c.nombre as cliente_nombre,
                c.telefono as cliente_telefono,
                c.email as cliente_email,
                c.direccion as cliente_direccion,
                s.nombre as sucursal_nombre,
                es.nombre as solicitante_nombre,
                er.nombre as rutero_nombre,
                er.telefono as rutero_telefono,
                ea.nombre as aprobador_nombre
            FROM pedidos_coordinacion p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN sucursales s ON p.sucursal_origen_id = s.id
            LEFT JOIN empleados es ON p.empleado_solicitante_id = es.id
            LEFT JOIN empleados er ON p.rutero_asignado_id = er.id
            LEFT JOIN empleados ea ON p.aprobado_por_id = ea.id
            WHERE p.id = ?
        `, [id]);

        const rows = pedidoResult.rows || pedidoResult;
        if (rows.length === 0) {
            return null;
        }

        const pedido = rows[0];

        // Obtener items
        const itemsResult = await pool.query(`
            SELECT * FROM pedidos_coordinacion_detalle WHERE pedido_id = ?
        `, [id]);

        // Obtener historial
        const historialResult = await pool.query(`
            SELECT h.*, e.nombre as empleado_nombre
            FROM pedidos_historial h
            LEFT JOIN empleados e ON h.empleado_id = e.id
            WHERE h.pedido_id = ?
            ORDER BY h.created_at DESC
        `, [id]);

        return {
            ...pedido,
            items: itemsResult.rows || itemsResult,
            historial: historialResult.rows || historialResult
        };
    }

    // Aprobar pedido
    async aprobarPedido(pedidoId, empleadoId, notas = '') {
        try {
            const checkResult = await pool.query(
                'SELECT estado FROM pedidos_coordinacion WHERE id = ?',
                [pedidoId]
            );

            const rows = checkResult.rows || checkResult;
            if (rows.length === 0) {
                throw new Error('Pedido no encontrado');
            }

            if (rows[0].estado !== 'pendiente') {
                throw new Error('El pedido no está en estado pendiente');
            }

            await pool.query(`
                UPDATE pedidos_coordinacion 
                SET estado = 'aprobado', aprobado_por_id = ?, fecha_aprobacion = datetime('now')
                WHERE id = ?
            `, [empleadoId, pedidoId]);

            await pool.query(`
                INSERT INTO pedidos_historial (pedido_id, estado_anterior, estado_nuevo, empleado_id, notas)
                VALUES (?, 'pendiente', 'aprobado', ?, ?)
            `, [pedidoId, empleadoId, notas || 'Pedido aprobado']);

            logger.info(`Pedido ${pedidoId} aprobado por empleado ${empleadoId}`);
            return { success: true, message: 'Pedido aprobado' };

        } catch (error) {
            throw error;
        }
    }

    // Rechazar pedido
    async rechazarPedido(pedidoId, empleadoId, motivo) {
        try {
            await pool.query(`
                UPDATE pedidos_coordinacion 
                SET estado = 'cancelado', aprobado_por_id = ?, fecha_aprobacion = datetime('now'), motivo_rechazo = ?
                WHERE id = ?
            `, [empleadoId, motivo, pedidoId]);

            await pool.query(`
                INSERT INTO pedidos_historial (pedido_id, estado_anterior, estado_nuevo, empleado_id, notas)
                VALUES (?, 'pendiente', 'cancelado', ?, ?)
            `, [pedidoId, empleadoId, `Rechazado: ${motivo}`]);

            return { success: true, message: 'Pedido rechazado' };

        } catch (error) {
            throw error;
        }
    }

    // Asignar rutero
    async asignarRutero(pedidoId, ruteroId, rutaId, empleadoId, fechaEntregaEstimada) {
        try {
            const estadoResult = await pool.query(
                'SELECT estado FROM pedidos_coordinacion WHERE id = ?',
                [pedidoId]
            );
            const rows = estadoResult.rows || estadoResult;
            const estadoAnterior = rows[0]?.estado;

            await pool.query(`
                UPDATE pedidos_coordinacion 
                SET rutero_asignado_id = ?, ruta_asignada_id = ?, fecha_asignacion = datetime('now'),
                    fecha_entrega_estimada = ?, estado = 'preparando'
                WHERE id = ?
            `, [ruteroId, rutaId, fechaEntregaEstimada, pedidoId]);

            await pool.query(`
                INSERT INTO pedidos_historial (pedido_id, estado_anterior, estado_nuevo, empleado_id, notas)
                VALUES (?, ?, 'preparando', ?, ?)
            `, [pedidoId, estadoAnterior, empleadoId, `Asignado a rutero ID ${ruteroId}`]);

            return { success: true, message: 'Rutero asignado' };

        } catch (error) {
            throw error;
        }
    }

    // Cambiar estado del pedido
    async cambiarEstado(pedidoId, nuevoEstado, empleadoId, notas = '', ubicacion = null) {
        try {
            const estadoResult = await pool.query(
                'SELECT estado FROM pedidos_coordinacion WHERE id = ?',
                [pedidoId]
            );
            const rows = estadoResult.rows || estadoResult;
            const estadoAnterior = rows[0]?.estado;

            let updateQuery = `UPDATE pedidos_coordinacion SET estado = ? WHERE id = ?`;

            if (nuevoEstado === 'entregado') {
                updateQuery = `UPDATE pedidos_coordinacion SET estado = ?, fecha_entrega_real = datetime('now') WHERE id = ?`;
            }

            await pool.query(updateQuery, [nuevoEstado, pedidoId]);

            await pool.query(`
                INSERT INTO pedidos_historial (pedido_id, estado_anterior, estado_nuevo, empleado_id, notas, ubicacion_lat, ubicacion_lng)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [pedidoId, estadoAnterior, nuevoEstado, empleadoId, notas, ubicacion?.lat, ubicacion?.lng]);

            return { success: true, message: `Estado cambiado a ${nuevoEstado}` };

        } catch (error) {
            throw error;
        }
    }

    // ====================================================
    // TRACKING
    // ====================================================

    // Actualizar ubicación del rutero
    async actualizarUbicacionRutero(ruteroId, ubicacion) {
        const { lat, lng, velocidad, rumbo, precision_gps, bateria, estado, pedido_actual_id } = ubicacion;

        // Verificar si existe el registro
        const existsResult = await pool.query(
            'SELECT id FROM ruteros_ubicacion WHERE rutero_id = ?',
            [ruteroId]
        );
        const exists = (existsResult.rows || existsResult).length > 0;

        if (exists) {
            await pool.query(`
                UPDATE ruteros_ubicacion SET 
                    lat = ?, lng = ?, velocidad = ?, rumbo = ?,
                    precision_gps = ?, bateria = ?, estado = ?,
                    pedido_actual_id = ?, ultima_actualizacion = datetime('now')
                WHERE rutero_id = ?
            `, [lat, lng, velocidad, rumbo, precision_gps, bateria, estado, pedido_actual_id, ruteroId]);
        } else {
            await pool.query(`
                INSERT INTO ruteros_ubicacion (rutero_id, lat, lng, velocidad, rumbo, precision_gps, bateria, estado, pedido_actual_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [ruteroId, lat, lng, velocidad, rumbo, precision_gps, bateria, estado, pedido_actual_id]);
        }

        // Guardar en historial si hay pedido activo
        if (pedido_actual_id) {
            await pool.query(`
                INSERT INTO tracking_entregas (pedido_id, rutero_id, lat, lng, velocidad, rumbo, precision_gps, bateria, evento)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ubicacion')
            `, [pedido_actual_id, ruteroId, lat, lng, velocidad, rumbo, precision_gps, bateria]);
        }

        return { success: true };
    }

    // Obtener ubicaciones de todos los ruteros
    async getUbicacionesRuteros() {
        const result = await pool.query(`
            SELECT r.*, e.nombre as rutero_nombre, e.telefono as rutero_telefono,
                   p.folio as pedido_folio, p.cliente_id, c.nombre as cliente_nombre
            FROM ruteros_ubicacion r
            JOIN empleados e ON r.rutero_id = e.id
            LEFT JOIN pedidos_coordinacion p ON r.pedido_actual_id = p.id
            LEFT JOIN clientes c ON p.cliente_id = c.id
            WHERE r.ultima_actualizacion > datetime('now', '-1 hour')
        `);

        return result.rows || result;
    }

    // Obtener tracking de un pedido
    async getTrackingPedido(pedidoId) {
        const result = await pool.query(`
            SELECT * FROM tracking_entregas 
            WHERE pedido_id = ? 
            ORDER BY created_at ASC
        `, [pedidoId]);

        return result.rows || result;
    }

    // ====================================================
    // DASHBOARD Y ESTADÍSTICAS
    // ====================================================

    // Estadísticas de coordinación
    async getEstadisticasCoordinacion(filtros = {}) {
        try {
            const { fecha_desde, fecha_hasta } = filtros;

            let whereClause = 'WHERE 1=1';
            const params = [];

            if (fecha_desde) {
                whereClause += ` AND created_at >= ?`;
                params.push(fecha_desde);
            }
            if (fecha_hasta) {
                whereClause += ` AND created_at <= ?`;
                params.push(fecha_hasta);
            }

            // Totales por estado
            const estadosResult = await pool.query(`
                SELECT estado, COUNT(*) as cantidad, COALESCE(SUM(total), 0) as monto
                FROM pedidos_coordinacion ${whereClause}
                GROUP BY estado
            `, params);

            // Pedidos por origen
            const origenResult = await pool.query(`
                SELECT origen, COUNT(*) as cantidad
                FROM pedidos_coordinacion ${whereClause}
                GROUP BY origen
            `, params);

            // Top ruteros (simplificado para SQLite)
            const ruterosResult = await pool.query(`
                SELECT 
                    e.id, e.nombre,
                    COUNT(*) as total_entregas,
                    SUM(CASE WHEN p.estado = 'entregado' THEN 1 ELSE 0 END) as entregas_completadas
                FROM pedidos_coordinacion p
                JOIN empleados e ON p.rutero_asignado_id = e.id
                ${whereClause} AND p.rutero_asignado_id IS NOT NULL
                GROUP BY e.id, e.nombre
                ORDER BY entregas_completadas DESC
                LIMIT 10
            `, params);

            // Entregas por día (últimos 7 días)
            const entregasDiaResult = await pool.query(`
                SELECT 
                    DATE(created_at) as fecha,
                    COUNT(*) as total,
                    SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END) as completados,
                    SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes
                FROM pedidos_coordinacion
                WHERE created_at >= datetime('now', '-7 days')
                GROUP BY DATE(created_at)
                ORDER BY fecha DESC
            `);

            const estados = {};
            (estadosResult.rows || estadosResult).forEach(row => {
                estados[row.estado] = { cantidad: parseInt(row.cantidad), monto: parseFloat(row.monto) };
            });

            const origenes = {};
            (origenResult.rows || origenResult).forEach(row => {
                origenes[row.origen] = parseInt(row.cantidad);
            });

            return {
                estados,
                origenes,
                topRuteros: ruterosResult.rows || ruterosResult,
                entregasPorDia: entregasDiaResult.rows || entregasDiaResult
            };
        } catch (error) {
            logger.error('Error en getEstadisticasCoordinacion:', error);
            // Retornar valores vacíos en caso de error
            return {
                estados: {},
                origenes: {},
                topRuteros: [],
                entregasPorDia: []
            };
        }
    }

    // Obtener ruteros disponibles
    async getRuterosDisponibles() {
        try {
            const result = await pool.query(`
                SELECT 
                    e.id, e.nombre, e.telefono,
                    r.lat, r.lng, r.estado as estado_ubicacion, r.ultima_actualizacion
                FROM empleados e
                LEFT JOIN ruteros_ubicacion r ON e.id = r.rutero_id
                WHERE e.rol = 'rutero' AND e.activo = 1
                ORDER BY e.nombre
            `);

            return result.rows || result;
        } catch (error) {
            logger.error('Error en getRuterosDisponibles:', error);
            return [];
        }
    }

    // Obtener pedidos para el mapa
    async getPedidosParaMapa(filtros = {}) {
        const { estado } = filtros;

        let query = `
            SELECT 
                p.id, p.folio, p.estado, p.prioridad,
                p.lat_entrega, p.lng_entrega, p.direccion_entrega,
                c.nombre as cliente_nombre,
                e.nombre as rutero_nombre,
                p.fecha_entrega_estimada
            FROM pedidos_coordinacion p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN empleados e ON p.rutero_asignado_id = e.id
            WHERE p.lat_entrega IS NOT NULL AND p.lng_entrega IS NOT NULL
        `;

        const params = [];
        if (estado) {
            query += ` AND p.estado = ?`;
            params.push(estado);
        } else {
            query += ` AND p.estado NOT IN ('entregado', 'cancelado')`;
        }

        query += ` ORDER BY p.prioridad DESC, p.created_at ASC`;

        const result = await pool.query(query, params);
        return result.rows || result;
    }
}

module.exports = new CoordinacionService();
