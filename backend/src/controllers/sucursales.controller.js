const { pool } = require('../config/db');
const logger = require('../config/logger');

// Obtener todas las sucursales
const getAllSucursales = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                nombre,
                tipo,
                direccion,
                activo,
                created_at
            FROM sucursales
            ORDER BY nombre
        `);

        res.json(result.rows);
    } catch (error) {
        logger.error('Error obteniendo sucursales:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Obtener sucursal por ID
const getSucursalById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT * FROM sucursales WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Sucursal no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error obteniendo sucursal:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Crear nueva sucursal
const createSucursal = async (req, res) => {
    try {
        const { nombre, tipo, direccion, telefono } = req.body;

        // Validaciones básicas
        if (!nombre || !tipo) {
            return res.status(400).json({ message: 'El nombre y tipo son requeridos' });
        }

        // Verificar si el nombre ya existe
        const nombreExists = await pool.query(
            'SELECT id FROM sucursales WHERE nombre = $1',
            [nombre]
        );

        if (nombreExists.rows.length > 0) {
            return res.status(400).json({ message: 'El nombre de la sucursal ya está registrado' });
        }

        // Insertar nueva sucursal
        const insertResult = await pool.query(`
            INSERT INTO sucursales (nombre, tipo, direccion, telefono, activo, created_at)
            VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP)
        `, [nombre, tipo, direccion, telefono]);

        const sucursalId = insertResult.id;
        const result = await pool.query('SELECT * FROM sucursales WHERE id = $1', [sucursalId]);

        logger.info(`Sucursal creada: ${nombre}`);

        res.status(201).json({
            success: true,
            message: 'Sucursal creada exitosamente',
            sucursal: result.rows[0]
        });
    } catch (error) {
        logger.error('Error creando sucursal:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Actualizar sucursal
const updateSucursal = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, tipo, direccion, telefono, activo } = req.body;

        // Verificar si la sucursal existe
        const sucursalExists = await pool.query(
            'SELECT id FROM sucursales WHERE id = $1',
            [id]
        );

        if (sucursalExists.rows.length === 0) {
            return res.status(404).json({ message: 'Sucursal no encontrada' });
        }

        // Verificar si el nombre ya existe (excluyendo la actual)
        if (nombre) {
            const nombreExists = await pool.query(
                'SELECT id FROM sucursales WHERE nombre = $1 AND id != $2',
                [nombre, id]
            );

            if (nombreExists.rows.length > 0) {
                return res.status(400).json({ message: 'El nombre de la sucursal ya está registrado' });
            }
        }

        // Actualizar sucursal
        await pool.query(`
            UPDATE sucursales
            SET nombre = COALESCE($1, nombre),
                tipo = COALESCE($2, tipo),
                direccion = COALESCE($3, direccion),
                telefono = COALESCE($4, telefono),
                activo = COALESCE($5, activo)
            WHERE id = $6
        `, [nombre, tipo, direccion, telefono, activo, id]);

        const result = await pool.query('SELECT * FROM sucursales WHERE id = $1', [id]);

        logger.info(`Sucursal actualizada: ${result.rows[0].nombre}`);

        res.json({
            success: true,
            message: 'Sucursal actualizada exitosamente',
            sucursal: result.rows[0]
        });
    } catch (error) {
        logger.error('Error actualizando sucursal:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Eliminar sucursal
const deleteSucursal = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si la sucursal existe
        const sucursalExists = await pool.query(
            'SELECT id, nombre FROM sucursales WHERE id = $1',
            [id]
        );

        if (sucursalExists.rows.length === 0) {
            return res.status(404).json({ message: 'Sucursal no encontrada' });
        }

        // Verificar si tiene cajas asociadas
        const cajasCount = await pool.query(
            'SELECT COUNT(*) as count FROM puntos_venta WHERE sucursal_id = $1',
            [id]
        );

        if (parseInt(cajasCount.rows[0].count) > 0) {
            return res.status(400).json({
                message: 'No se puede eliminar la sucursal porque tiene cajas asociadas'
            });
        }

        // Verificar si tiene empleados asociados
        const empleadosCount = await pool.query(
            'SELECT COUNT(*) as count FROM empleados WHERE sucursal_id = $1',
            [id]
        );

        if (parseInt(empleadosCount.rows[0].count) > 0) {
            return res.status(400).json({
                message: 'No se puede eliminar la sucursal porque tiene empleados asociados'
            });
        }

        // Eliminar sucursal
        await pool.query('DELETE FROM sucursales WHERE id = $1', [id]);

        logger.info(`Sucursal eliminada: ${sucursalExists.rows[0].nombre} (ID: ${id})`);

        res.json({
            success: true,
            message: 'Sucursal eliminada exitosamente'
        });
    } catch (error) {
        logger.error('Error eliminando sucursal:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    getAllSucursales,
    getSucursalById,
    createSucursal,
    updateSucursal,
    deleteSucursal
};