const { pool } = require('../config/db');
const logger = require('../config/logger');

// Obtener todos los puntos de venta
const getAllPuntosVenta = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                pv.*,
                s.nombre as sucursal_nombre
            FROM puntos_venta pv
            LEFT JOIN sucursales s ON pv.sucursal_id = s.id
            ORDER BY s.nombre, pv.nombre
        `);

        res.json(result.rows);
    } catch (error) {
        logger.error('Error obteniendo puntos de venta:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Obtener punto de venta por ID
const getPuntoVentaById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT
                pv.*,
                s.nombre as sucursal_nombre
            FROM puntos_venta pv
            LEFT JOIN sucursales s ON pv.sucursal_id = s.id
            WHERE pv.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Punto de venta no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error obteniendo punto de venta:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Crear nuevo punto de venta
const createPuntoVenta = async (req, res) => {
    try {
        const { nombre, sucursal_id, descripcion, es_maestra } = req.body;

        // Validaciones básicas
        if (!nombre || !sucursal_id) {
            return res.status(400).json({ message: 'El nombre y la sucursal son requeridos' });
        }

        // Verificar si la sucursal existe
        const sucursalExists = await pool.query(
            'SELECT id, nombre FROM sucursales WHERE id = $1',
            [sucursal_id]
        );

        if (sucursalExists.rows.length === 0) {
            return res.status(400).json({ message: 'La sucursal especificada no existe' });
        }

        // Verificar si el nombre ya existe en la misma sucursal
        const nombreExists = await pool.query(
            'SELECT id FROM puntos_venta WHERE nombre = $1 AND sucursal_id = $2',
            [nombre, sucursal_id]
        );

        if (nombreExists.rows.length > 0) {
            return res.status(400).json({ message: 'Ya existe una caja con ese nombre en esta sucursal' });
        }

        // Insertar nuevo punto de venta
        const insertResult = await pool.query(`
            INSERT INTO puntos_venta (nombre, sucursal_id, tipo, estado, activo, es_maestra)
            VALUES ($1, $2, 'caja_cobro', 'cerrada', 1, $3)
        `, [nombre, sucursal_id, es_maestra || 0]);

        const puntoVentaId = insertResult.id;
        const result = await pool.query('SELECT * FROM puntos_venta WHERE id = $1', [puntoVentaId]);

        logger.info(`Punto de venta creado: ${nombre} (Sucursal: ${sucursalExists.rows[0].nombre})`);

        res.status(201).json({
            success: true,
            message: 'Punto de venta creado exitosamente',
            puntoVenta: result.rows[0]
        });
    } catch (error) {
        logger.error('Error creando punto de venta:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Actualizar punto de venta
const updatePuntoVenta = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, sucursal_id, descripcion, estado, es_maestra } = req.body;

        // Verificar si el punto de venta existe
        const puntoVentaExists = await pool.query(
            'SELECT id FROM puntos_venta WHERE id = $1',
            [id]
        );

        if (puntoVentaExists.rows.length === 0) {
            return res.status(404).json({ message: 'Punto de venta no encontrado' });
        }

        // Si se cambia de sucursal, verificar que existe
        if (sucursal_id) {
            const sucursalExists = await pool.query(
                'SELECT id FROM sucursales WHERE id = $1',
                [sucursal_id]
            );

            if (sucursalExists.rows.length === 0) {
                return res.status(400).json({ message: 'La sucursal especificada no existe' });
            }
        }

        // Verificar si el nombre ya existe (excluyendo el actual)
        if (nombre && sucursal_id) {
            const nombreExists = await pool.query(
                'SELECT id FROM puntos_venta WHERE nombre = $1 AND sucursal_id = $2 AND id != $3',
                [nombre, sucursal_id, id]
            );

            if (nombreExists.rows.length > 0) {
                return res.status(400).json({ message: 'Ya existe una caja con ese nombre en esta sucursal' });
            }
        }

        // Actualizar punto de venta
        await pool.query(`
            UPDATE puntos_venta
            SET nombre = COALESCE($1, nombre),
                sucursal_id = COALESCE($2, sucursal_id),
                estado = COALESCE($3, estado),
                es_maestra = COALESCE($4, es_maestra)
            WHERE id = $5
        `, [nombre, sucursal_id, estado, es_maestra !== undefined ? es_maestra : null, id]);

        const result = await pool.query('SELECT * FROM puntos_venta WHERE id = $1', [id]);

        logger.info(`Punto de venta actualizado: ID ${id}`);

        res.json({
            success: true,
            message: 'Punto de venta actualizado exitosamente',
            puntoVenta: result.rows[0]
        });
    } catch (error) {
        logger.error('Error actualizando punto de venta:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Eliminar punto de venta
const deletePuntoVenta = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si el punto de venta existe
        const puntoVentaExists = await pool.query(
            'SELECT id, nombre FROM puntos_venta WHERE id = $1',
            [id]
        );

        if (puntoVentaExists.rows.length === 0) {
            return res.status(404).json({ message: 'Punto de venta no encontrado' });
        }

        // Verificar si está siendo utilizada (estado abierta o tiene ventas)
        const estadoCheck = await pool.query(
            'SELECT estado FROM puntos_venta WHERE id = $1',
            [id]
        );

        if (estadoCheck.rows[0].estado === 'abierta') {
            return res.status(400).json({
                message: 'No se puede eliminar una caja que está abierta'
            });
        }

        // Verificar si tiene ventas asociadas
        const ventasCount = await pool.query(
            'SELECT COUNT(*) as count FROM ventas WHERE caja_id = $1',
            [id]
        );

        if (parseInt(ventasCount.rows[0].count) > 0) {
            return res.status(400).json({
                message: 'No se puede eliminar la caja porque tiene ventas asociadas'
            });
        }

        // Eliminar punto de venta
        await pool.query('DELETE FROM puntos_venta WHERE id = $1', [id]);

        logger.info(`Punto de venta eliminado: ${puntoVentaExists.rows[0].nombre} (ID: ${id})`);

        res.json({
            success: true,
            message: 'Punto de venta eliminado exitosamente'
        });
    } catch (error) {
        logger.error('Error eliminando punto de venta:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Obtener puntos de venta por sucursal
const getPuntosVentaBySucursal = async (req, res) => {
    try {
        const { sucursalId } = req.params;
        const result = await pool.query(`
            SELECT
                pv.*
            FROM puntos_venta pv
            WHERE pv.sucursal_id = $1
            ORDER BY pv.nombre
        `, [sucursalId]);

        res.json(result.rows);
    } catch (error) {
        logger.error('Error obteniendo puntos de venta por sucursal:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    getAllPuntosVenta,
    getPuntoVentaById,
    createPuntoVenta,
    updatePuntoVenta,
    deletePuntoVenta,
    getPuntosVentaBySucursal
};