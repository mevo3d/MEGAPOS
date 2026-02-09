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
        const { estado, proveedor_id } = req.query;
        let query = `
            SELECT o.*, 
                   p.nombre as proveedor_nombre, 
                   s.nombre as sucursal_nombre 
            FROM ordenes_compra o
            LEFT JOIN proveedores p ON o.proveedor_id = p.id
            LEFT JOIN sucursales s ON o.sucursal_destino_id = s.id
            WHERE 1=1
        `;
        const params = [];

        if (estado) {
            query += ` AND o.estado = ?`;
            params.push(estado);
        }
        if (proveedor_id) {
            query += ` AND o.proveedor_id = ?`;
            params.push(proveedor_id);
        }

        query += ` ORDER BY o.id DESC LIMIT 50`;

        const result = await pool.query(query, params);
        res.json({ ordenes: result.rows || result });
    } catch (error) {
        logger.error('Error listando órdenes:', error);
        res.status(500).json({ message: 'Error al listar órdenes', error: error.message });
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

// Cambiar estado de orden
const cambiarEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const estadosValidos = ['borrador', 'emitida', 'enviada', 'recibida_parcial', 'recibida', 'cancelada'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ message: 'Estado no válido' });
        }

        await pool.query(`
            UPDATE ordenes_compra 
            SET estado = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
        `, [estado, id]);

        res.json({ success: true, message: `Estado actualizado a ${estado}` });
    } catch (error) {
        logger.error('Error cambiando estado:', error);
        res.status(500).json({ message: 'Error al cambiar estado' });
    }
};

// Estadísticas de Compras (KPIs) - Versión simplificada para SQLite
const getEstadisticas = async (req, res) => {
    try {
        // Inicializar con valores por defecto
        let ordenesData = { borradores: 0, emitidas: 0, en_transito: 0, recibidas: 0, canceladas: 0, total: 0, valor_total: 0 };
        let proveedoresData = { activos: 0, total: 0, nuevos_mes: 0 };
        let facturasData = { importadas: 0, por_pagar: 0, pagadas: 0, monto_total: 0 };
        let traspasosData = { pendientes: 0, en_transito: 0, completados_hoy: 0 };
        let stockBajo = 0;

        // Ordenes de compra (con try-catch individual)
        try {
            const ordenesResult = await pool.query(`
                SELECT 
                    SUM(CASE WHEN estado = 'borrador' THEN 1 ELSE 0 END) as borradores,
                    SUM(CASE WHEN estado = 'emitida' THEN 1 ELSE 0 END) as emitidas,
                    SUM(CASE WHEN estado = 'enviada' THEN 1 ELSE 0 END) as en_transito,
                    SUM(CASE WHEN estado IN ('recibida', 'recibida_parcial') THEN 1 ELSE 0 END) as recibidas,
                    SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
                    COUNT(*) as total,
                    COALESCE(SUM(total_estimado), 0) as valor_total
                FROM ordenes_compra
            `);
            const row = ordenesResult.rows ? ordenesResult.rows[0] : ordenesResult[0];
            if (row) ordenesData = row;
        } catch (e) { /* tabla puede no existir */ }

        // Proveedores
        try {
            const proveedoresResult = await pool.query(`
                SELECT 
                    SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos,
                    COUNT(*) as total
                FROM proveedores
            `);
            const row = proveedoresResult.rows ? proveedoresResult.rows[0] : proveedoresResult[0];
            if (row) proveedoresData = { ...proveedoresData, ...row };
        } catch (e) { /* tabla puede no existir */ }

        // Facturas importadas
        try {
            const facturasResult = await pool.query(`
                SELECT 
                    COUNT(*) as importadas,
                    COALESCE(SUM(total), 0) as monto_total
                FROM facturas_importadas
            `);
            const row = facturasResult.rows ? facturasResult.rows[0] : facturasResult[0];
            if (row) facturasData = { ...facturasData, ...row };
        } catch (e) { /* tabla puede no existir */ }

        // Traspasos
        try {
            const traspasosResult = await pool.query(`
                SELECT 
                    SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
                    SUM(CASE WHEN estado = 'en_transito' THEN 1 ELSE 0 END) as en_transito,
                    SUM(CASE WHEN estado = 'completado' OR estado = 'completada' THEN 1 ELSE 0 END) as completados_hoy
                FROM transferencias_inventario
            `);
            const row = traspasosResult.rows ? traspasosResult.rows[0] : traspasosResult[0];
            if (row) traspasosData = row;
        } catch (e) { /* tabla puede no existir */ }

        // Productos con stock bajo
        try {
            const stockBajoResult = await pool.query(`
                SELECT COUNT(DISTINCT producto_id) as productos_bajo_stock
                FROM inventario_sucursal i
                WHERE i.stock_actual < i.stock_minimo
            `);
            const row = stockBajoResult.rows ? stockBajoResult.rows[0] : stockBajoResult[0];
            if (row) stockBajo = row.productos_bajo_stock || 0;
        } catch (e) { /* tabla puede no existir */ }

        res.json({
            success: true,
            data: {
                ordenes: ordenesData,
                proveedores: proveedoresData,
                facturas: facturasData,
                traspasos: traspasosData,
                inventario: {
                    productos_bajo_stock: stockBajo
                }
            }
        });
    } catch (error) {
        logger.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
    }
};

