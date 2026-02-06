const { pool } = require('../config/db');
const logger = require('../config/logger');

// Obtener todos los tipos de sucursal
const getAllTiposSucursal = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, nombre, descripcion, color, icono, activo, orden
            FROM tipos_sucursal
            ORDER BY orden, nombre
        `);

        res.json(result.rows);
    } catch (error) {
        logger.error('Error obteniendo tipos de sucursal:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Obtener tipos de sucursal activos (para selects)
const getTiposSucursalActivos = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, nombre, descripcion, color, icono
            FROM tipos_sucursal
            WHERE activo = 1
            ORDER BY orden, nombre
        `);

        res.json(result.rows);
    } catch (error) {
        logger.error('Error obteniendo tipos de sucursal activos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Crear nuevo tipo de sucursal
const createTipoSucursal = async (req, res) => {
    try {
        const { nombre, descripcion, color, icono } = req.body;

        if (!nombre) {
            return res.status(400).json({ message: 'El nombre es requerido' });
        }

        // Verificar si ya existe
        const exists = await pool.query(
            'SELECT id FROM tipos_sucursal WHERE nombre = $1',
            [nombre]
        );

        if (exists.rows.length > 0) {
            return res.status(400).json({ message: 'Ya existe un tipo con ese nombre' });
        }

        // Obtener el siguiente orden
        const maxOrden = await pool.query('SELECT MAX(orden) as max_orden FROM tipos_sucursal');
        const nuevoOrden = (maxOrden.rows[0]?.max_orden || 0) + 1;

        const insertResult = await pool.query(`
            INSERT INTO tipos_sucursal (nombre, descripcion, color, icono, orden, activo)
            VALUES ($1, $2, $3, $4, $5, 1)
        `, [nombre, descripcion || '', color || '#3B82F6', icono || 'Store', nuevoOrden]);

        const tipoId = insertResult.id;
        const result = await pool.query('SELECT id, nombre, descripcion, color, icono, orden, activo FROM tipos_sucursal WHERE id = $1', [tipoId]);

        logger.info(`Tipo de sucursal creado: ${nombre}`);

        res.status(201).json({
            success: true,
            message: 'Tipo de sucursal creado exitosamente',
            tipo: result.rows[0]
        });
    } catch (error) {
        logger.error('Error creando tipo de sucursal:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Actualizar tipo de sucursal
const updateTipoSucursal = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, color, icono, activo } = req.body;

        // Verificar si existe
        const exists = await pool.query(
            'SELECT id FROM tipos_sucursal WHERE id = $1',
            [id]
        );

        if (exists.rows.length === 0) {
            return res.status(404).json({ message: 'Tipo de sucursal no encontrado' });
        }

        // Verificar nombre duplicado (excluyendo el actual)
        if (nombre) {
            const duplicado = await pool.query(
                'SELECT id FROM tipos_sucursal WHERE nombre = $1 AND id != $2',
                [nombre, id]
            );

            if (duplicado.rows.length > 0) {
                return res.status(400).json({ message: 'Ya existe otro tipo con ese nombre' });
            }
        }

        await pool.query(`
            UPDATE tipos_sucursal
            SET nombre = COALESCE($1, nombre),
                descripcion = COALESCE($2, descripcion),
                color = COALESCE($3, color),
                icono = COALESCE($4, icono),
                activo = COALESCE($5, activo)
            WHERE id = $6
        `, [nombre, descripcion, color, icono, activo, id]);

        const result = await pool.query('SELECT id, nombre, descripcion, color, icono, orden, activo FROM tipos_sucursal WHERE id = $1', [id]);

        logger.info(`Tipo de sucursal actualizado: ${result.rows[0].nombre}`);

        res.json({
            success: true,
            message: 'Tipo de sucursal actualizado exitosamente',
            tipo: result.rows[0]
        });
    } catch (error) {
        logger.error('Error actualizando tipo de sucursal:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Eliminar tipo de sucursal
const deleteTipoSucursal = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si existe
        const exists = await pool.query(
            'SELECT id, nombre FROM tipos_sucursal WHERE id = $1',
            [id]
        );

        if (exists.rows.length === 0) {
            return res.status(404).json({ message: 'Tipo de sucursal no encontrado' });
        }

        // Verificar si hay sucursales usando este tipo
        const enUso = await pool.query(
            'SELECT COUNT(*) as count FROM sucursales WHERE tipo = $1',
            [exists.rows[0].nombre]
        );

        if (parseInt(enUso.rows[0]?.count || 0) > 0) {
            return res.status(400).json({
                message: 'No se puede eliminar el tipo porque hay sucursales que lo usan. Desactívelo en su lugar.'
            });
        }

        await pool.query('DELETE FROM tipos_sucursal WHERE id = $1', [id]);

        logger.info(`Tipo de sucursal eliminado: ${exists.rows[0].nombre}`);

        res.json({
            success: true,
            message: 'Tipo de sucursal eliminado exitosamente'
        });
    } catch (error) {
        logger.error('Error eliminando tipo de sucursal:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Reordenar tipos de sucursal
const reorderTiposSucursal = async (req, res) => {
    try {
        const { orden } = req.body; // Array de { id, orden }

        if (!Array.isArray(orden)) {
            return res.status(400).json({ message: 'Se requiere un array de orden' });
        }

        for (const item of orden) {
            await pool.query(
                'UPDATE tipos_sucursal SET orden = $1 WHERE id = $2',
                [item.orden, item.id]
            );
        }

        logger.info('Tipos de sucursal reordenados');

        res.json({
            success: true,
            message: 'Orden actualizado exitosamente'
        });
    } catch (error) {
        logger.error('Error reordenando tipos de sucursal:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    getAllTiposSucursal,
    getTiposSucursalActivos,
    createTipoSucursal,
    updateTipoSucursal,
    deleteTipoSucursal,
    reorderTiposSucursal
};
