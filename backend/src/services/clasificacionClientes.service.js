const { pool } = require('../config/db');

class ClasificacionClientesService {

    // ==================== TIPOS DE CLIENTE ====================

    /**
     * Obtener todos los tipos de cliente
     */
    async getTiposCliente() {
        const result = await pool.query(`
      SELECT 
        tc.*,
        COUNT(c.id) as total_clientes
      FROM tipos_cliente tc
      LEFT JOIN clientes c ON c.tipo_cliente_id = tc.id AND c.activo = true
      WHERE tc.activo = true
      GROUP BY tc.id
      ORDER BY tc.prioridad DESC, tc.nombre
    `);
        return result.rows;
    }

    /**
     * Crear nuevo tipo de cliente
     */
    async crearTipoCliente(data) {
        const { nombre, descripcion, color, icono, prioridad } = data;
        const result = await pool.query(`
      INSERT INTO tipos_cliente (nombre, descripcion, color, icono, prioridad)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [nombre, descripcion, color || '#6366f1', icono || 'user', prioridad || 0]);
        return result.rows[0];
    }

    /**
     * Actualizar tipo de cliente
     */
    async actualizarTipoCliente(id, data) {
        const { nombre, descripcion, color, icono, prioridad, activo } = data;
        const result = await pool.query(`
      UPDATE tipos_cliente 
      SET nombre = COALESCE($1, nombre),
          descripcion = COALESCE($2, descripcion),
          color = COALESCE($3, color),
          icono = COALESCE($4, icono),
          prioridad = COALESCE($5, prioridad),
          activo = COALESCE($6, activo),
          updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [nombre, descripcion, color, icono, prioridad, activo, id]);
        return result.rows[0];
    }

    // ==================== ETIQUETAS ====================

    /**
     * Obtener todas las etiquetas
     */
    async getEtiquetas() {
        const result = await pool.query(`
      SELECT 
        e.*,
        COUNT(ce.id) as total_clientes
      FROM etiquetas_cliente e
      LEFT JOIN clientes_etiquetas ce ON ce.etiqueta_id = e.id
      GROUP BY e.id
      ORDER BY e.nombre
    `);
        return result.rows;
    }

    /**
     * Crear nueva etiqueta
     */
    async crearEtiqueta(data) {
        const { nombre, color } = data;
        const result = await pool.query(`
      INSERT INTO etiquetas_cliente (nombre, color)
      VALUES ($1, $2)
      RETURNING *
    `, [nombre, color || '#8b5cf6']);
        return result.rows[0];
    }

    /**
     * Eliminar etiqueta
     */
    async eliminarEtiqueta(id) {
        await pool.query('DELETE FROM clientes_etiquetas WHERE etiqueta_id = $1', [id]);
        await pool.query('DELETE FROM etiquetas_cliente WHERE id = $1', [id]);
        return { success: true };
    }

    // ==================== CLASIFICACIÓN DE CLIENTES ====================

