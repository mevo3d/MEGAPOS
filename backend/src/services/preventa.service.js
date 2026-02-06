const { pool } = require('../config/db');
const logger = require('../config/logger');

const crearPreventa = async (sucursalId, cajaId, empleadoId, clienteId, notas) => {
    // Generar folio simple: PRE-TIME
    const folio = `PRE-${Date.now()}`;

    const result = await pool.query(
        `INSERT INTO pedidos 
        (sucursal_id, punto_venta_origen_id, empleado_id, cliente_id, estado, notas) 
        VALUES ($1, $2, $3, $4, 'preparando', $5)`,
        [sucursalId, cajaId, empleadoId, clienteId || 1, notas]
    );

    const insertId = result.id || result.insertId;
    const pedido = await pool.query("SELECT * FROM pedidos WHERE id = $1", [insertId]);
    return pedido.rows[0];
};

const agregarItems = async (pedidoId, items) => {
    // items: array of { producto_id, cantidad, precio_unitario }
    for (const item of items) {
        const subtotal = item.cantidad * item.precio_unitario;
        await pool.query(
            `INSERT INTO pedidos_items (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
             VALUES ($1, $2, $3, $4, $5)`,
            [pedidoId, item.producto_id, item.cantidad, item.precio_unitario, subtotal]
        );
    }

    // Actualizar total del pedido
    await pool.query(
        `UPDATE pedidos 
         SET total = (SELECT SUM(subtotal) FROM pedidos_items WHERE pedido_id = $1)
         WHERE id = $1`,
        [pedidoId]
    );

    return { success: true };
};

const enviarACobro = async (pedidoId) => {
    await pool.query(
        "UPDATE pedidos SET estado = 'enviado_caja', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [pedidoId]
    );
    return { success: true };
};

const getPreventasPendientes = async (sucursalId) => {
    const result = await pool.query(
        `SELECT p.*, e.nombre as empleado_nombre, c.nombre as cliente_nombre
         FROM pedidos p
         JOIN empleados e ON p.empleado_id = e.id
         LEFT JOIN clientes c ON p.cliente_id = c.id
         WHERE p.sucursal_id = $1 AND p.estado = 'enviado_caja'
         ORDER BY p.created_at DESC`,
        [sucursalId]
    );
    return result.rows;
};

const getPedidoDetalle = async (pedidoId) => {
    const pedido = await pool.query(
        `SELECT p.*, c.nombre as cliente_nombre 
         FROM pedidos p 
         LEFT JOIN clientes c ON p.cliente_id = c.id 
         WHERE p.id = $1`,
        [pedidoId]
    );

    const items = await pool.query(
        `SELECT pi.*, pc.nombre as producto_nombre, pc.codigo as sku
         FROM pedidos_items pi
         JOIN productos_catalogo pc ON pi.producto_id = pc.id
         WHERE pi.pedido_id = $1`,
        [pedidoId]
    );

    return {
        ...pedido.rows[0],
        items: items.rows
    };
};

module.exports = {
    crearPreventa,
    agregarItems,
    enviarACobro,
    getPreventasPendientes,
    getPedidoDetalle
};