// Inventario Global (stock de todas las sucursales) - Versión simplificada SQLite
const getInventarioGlobal = async (req, res) => {
    try {
        const { limite = 100, offset = 0, busqueda, solo_bajo_stock } = req.query;

        // Query simplificada compatible con SQLite
        let query = `
            SELECT 
                p.id,
                p.sku,
                p.codigo_barras,
                p.nombre,
                10 as punto_reorden,
                COALESCE(SUM(i.stock_actual), 0) as stock_total
            FROM productos_catalogo p
            LEFT JOIN inventario_sucursal i ON p.id = i.producto_id
            WHERE p.activo = 1
        `;
        const params = [];

        if (busqueda && busqueda.trim() !== '') {
            query += ` AND (p.nombre LIKE ? OR p.sku LIKE ? OR p.codigo_barras LIKE ?)`;
            const searchTerm = `%${busqueda}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ` GROUP BY p.id`;

        if (solo_bajo_stock === 'true') {
            query += ` HAVING COALESCE(SUM(i.stock_actual), 0) < 10`;
        }

        query += ` ORDER BY p.nombre LIMIT ? OFFSET ?`;
        params.push(parseInt(limite), parseInt(offset));

        const result = await pool.query(query, params);

        // Get sucursales list
        const sucursalesResult = await pool.query(`SELECT id, nombre FROM sucursales ORDER BY nombre`);

        // Obtener stock por sucursal para cada producto
        const data = await Promise.all((result.rows || result).map(async (row) => {
            let stockPorSucursal = {};
            try {
                const stockResult = await pool.query(`
                    SELECT s.nombre as sucursal_nombre, COALESCE(i.stock_actual, 0) as stock
                    FROM inventario_sucursal i
                    JOIN sucursales s ON i.sucursal_id = s.id
                    WHERE i.producto_id = ?
                `, [row.id]);
                const stockRows = stockResult.rows || stockResult;
                stockRows.forEach(s => {
                    stockPorSucursal[s.sucursal_nombre] = s.stock;
                });
            } catch (e) { /* ignorar */ }

            return {
                id: row.id,
                sku: row.sku || '',
                codigo_barras: row.codigo_barras || '',
                nombre: row.nombre,
                punto_reorden: 10,
                stock_total: parseInt(row.stock_total) || 0,
                stock_por_sucursal: stockPorSucursal
            };
        }));

        res.json({
            success: true,
            data: data,
            sucursales: sucursalesResult.rows || sucursalesResult,
            total: data.length
        });
    } catch (error) {
        logger.error('Error obteniendo inventario global:', error);
        res.status(500).json({ message: 'Error al obtener inventario global', error: error.message });
    }
};

// Facturas importadas 
const getFacturasImportadas = async (req, res) => {
    try {
        const { limite = 50, proveedor_id, estado } = req.query;

        let query = `
            SELECT 
                f.*,
                p.nombre as proveedor_nombre,
                u.nombre as importado_por_nombre
            FROM facturas_importadas f
            LEFT JOIN proveedores p ON f.proveedor_id = p.id
            LEFT JOIN usuarios u ON f.importado_por_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (proveedor_id) {
            query += ` AND f.proveedor_id = ?`;
            params.push(proveedor_id);
        }
        if (estado) {
            query += ` AND f.estado = ?`;
            params.push(estado);
        }

        query += ` ORDER BY f.fecha_importacion DESC LIMIT ?`;
        params.push(parseInt(limite));

        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows || result });
    } catch (error) {
        logger.error('Error obteniendo facturas:', error);
        res.status(500).json({ message: 'Error al obtener facturas', error: error.message });
    }
};

// Traspasos en tiempo real
const getTraspasos = async (req, res) => {
    try {
        const { estado, limite = 50 } = req.query;

        let query = `
            SELECT 
                t.*,
                so.nombre as sucursal_origen_nombre,
                sd.nombre as sucursal_destino_nombre,
                u.nombre as solicitado_por_nombre
            FROM transferencias_inventario t
            JOIN sucursales so ON t.sucursal_origen_id = so.id
            JOIN sucursales sd ON t.sucursal_destino_id = sd.id
            LEFT JOIN usuarios u ON t.solicitado_por_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (estado) {
            query += ` AND t.estado = ?`;
            params.push(estado);
        }

        query += ` ORDER BY t.created_at DESC LIMIT ?`;
        params.push(parseInt(limite));

        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows || result });
    } catch (error) {
        logger.error('Error obteniendo traspasos:', error);
        res.status(500).json({ message: 'Error al obtener traspasos', error: error.message });
    }
};

module.exports = {
    createOrden,
    getOrdenes,
    getOrdenById,
    emitirOrden,
    cambiarEstado,
    getEstadisticas,
    getInventarioGlobal,
    getFacturasImportadas,
    getTraspasos
};
