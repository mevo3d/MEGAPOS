const { pool } = require('../config/db');

class ReportesService {

  async getVentasPorPeriodo(sucursalId, fechaInicio, fechaFin) {
    let query = `
      SELECT 
        DATE(v.fecha_venta) as fecha,
        COUNT(*) as num_ventas,
        SUM(v.total) as total_ventas,
        SUM(v.subtotal) as subtotal,
        SUM(v.impuestos) as impuestos,
        SUM(v.total - (v.subtotal * 0.70)) as utilidad_estimada -- Mock Cost if detailed cost missing
      FROM ventas v
      WHERE DATE(v.fecha_venta) BETWEEN $1 AND $2
    `;

    const params = [fechaInicio, fechaFin];

    if (sucursalId) {
      query += ` AND v.sucursal_id = $3`;
      params.push(sucursalId);
    }

    query += ` GROUP BY DATE(v.fecha_venta) ORDER BY fecha ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getProductosMasVendidos(sucursalId, limit = 10) {
    // SQLite Date Logic: datetime('now', '-30 days')
    let query = `
      SELECT 
        p.nombre, p.codigo as sku,
        SUM(vd.cantidad) as cantidad_total,
        SUM(vd.subtotal) as monto_total
      FROM ventas_detalle vd
      JOIN ventas v ON vd.venta_id = v.id
      JOIN productos_catalogo p ON vd.producto_id = p.id
      WHERE v.fecha_venta >= datetime('now', '-30 days')
    `;

    const params = [];
    let paramIdx = 1;

    if (sucursalId) {
      query += ` AND v.sucursal_id = $${paramIdx}`;
      params.push(sucursalId);
      paramIdx++;
    }

    query += ` 
      GROUP BY p.id, p.nombre, p.codigo
      ORDER BY cantidad_total DESC
      LIMIT $${paramIdx}
    `;

    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getBalanceCajas(sucursalId, fecha) {
    let query = `
      SELECT 
        cc.*,
        e.nombre as empleado,
        pv.nombre as caja
      FROM cierres_caja cc
      JOIN empleados e ON cc.empleado_id = e.id
      JOIN puntos_venta pv ON cc.caja_id = pv.id
      WHERE DATE(cc.fecha_apertura) = $1
    `;

    const params = [fecha];
    if (sucursalId) {
      query += ` AND cc.sucursal_id = $2`;
      params.push(sucursalId);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = new ReportesService();
