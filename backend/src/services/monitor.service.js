const { pool } = require('../config/db');

class MonitorService {

  async getCajasActivas() {
    // Obtener estado de cajas basado en actividad reciente (últimos 15 min)
    // y cierres de caja del día
    const result = await pool.query(`
      SELECT 
        pv.id, pv.nombre, pv.sucursal_id, s.nombre as sucursal_nombre,
        pv.tipo,
        CASE 
          WHEN cc.fecha_cierre IS NULL AND cc.id IS NOT NULL THEN 'abierta'
          ELSE 'cerrada'
        END as estado_caja,
        e.nombre as empleado_actual,
        COALESCE(cc.total_sistema, 0) as total_actual,
        (SELECT COUNT(*) FROM ventas v 
         WHERE v.caja_id = pv.id AND DATE(v.fecha_venta) = CURRENT_DATE) as transacciones_hoy
      FROM puntos_venta pv
      JOIN sucursales s ON pv.sucursal_id = s.id
      LEFT JOIN cierres_caja cc ON pv.id = cc.caja_id AND date(cc.fecha_apertura) = date('now', 'localtime')
      LEFT JOIN empleados e ON cc.empleado_id = e.id
      WHERE pv.activo = 1
      ORDER BY s.id, pv.id
    `);
    return result.rows;
  }

  async getVentasEnVivo() {
    // Últimas 10 ventas en tiempo real de todas las sucursales
    const result = await pool.query(`
      SELECT 
        v.id, v.total, v.fecha_venta,
        s.nombre as sucursal,
        e.nombre as empleado,
        pv.nombre as caja
      FROM ventas v
      JOIN sucursales s ON v.sucursal_id = s.id
      JOIN empleados e ON v.empleado_id = e.id
      JOIN puntos_venta pv ON v.caja_id = pv.id
      ORDER BY v.fecha_venta DESC
      LIMIT 20
    `);
    return result.rows;
  }

  async getConsolidadoDia() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_transacciones,
        COALESCE(SUM(total), 0) as total_ventas,
        COUNT(DISTINCT sucursal_id) as sucursales_activas
      FROM ventas
      WHERE date(fecha_venta) = date('now', 'localtime')
    `);
    return result.rows[0];
  }
}

module.exports = new MonitorService();
