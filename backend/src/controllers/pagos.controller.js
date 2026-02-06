const { pool } = require('../config/db');
const logger = require('../config/logger');

const registrarPago = async (req, res) => {
    try {
        const { cliente_id, usuario_id, monto, metodo_pago, referencia } = req.body;

        // Simulating Transaction via global DB (SQLite is serial)
        await pool.query('BEGIN');

        try {
            // 1. Insert Pago
            const insertResult = await pool.query(`
                INSERT INTO pagos_clientes (cliente_id, usuario_id, monto, metodo_pago, referencia)
                VALUES ($1, $2, $3, $4, $5)
            `, [cliente_id, usuario_id, monto, metodo_pago || 'efectivo', referencia]);

            const pagoId = insertResult.id;
            const result = await pool.query('SELECT * FROM pagos_clientes WHERE id = $1', [pagoId]);

            // 2. Update Cliente Saldo (Reducir deuda)
            await pool.query(`
                UPDATE clientes 
                SET saldo_actual = COALESCE(saldo_actual, 0) - $1 
                WHERE id = $2
            `, [monto, cliente_id]);

            await pool.query('COMMIT');

            res.status(201).json({ success: true, pago: result.rows[0], message: 'Pago registrado correctamente' });
        } catch (innerError) {
            await pool.query('ROLLBACK');
            throw innerError;
        }

    } catch (error) {
        logger.error('Error registrando pago:', error);
        res.status(500).json({ message: 'Error al registrar pago' });
    }
};

const getPagosCliente = async (req, res) => {
    try {
        const { id } = req.params; // cliente_id
        const result = await pool.query(`
            SELECT p.*, u.nombre as usuario_nombre
            FROM pagos_clientes p
            LEFT JOIN empleados u ON p.usuario_id = u.id
            WHERE p.cliente_id = $1
            ORDER BY p.fecha_pago DESC
        `, [id]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo pagos' });
    }
};

module.exports = {
    registrarPago,
    getPagosCliente
};
