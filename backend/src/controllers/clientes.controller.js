const { pool } = require('../config/db');
const logger = require('../config/logger');

const getClientes = async (req, res) => {
    try {
        const { search, limit = 20 } = req.query;
        let query = `
            SELECT c.*, lp.nombre as lista_precio_nombre, COALESCE(pc.puntos_actuales, 0) as puntos_actuales
            FROM clientes c
            LEFT JOIN listas_precios lp ON c.lista_precio_id = lp.id
            LEFT JOIN puntos_cliente pc ON c.id = pc.cliente_id
            WHERE c.activo = 1
        `;
        const params = [];

        if (search) {
            query += ` AND (c.nombre LIKE $1 OR c.rfc LIKE $1 OR c.telefono LIKE $1)`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY c.nombre LIMIT ${params.length + 1}`;
        params.push(limit);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error obteniendo clientes:', error);
        res.status(500).json({ message: 'Error interno' });
    }
};

const getClienteById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT c.*, COALESCE(pc.puntos_actuales, 0) as puntos_actuales 
            FROM clientes c
            LEFT JOIN puntos_cliente pc ON c.id = pc.cliente_id
            WHERE c.id = $1
        `, [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Cliente no encontrado' });

        // Obtener historial de notas
        const notas = await pool.query(`
            SELECT n.*, u.nombre as usuario_nombre
            FROM crm_notas n
            LEFT JOIN empleados u ON n.usuario_id = u.id
            WHERE n.cliente_id = $1
            ORDER BY n.id DESC
        `, [id]);

        res.json({ ...result.rows[0], historial: notas.rows });
    } catch (error) {
        logger.error('Error obteniendo cliente:', error);
        res.status(500).json({ message: 'Error obteniendo cliente: ' + error.message });
    }
};

const createCliente = async (req, res) => {
    try {
        const { nombre, rfc, email, telefono, direccion, ciudad, codigo_postal, lista_precio_id, dias_credito, limite_credito } = req.body;

        const insertResult = await pool.query(`
            INSERT INTO clientes (nombre, rfc, email, telefono, direccion, ciudad, codigo_postal, lista_precio_id, dias_credito, limite_credito)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         `, [nombre, rfc, email, telefono, direccion, ciudad, codigo_postal, lista_precio_id || 1, dias_credito || 0, limite_credito || 0]);

        const clienteId = insertResult.id;
        const result = await pool.query('SELECT * FROM clientes WHERE id = $1', [clienteId]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        logger.error(error);
        res.status(400).json({ message: 'Error creando cliente' });
    }
};

const updateCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        // Simplified dynamic update
        const fields = [];
        const values = [];
        let idx = 1;

        // Safe fields whitelist
        const whitelist = ['nombre', 'rfc', 'email', 'telefono', 'direccion', 'ciudad', 'codigo_postal', 'lista_precio_id', 'dias_credito', 'limite_credito', 'saldo_actual'];

        Object.keys(data).forEach(key => {
            if (whitelist.includes(key)) {
                fields.push(`${key} = $${idx}`);
                values.push(data[key]);
                idx++;
            }
        });

        if (fields.length === 0) return res.status(400).json({ message: 'Datos no válidos' });

        values.push(id);
        await pool.query(
            `UPDATE clientes SET ${fields.join(', ')} WHERE id = $${idx}`,
            values
        );
        const result = await pool.query('SELECT * FROM clientes WHERE id = $1', [id]);
        res.json(result.rows[0]);

    } catch (error) {
        res.status(500).json({ message: 'Error actualizando cliente' });
    }
};

const getTareasPendientes = async (req, res) => {
    try {
        const { usuario_id } = req.query; // Or from auth middleware via req.user.id
        // Si no se envía usuario, traer tareas del usuario autenticado (si middleware lo inyecta) o todas?
        // Asumiremos que el frontend envía el ID o usamos auth.

        let query = `
            SELECT n.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono, c.saldo_actual
            FROM crm_notas n
            JOIN clientes c ON n.cliente_id = c.id
            WHERE n.completado = 0
        `;
        const params = [];

        if (usuario_id) {
            query += ` AND n.usuario_id = $1`;
            params.push(usuario_id);
        }

        query += ` ORDER BY n.fecha_proximo_contacto ASC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error tareas pendientes:', error);
        res.status(500).json({ message: 'Error obteniendo tareas' });
    }
};

const addNotaCRM = async (req, res) => {
    try {
        const { id } = req.params; // cliente_id
        const { nota, tipo_accion, fecha_proximo_contacto, usuario_id, es_tarea } = req.body;

        const completado = es_tarea ? 0 : 1;
        // Si es tarea, usaremos fecha_proximo_contacto como la fecha de ejecución (schedulada)
        // Si fecha_proximo_contacto existe, suele ser una tarea futura.

        // Logical Fix: If I add a note "Called today", and set "Next call tomorrow", 
        // Do I want 1 record or 2?
        // Usually 2 records: 
        // 1. History: "Called today" (Done)
        // 2. Task: "Call tomorrow" (Pending) (Optional automatic creation?)
        // For simplicity, handle separately or let frontend call twice?
        // Simple approach: This endpoint creates ONE record. 
        // Users will use "Schedule Follow-up" to create a pending task.

        await pool.query(`
            INSERT INTO crm_notas (cliente_id, usuario_id, nota, tipo_accion, fecha_proximo_contacto, completado)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, usuario_id, nota, tipo_accion || 'nota', fecha_proximo_contacto, completado]);

        res.json({ success: true, message: 'Registro guardado' });

    } catch (error) {
        res.status(500).json({ message: 'Error agregando nota' });
    }
};

const completarTarea = async (req, res) => {
    try {
        const { id } = req.params; // nota_id (tarea)
        await pool.query('UPDATE crm_notas SET completado = 1 WHERE id = $1', [id]);
        res.json({ success: true, message: 'Tarea completada' });
    } catch (error) {
        res.status(500).json({ message: 'Error completando tarea' });
    }
};

module.exports = {
    getClientes,
    getClienteById,
    createCliente,
    updateCliente,
    addNotaCRM,
    getTareasPendientes,
    completarTarea
};
