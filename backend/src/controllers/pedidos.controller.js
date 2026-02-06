const { pool } = require('../config/db');
const logger = require('../config/logger');

// Obtener pedidos por sucursal
const getPedidosBySucursal = async (req, res) => {
    try {
        const { sucursalId } = req.params;
        const { estado, estado_pago } = req.query;

        let query = `
            SELECT
                p.*,
                e.nombre as empleado_nombre,
                pv.nombre as punto_venta_origen
            FROM pedidos p
            LEFT JOIN empleados e ON p.empleado_id = e.id
            LEFT JOIN puntos_venta pv ON p.punto_venta_origen_id = pv.id
            WHERE p.sucursal_id = $1
        `;

        const params = [sucursalId];

        if (estado) {
            params.push(estado);
            query += ` AND p.estado = $${params.length}`;
        }

        if (estado_pago) {
            params.push(estado_pago);
            query += ` AND p.estado_pago = $${params.length}`;
        }

        query += ` ORDER BY p.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error obteniendo pedidos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Crear nuevo pedido (preparación)
// Crear nuevo pedido (con soporte transaccional para items)
const createPedido = async (req, res) => {
    try {
        const { sucursal_id, punto_venta_origen_id, usuario_id, empleado_id, cliente_id, cliente_nombre, notas, items, total, estado } = req.body;
        const empId = usuario_id || empleado_id;
        const estadoInicial = estado || 'preparando';
        const totalPedido = total || 0;

        // Transaction Start
        await pool.query('BEGIN');

        try {
            // Insertar Pedido
            const insertResult = await pool.query(`
                INSERT INTO pedidos (sucursal_id, punto_venta_origen_id, empleado_id, cliente_id, cliente_nombre, notas, estado, total)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                sucursal_id || 1,
                punto_venta_origen_id,
                empId,
                cliente_id,
                cliente_nombre || 'Público General',
                notas,
                estadoInicial,
                totalPedido
            ]);

            const pedidoId = insertResult.id;
            const result = await pool.query('SELECT * FROM pedidos WHERE id = $1', [pedidoId]);
            const pedido = result.rows[0];

            // Insertar Items si existen
            if (items && Array.isArray(items) && items.length > 0) {
                for (const item of items) {
                    const subtotal = item.cantidad * item.precio_unitario;
                    await pool.query(`
                        INSERT INTO pedidos_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [pedidoId, item.producto_id, item.cantidad, item.precio_unitario, subtotal]);
                }
            }

            await pool.query('COMMIT');

            res.status(201).json({
                success: true,
                message: 'Pedido creado exitosamente',
                pedido: { ...pedido, items: items || [] }
            });
        } catch (innerError) {
            await pool.query('ROLLBACK');
            throw innerError;
        }

    } catch (error) {
        logger.error('Error creando pedido:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Agregar items (Legacy or updates) - keeping simplified
const addItemsToPedido = async (req, res) => {
    // ... existing implementation simplified or keep if needed, 
    // but createPedido now handles items. 
    // We'll leave it simple for now as frontend primarily uses createPedido with items.
    try {
        // ... (Simplified re-implementation)
        const { id } = req.params;
        const { items } = req.body;
        for (const item of items) {
            await pool.query(`INSERT INTO pedidos_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5)`,
                [id, item.producto_id, item.cantidad, item.precio_unitario, item.cantidad * item.precio_unitario]);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ message: 'Error adding items' }); }
};

// Enviar pedido a caja
const enviarACaja = async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(`
            UPDATE pedidos 
            SET estado = 'enviado_caja', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [id]);

        res.json({
            success: true,
            message: 'Pedido enviado a caja exitosamente'
        });
    } catch (error) {
        logger.error('Error enviando pedido a caja:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Obtener detalles de un pedido
const getPedidoById = async (req, res) => {
    try {
        const { id } = req.params;

        const pedidoResult = await pool.query(`
            SELECT p.*, e.nombre as empleado_nombre
            FROM pedidos p
            LEFT JOIN empleados e ON p.empleado_id = e.id
            WHERE p.id = $1
        `, [id]);

        if (pedidoResult.rows.length === 0) {
            return res.status(404).json({ message: 'Pedido no encontrado' });
        }

        const itemsResult = await pool.query(`
            SELECT pi.*, p.nombre as producto_nombre, p.codigo
            FROM pedidos_items pi
            LEFT JOIN productos_catalogo p ON pi.producto_id = p.id
            WHERE pi.pedido_id = $1
        `, [id]);

        const pedido = pedidoResult.rows[0];
        pedido.items = itemsResult.rows;

        res.json(pedido);
    } catch (error) {
        logger.error('Error obteniendo detalle de pedido:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Cobrar Pedido (Venta + Inventario)
const cobrarPedido = async (req, res) => {
    try {
        const { id } = req.params;
        const { metodo_pago, monto_recibido, cambio } = req.body;

        // Transaction Start
        await pool.query('BEGIN');

        try {
            // 1. Get Pedido Info
            const pedidoRes = await pool.query('SELECT * FROM pedidos WHERE id = $1', [id]);
            if (pedidoRes.rows.length === 0) throw new Error('Pedido no encontrado');
            const pedido = pedidoRes.rows[0];

            if (pedido.estado === 'completado') throw new Error('El pedido ya fue cobrado');

            const itemsRes = await pool.query('SELECT * FROM pedidos_items WHERE pedido_id = $1', [id]);
            const items = itemsRes.rows;

            // 2. Insertar Venta
            const insertVentaRes = await pool.query(`
                INSERT INTO ventas (sucursal_id, cliente_id, usuario_id, total, metodo_pago, fecha_venta)
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            `, [pedido.sucursal_id, pedido.cliente_id, req.user?.id || pedido.empleado_id, pedido.total, metodo_pago]);

            const ventaId = insertVentaRes.id;

            // 3. Procesar Items (Detalle Venta + Inventario)
            for (const item of items) {
                // Detalle Venta
                await pool.query(`
                    INSERT INTO ventas_detalle (venta_id, producto_id, cantidad, precio_unitario, subtotal)
                    VALUES ($1, $2, $3, $4, $5)
                `, [ventaId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal]);

                // Descontar Inventario
                await pool.query(`
                    UPDATE inventario 
                    SET cantidad = cantidad - $1, updated_at = CURRENT_TIMESTAMP
                    WHERE producto_id = $2 AND sucursal_id = $3
                `, [item.cantidad, item.producto_id, pedido.sucursal_id]);

                // Registrar Movimiento Inventario
                await pool.query(`
                   INSERT INTO movimientos_inventario (producto_id, sucursal_id, usuario_id, tipo_movimiento, cantidad, referencia, motivo)
                   VALUES ($1, $2, $3, 'salida', $4, $5, 'Venta POS')
                `, [item.producto_id, pedido.sucursal_id, req.user?.id || pedido.empleado_id, item.cantidad, `Ref: Venta #${ventaId}`]);
            }

            // 4. Update Pedido Status
            await pool.query(`
                UPDATE pedidos 
                SET estado = 'completado', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [id]);

            await pool.query('COMMIT');

            res.json({ success: true, message: 'Cobro registrado y stock actualizado', venta_id: ventaId });

        } catch (innerError) {
            await pool.query('ROLLBACK');
            throw innerError;
        }
    } catch (error) {
        logger.error('Error cobrando pedido:', error);
        res.status(500).json({ message: 'Error al procesar cobro: ' + error.message });
    }
};

module.exports = {
    getPedidosBySucursal,
    createPedido,
    addItemsToPedido,
    enviarACaja,
    getPedidoById,
    cobrarPedido
};
