const { pool } = require('../config/db');
const logger = require('../config/logger');

const getAllProveedores = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM proveedores WHERE activo = 1 ORDER BY nombre');
        res.json(result.rows);
    } catch (error) {
        logger.error('Error obteniendo proveedores:', error);
        res.status(500).json({ message: 'Error al obtener proveedores' });
    }
};

const createProveedor = async (req, res) => {
    try {
        const { nombre, rfc, contacto_nombre, telefono, email, dias_credito } = req.body;

        if (!nombre) {
            return res.status(400).json({ message: 'El nombre del proveedor es obligatorio' });
        }

        const insertResult = await pool.query(`
            INSERT INTO proveedores (nombre, rfc, contacto_nombre, telefono, email, dias_credito)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [nombre, rfc, contacto_nombre, telefono, email, dias_credito || 0]);

        const proveedorId = insertResult.id;
        const result = await pool.query('SELECT * FROM proveedores WHERE id = $1', [proveedorId]);

        res.status(201).json({
            success: true,
            message: 'Proveedor creado exitosamente',
            proveedor: result.rows[0]
        });
    } catch (error) {
        logger.error('Error creando proveedor:', error);
        res.status(500).json({ message: 'Error al crear proveedor' });
    }
};

const updateProveedor = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, rfc, contacto_nombre, telefono, email, dias_credito } = req.body;

        await pool.query(`
            UPDATE proveedores 
            SET nombre = COALESCE($1, nombre),
                rfc = COALESCE($2, rfc),
                contacto_nombre = COALESCE($3, contacto_nombre),
                telefono = COALESCE($4, telefono),
                email = COALESCE($5, email),
                dias_credito = COALESCE($6, dias_credito)
            WHERE id = $7
        `, [nombre, rfc, contacto_nombre, telefono, email, dias_credito, id]);

        const result = await pool.query('SELECT * FROM proveedores WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Proveedor no encontrado' });
        }

        res.json({
            success: true,
            message: 'Proveedor actualizado exitosamente',
            proveedor: result.rows[0]
        });
    } catch (error) {
        logger.error('Error actualizando proveedor:', error);
        res.status(500).json({ message: 'Error al actualizar proveedor' });
    }
};

const deleteProveedor = async (req, res) => {
    try {
        const { id } = req.params;

        // Soft delete
        const result = await pool.query(`
            UPDATE proveedores SET activo = 0 WHERE id = $1
        `, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Proveedor no encontrado' });
        }

        res.json({ message: 'Proveedor eliminado exitosamente' });
    } catch (error) {
        logger.error('Error eliminando proveedor:', error);
        res.status(500).json({ message: 'Error al eliminar proveedor' });
    }
};

module.exports = {
    getAllProveedores,
    createProveedor,
    updateProveedor,
    deleteProveedor
};
