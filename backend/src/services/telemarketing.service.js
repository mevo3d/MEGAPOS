const { pool } = require('../config/db');

class TelemarketingService {

    // --- Estadísticas de Efectividad ---

    async getEstadisticasEfectividad(usuarioId, periodo = 'semana') {
        const client = await pool.connect();
        try {
            // Determinar rango de fechas según período
            let fechaInicio;
            if (periodo === 'dia') {
                fechaInicio = 'CURRENT_DATE';
            } else if (periodo === 'semana') {
                fechaInicio = "CURRENT_DATE - INTERVAL '7 days'";
            } else if (periodo === 'mes') {
                fechaInicio = "DATE_TRUNC('month', CURRENT_DATE)";
            } else {
                fechaInicio = "CURRENT_DATE - INTERVAL '7 days'";
            }

            // 1. Estadísticas generales del usuario
            const statsRes = await client.query(`
                SELECT 
                    COUNT(*) as total_llamadas,
                    COUNT(CASE WHEN resultado = 'venta_cerrada' THEN 1 END) as ventas,
                    COUNT(CASE WHEN resultado = 'contesto' THEN 1 END) as interesados,
                    COUNT(CASE WHEN resultado = 'no_interesado' THEN 1 END) as no_interesados,
                    COUNT(CASE WHEN resultado = 'buzon' THEN 1 END) as buzon,
                    COUNT(CASE WHEN resultado = 'ocupado' THEN 1 END) as ocupados,
                    COUNT(CASE WHEN resultado = 'numero_incorrecto' THEN 1 END) as numeros_incorrectos,
                    COALESCE(AVG(duracion_segundos), 0) as duracion_promedio
                FROM llamadas_historial
                WHERE usuario_id = $1 AND fecha >= ${fechaInicio}
            `, [usuarioId]);

            // 2. Llamadas por día (últimos 7 días)
            const llamadasDiaRes = await client.query(`
                SELECT 
                    DATE(fecha) as dia,
                    COUNT(*) as total,
                    COUNT(CASE WHEN resultado = 'venta_cerrada' THEN 1 END) as ventas
                FROM llamadas_historial
                WHERE usuario_id = $1 AND fecha >= CURRENT_DATE - INTERVAL '7 days'
                GROUP BY DATE(fecha)
                ORDER BY dia DESC
            `, [usuarioId]);

            // 3. Meta diaria (podría venir de configuración)
            const metaDiaria = 20; // Por defecto
            const llamadasHoyRes = await client.query(`
                SELECT COUNT(*) as total
                FROM llamadas_historial
                WHERE usuario_id = $1 AND DATE(fecha) = CURRENT_DATE
            `, [usuarioId]);

            // 4. Comparativa con otros usuarios (ranking)
            const rankingRes = await client.query(`
                SELECT 
                    u.id,
                    u.nombre,
                    COUNT(lh.id) as total_llamadas,
                    COUNT(CASE WHEN lh.resultado = 'venta_cerrada' THEN 1 END) as ventas,
                    ROUND(
                        CASE WHEN COUNT(lh.id) > 0 
                        THEN COUNT(CASE WHEN lh.resultado = 'venta_cerrada' THEN 1 END)::numeric / COUNT(lh.id) * 100 
                        ELSE 0 END, 1
                    ) as tasa_conversion
                FROM usuarios u
                LEFT JOIN llamadas_historial lh ON u.id = lh.usuario_id AND lh.fecha >= ${fechaInicio}
                WHERE u.rol IN ('telemarketing', 'admin')
                GROUP BY u.id, u.nombre
                HAVING COUNT(lh.id) > 0
                ORDER BY ventas DESC, total_llamadas DESC
                LIMIT 10
            `);

            // 5. Distribución de resultados para gráfica
            const stats = statsRes.rows[0];
            const distribucion = [
                { label: 'Ventas', value: parseInt(stats.ventas), color: '#10B981' },
                { label: 'Interesados', value: parseInt(stats.interesados), color: '#3B82F6' },
                { label: 'No Interesados', value: parseInt(stats.no_interesados), color: '#EF4444' },
                { label: 'Buzón', value: parseInt(stats.buzon), color: '#F59E0B' },
                { label: 'Ocupados', value: parseInt(stats.ocupados), color: '#8B5CF6' },
                { label: 'Núm. Incorrecto', value: parseInt(stats.numeros_incorrectos), color: '#6B7280' }
            ];

            const totalLlamadas = parseInt(stats.total_llamadas);
            const tasaConversion = totalLlamadas > 0
                ? ((parseInt(stats.ventas) / totalLlamadas) * 100).toFixed(1)
                : 0;

            return {
                resumen: {
                    totalLlamadas: totalLlamadas,
                    ventas: parseInt(stats.ventas),
                    tasaConversion: parseFloat(tasaConversion),
                    duracionPromedio: Math.round(parseFloat(stats.duracion_promedio)),
                    llamadasHoy: parseInt(llamadasHoyRes.rows[0]?.total || 0),
                    metaDiaria: metaDiaria,
                    progresoMeta: Math.min(100, Math.round((parseInt(llamadasHoyRes.rows[0]?.total || 0) / metaDiaria) * 100))
                },
                distribucion: distribucion.filter(d => d.value > 0),
                llamadasPorDia: llamadasDiaRes.rows.map(r => ({
                    dia: r.dia,
                    total: parseInt(r.total),
                    ventas: parseInt(r.ventas)
                })),
                ranking: rankingRes.rows.map((r, idx) => ({
                    posicion: idx + 1,
                    id: r.id,
                    nombre: r.nombre,
                    llamadas: parseInt(r.total_llamadas),
                    ventas: parseInt(r.ventas),
                    tasaConversion: parseFloat(r.tasa_conversion),
                    esUsuarioActual: r.id === usuarioId
                }))
            };
        } finally {
            client.release();
        }
    }

