const { pool } = require('../config/db');
const logger = require('../config/logger');

// Crear Orden de Compra
const createOrden = async (req, res) => {
    try {
        const { proveedor_id, sucursal_destino_id, items, observaciones, usuario_id } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'La orden debe tener al menos un producto' });
        }

        // Calcular total estimado
        let total_estimado = 0;
        items.forEach(item => {
            total_estimado += (item.cantidad * item.costo_unitario);
        });

        // Insertar cabecera
        const insertResult = await pool.query(`
            INSERT INTO ordenes_compra (proveedor_id, sucursal_destino_id, usuario_creador_id, total_estimado, observaciones, estado)
            VALUES ($1, $2, $3, $4, $5, 'borrador')
        `, [proveedor_id, sucursal_destino_id, usuario_id, total_estimado, observaciones]);

        const ordenId = insertResult.id;
        const result = await pool.query('SELECT * FROM ordenes_compra WHERE id = $1', [ordenId]);
        const orden = result.rows[0];

        // Insertar detalles
        for (const item of items) {
            await pool.query(`
                INSERT INTO ordenes_compra_detalles (orden_id, producto_id, cantidad_solicitada, costo_unitario, subtotal)
                VALUES ($1, $2, $3, $4, $5)
            `, [ordenId, item.producto_id, item.cantidad, item.costo_unitario, (item.cantidad * item.costo_unitario)]);
        }

        res.status(201).json({
            success: true,
            message: 'Orden de compra creada',
            orden: orden
        });

    } catch (error) {
        logger.error('Error creando orden de compra:', error);
        res.status(500).json({ message: 'Error interno al crear orden' });
    }
};

// Listar Órdenes
const getOrdenes = async (req, res) => {
    try {
        const { estado, proveedor_id, fecha_inicio, fecha_fin } = req.query;
        let query = `
            SELECT o.*, p.nombre as proveedor_nombre, s.nombre as sucursal_nombre 
            FROM ordenes_compra o
            JOIN proveedores p ON o.proveedor_id = p.id
            JOIN sucursales s ON o.sucursal_destino_id = s.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        if (estado) {
            query += ` AND o.estado = $${paramCount++}`;
            params.push(estado);
        }
        if (proveedor_id) {
            query += ` AND o.proveedor_id = $${paramCount++}`;
            params.push(proveedor_id);
        }

        query += ` ORDER BY o.created_at DESC LIMIT 50`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error listando órdenes:', error);
        res.status(500).json({ message: 'Error al listar órdenes' });
    }
};

// Obtener detalles de orden
const getOrdenById = async (req, res) => {
    try {
        const { id } = req.params;

        const ordenResult = await pool.query(`
            SELECT o.*, p.nombre as proveedor_nombre, s.nombre as sucursal_nombre
            FROM ordenes_compra o
            JOIN proveedores p ON o.proveedor_id = p.id
            JOIN sucursales s ON o.sucursal_destino_id = s.id
            WHERE o.id = $1
        `, [id]);

        if (ordenResult.rows.length === 0) {
            return res.status(404).json({ message: 'Orden no encontrada' });
        }

        const itemsResult = await pool.query(`
            SELECT d.*, prod.nombre as producto_nombre, prod.codigo
            FROM ordenes_compra_detalles d
            JOIN productos_catalogo prod ON d.producto_id = prod.id
            WHERE d.orden_id = $1
        `, [id]);

        const orden = ordenResult.rows[0];
        orden.items = itemsResult.rows;

        res.json(orden);
    } catch (error) {
        logger.error('Error obteniendo detalle orden:', error);
        res.status(500).json({ message: 'Error al obtener orden' });
    }
};

// Emitir Orden (Cambiar estado a 'emitida')
const emitirOrden = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(`UPDATE ordenes_compra SET estado = 'emitida', fecha_emision = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
        res.json({ message: 'Orden emitida correctamente' });
    } catch (error) {
        logger.error('Error emitiendo orden:', error);
        res.status(500).json({ message: 'Error al emitir orden' });
    }
};

module.exports = {
    createOrden,
    getOrdenes,
    getOrdenById,
    emitirOrden
};
