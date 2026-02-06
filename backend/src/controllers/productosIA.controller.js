const { pool } = require('../config/db');
const logger = require('../config/logger');
const descripcionService = require('../services/descripcion.service');

// Generar descripción con IA para un producto
const generarDescripcion = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener datos del producto
        const result = await pool.query(
            'SELECT * FROM productos_catalogo WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        const producto = result.rows[0];

        // Generar descripción con IA
        const descripcion = await descripcionService.generarDescripcion(producto);

        if (!descripcion.success) {
            return res.status(400).json({
                message: 'Error generando descripción',
                error: descripcion.error
            });
        }

        // Actualizar producto con la nueva descripción
        await pool.query(`
            UPDATE productos_catalogo 
            SET descripcion_seo = $1,
                descripcion_corta = $2,
                palabras_clave = $3,
                procesado_ia = 1
            WHERE id = $4
        `, [descripcion.descripcion_seo, descripcion.descripcion_corta, descripcion.palabras_clave, id]);

        logger.info(`Descripción IA generada para producto ${id}`);

        res.json({
            success: true,
            message: 'Descripción generada exitosamente',
            descripcion
        });

    } catch (error) {
        logger.error('Error generando descripción:', error);
        res.status(500).json({ message: 'Error generando descripción' });
    }
};

// Obtener productos sin descripción (para enriquecimiento por lotes)
const getProductosSinDescripcion = async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const result = await pool.query(`
            SELECT id, codigo, nombre, nombre_proveedor, sku_proveedor, marca, categoria,
                   descripcion, descripcion_seo, procesado_ia
            FROM productos_catalogo
            WHERE (descripcion_seo IS NULL OR descripcion_seo = '' OR procesado_ia = 0)
              AND activo = 1
            ORDER BY nombre
            LIMIT $1
        `, [parseInt(limit)]);

        res.json({
            total: result.rows.length,
            productos: result.rows
        });

    } catch (error) {
        logger.error('Error obteniendo productos sin descripción:', error);
        res.status(500).json({ message: 'Error obteniendo productos' });
    }
};

// Enriquecer productos por lotes
const enriquecerLote = async (req, res) => {
    try {
        const { producto_ids } = req.body;

        if (!producto_ids || !Array.isArray(producto_ids) || producto_ids.length === 0) {
            return res.status(400).json({ message: 'Se requiere un array de IDs de productos' });
        }

        // Limitar a 10 productos por lote para evitar timeout
        const ids = producto_ids.slice(0, 10);
        const resultados = [];

        for (const id of ids) {
            try {
                const result = await pool.query(
                    'SELECT * FROM productos_catalogo WHERE id = $1',
                    [id]
                );

                if (result.rows.length === 0) {
                    resultados.push({ id, success: false, error: 'Producto no encontrado' });
                    continue;
                }

                const producto = result.rows[0];
                const descripcion = await descripcionService.generarDescripcion(producto);

                if (descripcion.success) {
                    await pool.query(`
                        UPDATE productos_catalogo 
                        SET descripcion_seo = $1,
                            descripcion_corta = $2,
                            palabras_clave = $3,
                            procesado_ia = 1
                        WHERE id = $4
                    `, [descripcion.descripcion_seo, descripcion.descripcion_corta, descripcion.palabras_clave, id]);

                    resultados.push({ id, success: true });
                } else {
                    resultados.push({ id, success: false, error: descripcion.error });
                }

            } catch (innerError) {
                resultados.push({ id, success: false, error: innerError.message });
            }
        }

        logger.info(`Lote de enriquecimiento procesado: ${resultados.filter(r => r.success).length}/${ids.length} exitosos`);

        res.json({
            success: true,
            message: 'Lote procesado',
            resultados
        });

    } catch (error) {
        logger.error('Error en enriquecimiento por lotes:', error);
        res.status(500).json({ message: 'Error procesando lote' });
    }
};

// Actualizar campos de proveedor de un producto
const updateCamposProveedor = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_proveedor, sku_proveedor, marca, descripcion_corta } = req.body;

        await pool.query(`
            UPDATE productos_catalogo 
            SET nombre_proveedor = COALESCE($1, nombre_proveedor),
                sku_proveedor = COALESCE($2, sku_proveedor),
                marca = COALESCE($3, marca),
                descripcion_corta = COALESCE($4, descripcion_corta)
            WHERE id = $5
        `, [nombre_proveedor, sku_proveedor, marca, descripcion_corta, id]);

        const result = await pool.query(
            'SELECT * FROM productos_catalogo WHERE id = $1',
            [id]
        );

        res.json({
            success: true,
            message: 'Campos de proveedor actualizados',
            producto: result.rows[0]
        });

    } catch (error) {
        logger.error('Error actualizando campos de proveedor:', error);
        res.status(500).json({ message: 'Error actualizando producto' });
    }
};

module.exports = {
    generarDescripcion,
    getProductosSinDescripcion,
    enriquecerLote,
    updateCamposProveedor
};
