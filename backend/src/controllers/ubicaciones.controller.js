const { pool } = require('../config/db');
const logger = require('../config/logger');

const getUbicaciones = async (req, res) => {
    try {
        const { sucursal_id } = req.query;
        let query = 'SELECT * FROM ubicaciones_bodega WHERE activo = 1';
        const params = [];

        if (sucursal_id) {
            query += ' AND sucursal_id = $1';
            params.push(sucursal_id);
        }

        query += ' ORDER BY nombre';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error al obtener ubicaciones:', error);
        res.status(500).json({ message: 'Error al obtener ubicaciones' });
    }
};

const createUbicacion = async (req, res) => {
    try {
        const { nombre, tipo, codigo_barras, sucursal_id } = req.body;

        const insertResult = await pool.query(
            `INSERT INTO ubicaciones_bodega (sucursal_id, nombre, tipo, codigo_barras)
             VALUES ($1, $2, $3, $4)`,
            [sucursal_id || 1, nombre, tipo || 'general', codigo_barras]
        );

        const result = await pool.query('SELECT * FROM ubicaciones_bodega WHERE id = $1', [insertResult.id]);

        res.status(201).json(result.rows[0]);

    } catch (error) {
        logger.error('Error creando ubicación:', error);
        res.status(500).json({ message: 'Error creando ubicación' });
    }
};

const deleteUbicacion = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('UPDATE ubicaciones_bodega SET activo = 0 WHERE id = $1', [id]);
        res.json({ message: 'Ubicación eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando ubicación' });
    }
};

module.exports = {
    getUbicaciones,
    createUbicacion,
    deleteUbicacion
};
