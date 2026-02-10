const { pool } = require('../config/db');
const bcrypt = require('bcrypt');
const logger = require('../config/logger');

// Obtener todos los empleados
const getAllEmpleados = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                e.id,
                e.nombre,
                e.email,
                e.username,
                e.rol,
                e.activo,
                e.sucursal_id,
                e.caja_asignada_id,
                e.created_at,
                s.nombre as sucursal_nombre,
                pv.nombre as caja_nombre
            FROM empleados e
            LEFT JOIN sucursales s ON e.sucursal_id = s.id
            LEFT JOIN puntos_venta pv ON e.caja_asignada_id = pv.id
            ORDER BY e.created_at DESC
        `);

        res.json(result.rows);
    } catch (error) {
        logger.error('Error obteniendo empleados:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Obtener empleado por ID
const getEmpleadoById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT
                e.id,
                e.nombre,
                e.email,
                e.username,
                e.rol,
                e.activo,
                e.sucursal_id,
                e.caja_asignada_id,
                e.created_at,
                e.updated_at,
                s.nombre as sucursal_nombre,
                pv.nombre as caja_nombre,
                ed.rfc, ed.curp, ed.nss, ed.direccion, ed.fecha_ingreso, ed.fecha_nacimiento, 
                ed.contacto_emergencia, ed.banco, ed.clabe, ed.salario_diario_integrado, ed.periodicidad_pago,
                cc.porcentaje_comision
            FROM empleados e
            LEFT JOIN sucursales s ON e.sucursal_id = s.id
            LEFT JOIN puntos_venta pv ON e.caja_asignada_id = pv.id
            LEFT JOIN empleados_detalle ed ON e.id = ed.empleado_id
            LEFT JOIN configuracion_comisiones cc ON e.id = cc.empleado_id
            WHERE e.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Empleado no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error obteniendo empleado:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Crear nuevo empleado
const createEmpleado = async (req, res) => {
    try {
        const { nombre, email, username, password, rol, sucursal_id, caja_asignada_id } = req.body;

        // Validaciones básicas
        if (!nombre || !email || !password || !rol) {
            return res.status(400).json({ message: 'Faltan campos requeridos' });
        }

        // Solo superadmin puede crear otros superadmin
        if (rol === 'superadmin' && req.user.rol !== 'superadmin') {
            return res.status(403).json({ message: 'Solo un Superusuario puede crear otros Superusuarios' });
        }

        // Verificar si el email ya existe
        const emailExists = await pool.query(
            'SELECT id FROM empleados WHERE email = $1',
            [email]
        );

        if (emailExists.rows.length > 0) {
            return res.status(400).json({ message: 'El email ya está registrado' });
        }

        // Verificar si el username ya existe
        if (username) {
            const usernameExists = await pool.query(
                'SELECT id FROM empleados WHERE username = $1',
                [username]
            );

            if (usernameExists.rows.length > 0) {
                return res.status(400).json({ message: 'El username ya está registrado' });
            }
        }

        // Encriptar password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Convertir strings vacíos a null para campos de FK
        const cajaId = caja_asignada_id === '' || caja_asignada_id === undefined ? null : caja_asignada_id;
        const sucursalId = sucursal_id === '' || sucursal_id === undefined ? null : sucursal_id;

        // Insertar nuevo empleado
        const insertResult = await pool.query(`
            INSERT INTO empleados (nombre, email, username, password_hash, rol, sucursal_id, caja_asignada_id, activo)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
        `, [nombre, email, username, password_hash, rol, sucursalId, cajaId]);

        const empleadoId = insertResult.id || insertResult.insertId;
        const result = await pool.query(`
            SELECT id, nombre, email, username, rol, activo, sucursal_id, caja_asignada_id 
            FROM empleados WHERE id = $1
        `, [empleadoId]);

        logger.info(`Empleado creado: ${nombre} (${email})`);

        res.status(201).json({
            success: true,
            message: 'Empleado creado exitosamente',
            empleado: result.rows[0]
        });
    } catch (error) {
        logger.error('Error creando empleado:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Actualizar empleado
const updateEmpleado = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre, email, username, rol, sucursal_id, caja_asignada_id, activo,
            // HR Details
            rfc, curp, nss, direccion, fecha_ingreso, fecha_nacimiento,
            contacto_emergencia, banco, clabe, salario_diario_integrado, periodicidad_pago,
            // Commissions
            porcentaje_comision
        } = req.body;

        // Verificar si el empleado existe
        const empleadoExists = await pool.query(
            'SELECT id FROM empleados WHERE id = $1',
            [id]
        );

        if (empleadoExists.rows.length === 0) {
            return res.status(404).json({ message: 'Empleado no encontrado' });
        }

        // Verificar si el email ya existe (excluyendo el actual)
        const emailExists = await pool.query(
            'SELECT id FROM empleados WHERE email = $1 AND id != $2',
            [email, id]
        );

        if (emailExists.rows.length > 0) {
            return res.status(400).json({ message: 'El email ya está registrado' });
        }

        // Verificar si el username ya existe (excluyendo el actual)
        if (username) {
            const usernameExists = await pool.query(
                'SELECT id FROM empleados WHERE username = $1 AND id != $2',
                [username, id]
            );

            if (usernameExists.rows.length > 0) {
                return res.status(400).json({ message: 'El username ya está registrado' });
            }
        }

        // Actualizar empleado
        // Convertir strings vacíos a null para campos de FK
        const cajaId = caja_asignada_id === '' || caja_asignada_id === undefined ? null : caja_asignada_id;
        const sucursalId = sucursal_id === '' || sucursal_id === undefined ? null : sucursal_id;

        await pool.query(`
            UPDATE empleados
            SET nombre = $1, email = $2, username = $3, rol = $4, sucursal_id = $5, caja_asignada_id = $6, activo = $7
            WHERE id = $8
        `, [nombre, email, username, rol, sucursalId, cajaId, activo, id]);

        // Actualizar/Insertar detalles de RRHH
        await pool.query(`
            INSERT INTO empleados_detalle (
                empleado_id, rfc, curp, nss, direccion, fecha_ingreso, fecha_nacimiento, 
                contacto_emergencia, banco, clabe, salario_diario_integrado, periodicidad_pago, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
            ON CONFLICT (empleado_id) DO UPDATE SET
                rfc = EXCLUDED.rfc,
                curp = EXCLUDED.curp,
                nss = EXCLUDED.nss,
                direccion = EXCLUDED.direccion,
                fecha_ingreso = EXCLUDED.fecha_ingreso,
                fecha_nacimiento = EXCLUDED.fecha_nacimiento,
                contacto_emergencia = EXCLUDED.contacto_emergencia,
                banco = EXCLUDED.banco,
                clabe = EXCLUDED.clabe,
                salario_diario_integrado = EXCLUDED.salario_diario_integrado,
                periodicidad_pago = EXCLUDED.periodicidad_pago,
                updated_at = EXCLUDED.updated_at
        `, [id, rfc, curp, nss, direccion, fecha_ingreso, fecha_nacimiento, contacto_emergencia, banco, clabe, salario_diario_integrado, periodicidad_pago]);

        // Actualizar/Insertar configuración de comisión
        if (porcentaje_comision !== undefined) {
            await pool.query(`
                INSERT INTO configuracion_comisiones (empleado_id, porcentaje_comision, updated_at)
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (empleado_id) DO UPDATE SET
                    porcentaje_comision = EXCLUDED.porcentaje_comision,
                    updated_at = EXCLUDED.updated_at
            `, [id, porcentaje_comision]);
        }

        const result = await pool.query(`
            SELECT id, nombre, email, username, rol, activo, sucursal_id, caja_asignada_id 
            FROM empleados WHERE id = $1
        `, [id]);

        logger.info(`Empleado actualizado: ${nombre} (${email})`);

        res.json({
            success: true,
            message: 'Empleado actualizado exitosamente',
            empleado: result.rows[0]
        });
    } catch (error) {
        logger.error('Error actualizando empleado:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Cambiar contraseña de empleado
const changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ message: 'La contraseña es requerida' });
        }

        // Encriptar password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Actualizar contraseña
        await pool.query(
            'UPDATE empleados SET password_hash = $1 WHERE id = $2',
            [password_hash, id]
        );

        logger.info(`Contraseña actualizada para empleado ID: ${id}`);

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });
    } catch (error) {
        logger.error('Error cambiando contraseña:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Eliminar empleado (desactivar o eliminar permanentemente)
const deleteEmpleado = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si el empleado existe
        const empleadoCheck = await pool.query(
            'SELECT id, nombre, activo FROM empleados WHERE id = $1',
            [id]
        );

        if (empleadoCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Empleado no encontrado' });
        }

        const empleado = empleadoCheck.rows[0];

        // Si ya está inactivo, intentar eliminar permanentemente
        if (!empleado.activo) {
            try {
                await pool.query('DELETE FROM empleados WHERE id = $1', [id]);

                logger.info(`Empleado eliminado permanentemente: ${empleado.nombre} (ID: ${id})`);

                return res.json({
                    success: true,
                    message: 'Empleado eliminado permanentemente'
                });
            } catch (error) {
                // Manejar error de integridad referencial
                if (error.code === '23503' || error.message.includes('FOREIGN KEY') || error.message.includes('constraint failed')) {
                    return res.status(400).json({
                        message: 'No se puede eliminar permanentemente porque tiene registros históricos asociados.'
                    });
                }
                throw error;
            }
        } else {
            // Desactivar empleado en lugar de eliminar
            await pool.query(
                'UPDATE empleados SET activo = 0 WHERE id = $1',
                [id]
            );

            logger.info(`Empleado desactivado: ${empleado.nombre} (ID: ${id})`);

            res.json({
                success: true,
                message: 'Empleado desactivado exitosamente'
            });
        }
    } catch (error) {
        logger.error('Error eliminando/desactivando empleado:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Obtener sucursales para el formulario
const getSucursales = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nombre, tipo FROM sucursales ORDER BY nombre'
        );

        res.json(result.rows);
    } catch (error) {
        logger.error('Error obteniendo sucursales:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// --- Métodos de Documentos HR ---

const getDocumentosEmpleado = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM empleados_documentos WHERE empleado_id = $1 ORDER BY fecha_subida DESC',
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        logger.error('Error obteniendo documentos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const uploadDocumento = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_documento } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No se subió ningún archivo' });
        }

        const result = await pool.query(`
            INSERT INTO empleados_documentos (empleado_id, nombre_documento, tipo_archivo, ruta_archivo)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [id, nombre_documento || req.file.originalname, req.file.mimetype, `/uploads/empleados/${req.file.filename}`]);

        res.status(201).json({
            success: true,
            message: 'Documento subido correctamente',
            documento: result.rows[0]
        });
    } catch (error) {
        logger.error('Error subiendo documento:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

const deleteDocumento = async (req, res) => {
    try {
        const { docId } = req.params;
        // En una implementación real, aquí también borrarías el archivo físico
        await pool.query('DELETE FROM empleados_documentos WHERE id = $1', [docId]);
        res.json({ success: true, message: 'Documento eliminado' });
    } catch (error) {
        logger.error('Error eliminando documento:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    getAllEmpleados,
    getEmpleadoById,
    createEmpleado,
    updateEmpleado,
    changePassword,
    deleteEmpleado,
    getSucursales,
    getDocumentosEmpleado,
    uploadDocumento,
    deleteDocumento
};