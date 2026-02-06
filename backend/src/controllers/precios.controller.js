const { pool } = require('../config/db');
const logger = require('../config/logger');

const getListas = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM listas_precios WHERE activo = 1 ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        logger.error('Error obteniendo listas precios:', error);
        res.status(500).json({ message: 'Error interno' });
    }
};

const updateLista = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, porcentaje_descuento } = req.body;

        await pool.query(
            'UPDATE listas_precios SET nombre = $1, porcentaje_descuento = $2 WHERE id = $3',
            [nombre, porcentaje_descuento, id]
        );
        res.json({ success: true, message: 'Lista actualizada' });
    } catch (error) {
        logger.error('Error actualizando lista:', error);
        res.status(500).json({ message: 'Error updating list' });
    }
};

const createLista = async (req, res) => {
    try {
        const { nombre, porcentaje_descuento, descripcion } = req.body;
        const insertResult = await pool.query(
            'INSERT INTO listas_precios (nombre, porcentaje_descuento, descripcion) VALUES ($1, $2, $3)',
            [nombre, porcentaje_descuento, descripcion]
        );
        const result = await pool.query('SELECT * FROM listas_precios WHERE id = $1', [insertResult.id]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error creating list' });
    }
};

const updateGlobalPrices = async (req, res) => {
    try {
        const { p1, p2, p3, p4, p5 } = req.body;

        // Validar que sean números
        if ([p1, p2, p3, p4, p5].some(p => isNaN(parseFloat(p)))) {
            return res.status(400).json({ message: 'Todos los porcentajes deben ser números válidos' });
        }

        // Actualizar precios de todos los productos que tengan costo > 0
        // Usamos la fórmula: Costo * (1 + (Porcentaje / 100))
        await pool.query(
            `UPDATE productos_catalogo 
             SET 
                precio_1 = ROUND(precio_compra * (1 + $1 / 100.0), 2),
                precio_2 = ROUND(precio_compra * (1 + $2 / 100.0), 2),
                precio_3 = ROUND(precio_compra * (1 + $3 / 100.0), 2),
                precio_4 = ROUND(precio_compra * (1 + $4 / 100.0), 2),
                precio_5 = ROUND(precio_compra * (1 + $5 / 100.0), 2),
                precio_venta = ROUND(precio_compra * (1 + $5 / 100.0), 2) -- Sync precio_venta con P5
             WHERE precio_compra > 0 AND activo = 1`,
            [p1, p2, p3, p4, p5]
        );

        // Opcional: Guardar estos porcentajes en la tabla de configuración para referencia futura
        // (Si existiera una lógica para "default configs", se pondría aquí)

        res.json({ success: true, message: 'Precios actualizados masivamente correctamente' });
    } catch (error) {
        logger.error('Error actualizando precios globales:', error);
        res.status(500).json({ message: 'Error al actualizar precios globales' });
    }
};

module.exports = {
    getListas,
    updateLista,
    createLista,
    updateGlobalPrices
};
