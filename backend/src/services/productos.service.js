const { pool } = require('../config/db');
const logger = require('../config/logger');

// Obtener productos con paginación y búsqueda
const getAllProductos = async (page = 1, limit = 10, search = '') => {
    const offset = (page - 1) * limit;

    // Consulta base
    let baseQuery = `FROM productos_catalogo p WHERE p.activo = 1`;
    const params = [];

    if (search) {
        baseQuery += ` AND (p.nombre LIKE $${params.length + 1} OR p.codigo LIKE $${params.length + 1})`;
        params.push(`%${search}%`);
    }

    // Query de datos
    // Nota: Total stock es calculado como suma de inventario_sucursal para este producto
    // SQLite subquery
    const dataQuery = `
        SELECT p.*, 
               (SELECT SUM(stock_actual) FROM inventario_sucursal WHERE producto_id = p.id) as total_stock
        ${baseQuery}
        ORDER BY p.nombre ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    // params copy for data query
    const dataParams = [...params, limit, offset];

    const result = await pool.query(dataQuery, dataParams);

    // Query de conteo
    const countQuery = `SELECT COUNT(*) as count ${baseQuery}`;
    const countResult = await pool.query(countQuery, params);

    return {
        productos: result.rows,
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    };
};

const getProductoById = async (id) => {
    const result = await pool.query('SELECT * FROM productos_catalogo WHERE id = $1', [id]);
    return result.rows[0];
};

const createProducto = async (data) => {
    // Adapter para frontend que envía 'sku' o 'codigo_barras' -> guardamos en 'codigo'
    const codigo = data.codigo || data.sku || data.codigo_barras;
    const {
        nombre, descripcion, categoria, precio_compra, precio_venta, tiene_inventario,
        nombre_proveedor, sku_proveedor, marca, descripcion_corta,
        precio_1, precio_2, precio_3, precio_4, precio_5,
        usuario_captura_id, capturado_desde,
        stock_inicial, unidad_medida, factor_empaque // New fields from Import
    } = data;

    // Mapeo precio_base -> precio_venta, costo -> precio_compra si vienen así
    const pv = precio_venta || data.precio_base || precio_5 || 0;
    const pc = precio_compra || data.costo || 0;

    // 1. Check if product exists
    const existing = await pool.query('SELECT * FROM productos_catalogo WHERE codigo = $1', [codigo]);
    let productoId;

    if (existing.rows.length > 0) {
        // UPDATE existing product
        productoId = existing.rows[0].id;
        await pool.query(
            `UPDATE productos_catalogo SET 
                nombre = $1, descripcion = $2, precio_compra = $3, precio_venta = $4,
                nombre_proveedor = $5, sku_proveedor = $6, marca = $7,
                precio_5 = $8
             WHERE id = $9`,
            [
                nombre, descripcion, pc, pv,
                nombre_proveedor || null, sku_proveedor || null, marca || null,
                parseFloat(precio_5) || pv,
                productoId
            ]
        );
    } else {
        // INSERT new product
        const result = await pool.query(
            `INSERT INTO productos_catalogo (
                codigo, nombre, descripcion, categoria, precio_compra, precio_venta, tiene_inventario,
                nombre_proveedor, sku_proveedor, marca, descripcion_corta,
                precio_1, precio_2, precio_3, precio_4, precio_5,
                usuario_captura_id, capturado_desde
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING id`,
            [
                codigo, nombre, descripcion, categoria, pc, pv,
                tiene_inventario !== undefined ? tiene_inventario : 1,
                nombre_proveedor || null, sku_proveedor || null, marca || null, descripcion_corta || null,
                parseFloat(precio_1) || 0, parseFloat(precio_2) || 0, parseFloat(precio_3) || 0,
                parseFloat(precio_4) || 0, parseFloat(precio_5) || pv,
                usuario_captura_id || null, capturado_desde || null
            ]
        );
        productoId = result.rows[0].id;
    }

    // 2. Handle Initial Stock (Simple Logic: Add to Sucursal 1)
    // In a real app, sucursal_id should come from context/user
    if (stock_inicial && stock_inicial > 0) {
        const sucursalId = 1; // Default to Main Store

        // Check if inventory record exists
        const invCheck = await pool.query(
            'SELECT stock_actual FROM inventario_sucursal WHERE producto_id = $1 AND sucursal_id = $2',
            [productoId, sucursalId]
        );

        if (invCheck.rows.length > 0) {
            // Update existing stock (Add to it)
            await pool.query(
                'UPDATE inventario_sucursal SET stock_actual = stock_actual + $1 WHERE producto_id = $2 AND sucursal_id = $3',
                [stock_inicial, productoId, sucursalId]
            );
        } else {
            // Insert new inventory record
            await pool.query(
                'INSERT INTO inventario_sucursal (sucursal_id, producto_id, stock_actual, stock_minimo) VALUES ($1, $2, $3, $4)',
                [sucursalId, productoId, stock_inicial, 5] // Default min stock 5
            );
        }
    }

    return { id: productoId, ...data };
};

const updateProducto = async (id, data) => {
    // Construcción dinámica de query para UPDATE
    // Campos mapeados
    const map = {
        'sku': 'codigo',
        'codigo_barras': 'codigo',
        'precio_base': 'precio_venta',
        'costo': 'precio_compra',
        'nombre': 'nombre',
        'descripcion': 'descripcion',
        'categoria': 'categoria',
        'activo': 'activo'
    };

    const fields = [];
    const values = [];
    let idx = 1;

    Object.keys(data).forEach(key => {
        const dbField = map[key] || key; // Si coincide nombre, usar tal cual
        // Validar que el campo exista en la tabla (lista blanca)
        const validFields = [
            'codigo', 'nombre', 'descripcion', 'categoria',
            'precio_compra', 'precio_venta', 'activo', 'tiene_inventario',
            'nombre_proveedor', 'sku_proveedor', 'marca', 'descripcion_corta',
            'descripcion_seo', 'palabras_clave', 'procesado_ia',
            'precio_1', 'precio_2', 'precio_3', 'precio_4', 'precio_5'
        ];

        if (validFields.includes(dbField) && data[key] !== undefined) {
            fields.push(`${dbField} = $${idx}`);
            values.push(data[key]);
            idx++;
        }
    });

    if (fields.length === 0) return null;

    values.push(id);
    const result = await pool.query(
        `UPDATE productos_catalogo SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
    );

    return result.rows[0];
};

const deleteProducto = async (id) => {
    // Soft delete
    await pool.query('UPDATE productos_catalogo SET activo = 0 WHERE id = $1', [id]);
    return true;
};

module.exports = {
    getAllProductos,
    getProductoById,
    createProducto,
    updateProducto,
    deleteProducto
};