    /**
     * Obtener clientes con su clasificación completa
     */
    async getClientesConClasificacion(filtros = {}) {
        const {
            tipo_cliente_id,
            potencial_compra,
            frecuencia_compra,
            etiqueta_id,
            busqueda,
            limit = 50,
            offset = 0
        } = filtros;

        let query = `
      SELECT 
        c.*,
        tc.nombre as tipo_cliente_nombre,
        tc.color as tipo_cliente_color,
        tc.icono as tipo_cliente_icono,
        COALESCE(
          json_agg(
            json_build_object(
              'id', e.id,
              'nombre', e.nombre,
              'color', e.color
            )
          ) FILTER (WHERE e.id IS NOT NULL),
          '[]'
        ) as etiquetas
      FROM clientes c
      LEFT JOIN tipos_cliente tc ON tc.id = c.tipo_cliente_id
      LEFT JOIN clientes_etiquetas ce ON ce.cliente_id = c.id
      LEFT JOIN etiquetas_cliente e ON e.id = ce.etiqueta_id
      WHERE c.activo = true
    `;

        const params = [];
        let paramCount = 1;

        if (tipo_cliente_id) {
            query += ` AND c.tipo_cliente_id = $${paramCount++}`;
            params.push(tipo_cliente_id);
        }

        if (potencial_compra) {
            query += ` AND c.potencial_compra = $${paramCount++}`;
            params.push(potencial_compra);
        }

        if (frecuencia_compra) {
            query += ` AND c.frecuencia_compra = $${paramCount++}`;
            params.push(frecuencia_compra);
        }

        if (etiqueta_id) {
            query += ` AND c.id IN (SELECT cliente_id FROM clientes_etiquetas WHERE etiqueta_id = $${paramCount++})`;
            params.push(etiqueta_id);
        }

        if (busqueda) {
            query += ` AND (
        c.nombre ILIKE $${paramCount} OR 
        c.nombre_comercial ILIKE $${paramCount} OR 
        c.telefono ILIKE $${paramCount} OR
        c.email ILIKE $${paramCount}
      )`;
            params.push(`%${busqueda}%`);
            paramCount++;
        }

        query += `
      GROUP BY c.id, tc.nombre, tc.color, tc.icono
      ORDER BY c.total_compras DESC NULLS LAST, c.nombre
      LIMIT $${paramCount++} OFFSET $${paramCount}
    `;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Actualizar clasificación de un cliente
     */
    async actualizarClasificacion(clienteId, data) {
        const { tipo_cliente_id, potencial_compra, frecuencia_compra, notas_crm } = data;

        const result = await pool.query(`
      UPDATE clientes 
      SET 
        tipo_cliente_id = COALESCE($1, tipo_cliente_id),
        potencial_compra = COALESCE($2, potencial_compra),
        frecuencia_compra = COALESCE($3, frecuencia_compra),
        notas_crm = COALESCE($4, notas_crm)
      WHERE id = $5
      RETURNING *
    `, [tipo_cliente_id, potencial_compra, frecuencia_compra, notas_crm, clienteId]);

        return result.rows[0];
    }

    /**
     * Asignar etiquetas a un cliente (reemplaza las existentes)
     */
    async asignarEtiquetas(clienteId, etiquetaIds) {
        // Eliminar etiquetas existentes
        await pool.query('DELETE FROM clientes_etiquetas WHERE cliente_id = $1', [clienteId]);

        // Insertar nuevas etiquetas
        if (etiquetaIds && etiquetaIds.length > 0) {
            const values = etiquetaIds.map((_, i) => `($1, $${i + 2})`).join(', ');
            await pool.query(
                `INSERT INTO clientes_etiquetas (cliente_id, etiqueta_id) VALUES ${values}`,
                [clienteId, ...etiquetaIds]
            );
        }

        return { success: true };
    }

    /**
     * Agregar una etiqueta a un cliente
     */
    async agregarEtiqueta(clienteId, etiquetaId) {
        await pool.query(`
      INSERT INTO clientes_etiquetas (cliente_id, etiqueta_id)
      VALUES ($1, $2)
      ON CONFLICT (cliente_id, etiqueta_id) DO NOTHING
    `, [clienteId, etiquetaId]);
        return { success: true };
    }

    /**
     * Quitar una etiqueta de un cliente
     */
    async quitarEtiqueta(clienteId, etiquetaId) {
        await pool.query(
            'DELETE FROM clientes_etiquetas WHERE cliente_id = $1 AND etiqueta_id = $2',
            [clienteId, etiquetaId]
        );
        return { success: true };
    }

    // ==================== ESTADÍSTICAS ====================

    /**
     * Obtener estadísticas de clasificación
     */
    async getEstadisticasClasificacion() {
        // Por tipo de cliente
        const porTipo = await pool.query(`
      SELECT 
        COALESCE(tc.nombre, 'Sin clasificar') as tipo,
        COALESCE(tc.color, '#6b7280') as color,
        COUNT(c.id) as cantidad,
        SUM(COALESCE(c.total_compras, 0)) as total_compras
      FROM clientes c
      LEFT JOIN tipos_cliente tc ON tc.id = c.tipo_cliente_id
      WHERE c.activo = true
      GROUP BY tc.nombre, tc.color
      ORDER BY cantidad DESC
    `);

        // Por potencial
        const porPotencial = await pool.query(`
      SELECT 
        potencial_compra as potencial,
        COUNT(*) as cantidad
      FROM clientes
      WHERE activo = true
      GROUP BY potencial_compra
      ORDER BY cantidad DESC
    `);

        // Por frecuencia
        const porFrecuencia = await pool.query(`
      SELECT 
        frecuencia_compra as frecuencia,
        COUNT(*) as cantidad
      FROM clientes
      WHERE activo = true
      GROUP BY frecuencia_compra
      ORDER BY cantidad DESC
    `);

        // Clientes que necesitan atención (sin compras en 30 días)
        const necesitanAtencion = await pool.query(`
      SELECT COUNT(*) as cantidad
      FROM clientes
      WHERE activo = true 
        AND (ultima_compra IS NULL OR ultima_compra < NOW() - INTERVAL '30 days')
    `);

        return {
            por_tipo: porTipo.rows,
            por_potencial: porPotencial.rows,
            por_frecuencia: porFrecuencia.rows,
            necesitan_atencion: parseInt(necesitanAtencion.rows[0]?.cantidad || 0)
        };
    }

    /**
     * Obtener clientes destacados (mejores clientes)
     */
    async getClientesDestacados(limit = 10) {
        const result = await pool.query(`
      SELECT 
        c.*,
        tc.nombre as tipo_cliente_nombre,
        tc.color as tipo_cliente_color
      FROM clientes c
      LEFT JOIN tipos_cliente tc ON tc.id = c.tipo_cliente_id
      WHERE c.activo = true AND c.total_compras > 0
      ORDER BY c.total_compras DESC
      LIMIT $1
    `, [limit]);
        return result.rows;
    }

    /**
     * Clasificación automática basada en comportamiento
     */
    async clasificacionAutomatica() {
        // Actualizar frecuencia basada en cantidad de compras
        await pool.query(`
      UPDATE clientes SET
        frecuencia_compra = CASE
          WHEN cantidad_compras >= 20 THEN 'vip'
          WHEN cantidad_compras >= 10 THEN 'frecuente'
          WHEN cantidad_compras >= 5 THEN 'regular'
          WHEN cantidad_compras >= 1 THEN 'ocasional'
          ELSE 'nuevo'
        END
      WHERE activo = true
    `);

        // Actualizar potencial basado en promedio de compra
        await pool.query(`
      UPDATE clientes SET
        potencial_compra = CASE
          WHEN cantidad_compras > 0 AND (total_compras / cantidad_compras) >= 5000 THEN 'premium'
          WHEN cantidad_compras > 0 AND (total_compras / cantidad_compras) >= 2000 THEN 'alto'
          WHEN cantidad_compras > 0 AND (total_compras / cantidad_compras) >= 500 THEN 'medio'
          ELSE 'bajo'
        END
      WHERE activo = true AND cantidad_compras > 0
    `);

        return { success: true, mensaje: 'Clasificación automática completada' };
    }
}

module.exports = new ClasificacionClientesService();
