const { pool } = require('../config/db');
const logger = require('../config/logger');

class AsistenciaService {

    async registrarEntrada(empleadoId, sucursalId, metodo, lat, lng) {
        const client = await pool.connect();
        try {
            // Verificar si ya tiene entrada hoy sin salida
            const existing = await client.query(`
        SELECT id FROM asistencias 
        WHERE empleado_id = $1 AND salida IS NULL AND DATE(entrada) = CURRENT_DATE
      `, [empleadoId]);

            if (existing.rows.length > 0) {
                throw new Error('Ya tienes una entrada registrada sin salida');
            }

            const result = await client.query(`
        INSERT INTO asistencias (
          empleado_id, sucursal_id, entrada, metodo_registro, lat_entrada, lng_entrada, estado
        ) VALUES ($1, $2, NOW(), $3, $4, $5, 'presente')
        RETURNING *
      `, [empleadoId, sucursalId, metodo, lat, lng]);

            return result.rows[0];
        } finally {
            client.release();
        }
    }

    async registrarSalida(empleadoId) {
        const result = await pool.query(`
      UPDATE asistencias 
      SET salida = NOW()
      WHERE empleado_id = $1 AND salida IS NULL
      RETURNING *
    `, [empleadoId]);

        if (result.rows.length === 0) {
            throw new Error('No tienes una entrada activa para registrar salida');
        }

        return result.rows[0];
    }

    async getAsistenciasHoy(sucursalId) {
        const result = await pool.query(`
      SELECT a.*, e.nombre as empleado_nombre
      FROM asistencias a
      JOIN empleados e ON a.empleado_id = e.id
      WHERE a.sucursal_id = $1 AND DATE(a.entrada) = CURRENT_DATE
      ORDER BY a.entrada DESC
    `, [sucursalId]);
        return result.rows;
    }
}

module.exports = new AsistenciaService();