    // --- Tareas / CRM ---

    async getTareasPendientes(usuarioId) {
        const res = await pool.query(`
            SELECT t.*, c.nombre as cliente_nombre, c.telefono as cliente_telefono
            FROM crm_tareas t
            LEFT JOIN clientes c ON t.cliente_id = c.id
            WHERE t.usuario_id = $1 AND t.estado = 'pendiente'
            ORDER BY t.prioridad ASC, t.fecha_programada ASC
        `, [usuarioId]);
        return res.rows;
    }

    async crearTarea(data) {
        const { usuario_id, cliente_id, tipo, titulo, descripcion, fecha_programada, prioridad } = data;
        const res = await pool.query(`
            INSERT INTO crm_tareas (usuario_id, cliente_id, tipo, titulo, descripcion, fecha_programada, prioridad)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [usuario_id, cliente_id, tipo, titulo, descripcion, fecha_programada, prioridad || 'media']);
        return res.rows[0];
    }

    async completarTarea(id, notas) {
        const res = await pool.query(`
            UPDATE crm_tareas 
            SET estado = 'completada', completed_at = CURRENT_TIMESTAMP, descripcion = descripcion || ' - Notas cierre: ' || $2
            WHERE id = $1
            RETURNING *
        `, [id, notas || '']);
        return res.rows[0];
    }

    // --- Llamadas ---

    async registrarLlamada(data) {
        const { cliente_id, usuario_id, resultado, duracion, notas, proxima_llamada } = data;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Registrar Historial
            const resCall = await client.query(`
                INSERT INTO llamadas_historial (cliente_id, usuario_id, resultado, duracion_segundos, notas, fecha_proxima_llamada)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, [cliente_id, usuario_id, resultado, duracion, notas, proxima_llamada]);

            // 2. Si hay próxima llamada, crear tarea automática
            if (proxima_llamada) {
                await client.query(`
                    INSERT INTO crm_tareas (usuario_id, cliente_id, tipo, titulo, fecha_programada, prioridad)
                    VALUES ($1, $2, 'llamada', 'Seguimiento programado', $3, 'alta')
                `, [usuario_id, cliente_id, proxima_llamada]);
            }

            // 3. Update cliente 'ultima_interaccion' (if we had that column, optional)

            await client.query('COMMIT');
            return resCall.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getHistorialLlamadas(usuarioId) {
        // Filtro opcional por fecha (hoy)
        const res = await pool.query(`
            SELECT h.*, c.nombre as cliente_nombre 
            FROM llamadas_historial h
            JOIN clientes c ON h.cliente_id = c.id
            WHERE h.usuario_id = $1
            ORDER BY h.fecha DESC
            LIMIT 50
        `, [usuarioId]);
        return res.rows;
    }

    // --- Clientes y Metas ---

    async getClientesAsignados(usuarioId) {
        const res = await pool.query(`
            SELECT c.*, 
            (SELECT MAX(fecha) FROM llamadas_historial WHERE cliente_id = c.id) as ultima_llamada
            FROM clientes c
            WHERE c.vendedor_asignado_id = $1
            ORDER BY ultima_llamada ASC NULLS FIRST
        `, [usuarioId]);
        return res.rows;
    }
}

module.exports = new TelemarketingService();
