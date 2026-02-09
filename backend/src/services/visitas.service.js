const { pool } = require('../config/db');

class VisitasService {

    /**
     * Registrar una nueva visita con geolocalización
     */
    async registrarVisita(data) {
        const { ruta_id, cliente_id, latitud, longitud, notas, resultado, calificacion, feedback_cliente } = data;

        const res = await pool.query(`
            INSERT INTO visitas_ruteros (ruta_id, cliente_id, fecha_hora, latitud, longitud, notas, resultado, calificacion, feedback_cliente)
            VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [ruta_id, cliente_id, latitud, longitud, notas, resultado || 'visita', calificacion || null, feedback_cliente || null]);

        return res.rows[0];
    }

    /**
     * Actualizar calificación de una visita existente
     */
    async actualizarCalificacion(visitaId, calificacion, feedback) {
        const res = await pool.query(`
            UPDATE visitas_ruteros 
            SET calificacion = $2, feedback_cliente = $3
            WHERE id = $1
            RETURNING *
        `, [visitaId, calificacion, feedback || null]);
        return res.rows[0];
    }

    /**
     * Obtener historial de visitas del día actual (PostgreSQL compatible)
     */
    async getHistorialHoy(rutaId) {
        const res = await pool.query(`
            SELECT v.*, c.nombre as cliente_nombre, c.direccion as cliente_direccion, c.telefono as cliente_telefono
            FROM visitas_ruteros v
            JOIN clientes c ON v.cliente_id = c.id
            WHERE v.ruta_id = $1 AND v.fecha_hora::date = CURRENT_DATE
            ORDER BY v.fecha_hora DESC
        `, [rutaId]);

        return res.rows;
    }

    /**
     * Obtener visitas de un período específico
     */
    async getHistorialPeriodo(rutaId, fechaInicio, fechaFin) {
        const res = await pool.query(`
            SELECT v.*, c.nombre as cliente_nombre, c.direccion as cliente_direccion
            FROM visitas_ruteros v
            JOIN clientes c ON v.cliente_id = c.id
            WHERE v.ruta_id = $1 
            AND v.fecha_hora >= $2 
            AND v.fecha_hora <= $3
            ORDER BY v.fecha_hora DESC
        `, [rutaId, fechaInicio, fechaFin]);

        return res.rows;
    }

    /**
     * Obtener la ruta asignada a un usuario
     */
    async getRutaAsignada(userId) {
        const res = await pool.query('SELECT * FROM rutas WHERE vendedor_id = $1 AND activo = 1', [userId]);
        return res.rows[0];
    }

    /**
     * Obtener estadísticas de visitas del rutero
     */
    async getEstadisticasRutero(rutaId, fechaInicio, fechaFin) {
        const res = await pool.query(`
            SELECT 
                COUNT(*) as total_visitas,
                COUNT(CASE WHEN resultado = 'venta' THEN 1 END) as ventas,
                COUNT(CASE WHEN resultado = 'no_estaba' THEN 1 END) as no_estaba,
                COUNT(CASE WHEN resultado = 'no_compro' THEN 1 END) as no_compro,
                COUNT(CASE WHEN resultado = 'visita' THEN 1 END) as visitas_info,
                AVG(calificacion) as calificacion_promedio,
                COUNT(calificacion) as visitas_calificadas
            FROM visitas_ruteros
            WHERE ruta_id = $1 
            AND fecha_hora >= $2 
            AND fecha_hora <= $3
        `, [rutaId, fechaInicio, fechaFin]);

        return res.rows[0];
    }

    /**
     * Obtener clientes pendientes de visita hoy
     */
    async getClientesPendientesHoy(rutaId) {
        const res = await pool.query(`
            SELECT c.* 
            FROM clientes c
            WHERE c.ruta_asignada_id = $1 
            AND c.id NOT IN (
                SELECT cliente_id FROM visitas_ruteros 
                WHERE ruta_id = $1 AND fecha_hora::date = CURRENT_DATE
            )
            ORDER BY c.nombre
        `, [rutaId]);

        return res.rows;
    }
}

module.exports = new VisitasService();
