const { pool } = require('../config/db');
const logger = require('../config/logger');

const abrirCaja = async (sucursalId, cajaId, empleadoId, montoInicial) => {
    // 1. Verificar si ya hay una sesión abierta para esta caja
    const checkOpen = await pool.query(
        "SELECT id FROM cierres_caja WHERE caja_id = $1 AND estado = 'abierta'",
        [cajaId]
    );

    if (checkOpen.rows.length > 0) {
        throw new Error('La caja ya se encuentra abierta');
    }

    // 2. Crear nueva sesión
    // Usamos CURRENT_TIMESTAMP para compatibilidad con SQLite
    const result = await pool.query(
        `INSERT INTO cierres_caja 
        (sucursal_id, caja_id, empleado_id, fecha_apertura, monto_inicial) 
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)`,
        [sucursalId, cajaId, empleadoId, montoInicial]
    );

    // En SQLite el RETURNING no funciona igual en el wrapper, pero el wrapper devuelve el ID
    const insertId = result.id || result.insertId;

    const sessResult = await pool.query("SELECT * FROM cierres_caja WHERE id = $1", [insertId]);

    logger.info(`Caja ${cajaId} abierta por empleado ${empleadoId} con $${montoInicial}`);
    return sessResult.rows[0];
};

const getEstadoCaja = async (cajaId) => {
    const result = await pool.query(
        `SELECT c.*, e.nombre as empleado_nombre 
         FROM cierres_caja c
         JOIN empleados e ON c.empleado_id = e.id
         WHERE c.caja_id = $1 AND c.estado = 'abierta'
         ORDER BY c.fecha_apertura DESC LIMIT 1`,
        [cajaId]
    );

    if (result.rows.length === 0) {
        return null; // Caja cerrada
    }

    return result.rows[0];
};

const getMiCajaAsignada = async (empleadoId) => {
    logger.info(`Buscando caja asignada para empleado ID: ${empleadoId}`);

    // Primero verificar el empleado y su caja_asignada_id
    const empleadoCheck = await pool.query(
        'SELECT id, nombre, caja_asignada_id FROM empleados WHERE id = $1',
        [empleadoId]
    );

    if (empleadoCheck.rows.length === 0) {
        logger.error(`Empleado ${empleadoId} no encontrado`);
        return null;
    }

    const empleado = empleadoCheck.rows[0];
    logger.info(`Empleado encontrado: ${empleado.nombre}, caja_asignada_id: ${empleado.caja_asignada_id}`);

    if (!empleado.caja_asignada_id) {
        logger.warn(`Empleado ${empleado.nombre} no tiene caja asignada`);
        return null;
    }

    const result = await pool.query(
        `SELECT pv.*, s.nombre as sucursal_nombre
         FROM puntos_venta pv
         JOIN sucursales s ON pv.sucursal_id = s.id
         WHERE pv.id = $1`,
        [empleado.caja_asignada_id]
    );

    if (result.rows.length === 0) {
        logger.error(`Caja ${empleado.caja_asignada_id} no existe en puntos_venta`);
        return null;
    }

    logger.info(`Caja encontrada: ${result.rows[0].nombre} (${result.rows[0].es_maestra ? 'Maestra' : 'Preventa'})`);
    return result.rows[0];
};

const registrarMovimiento = async (cajaId, tipo, monto, concepto, usuarioId) => {
    const estado = await getEstadoCaja(cajaId);
    if (!estado) throw new Error('La caja está cerrada');

    try {
        // 1. Registrar movimiento
        const movResult = await pool.query(
            `INSERT INTO movimientos_caja (cierre_id, tipo, monto, concepto, usuario_autorizo)
             VALUES ($1, $2, $3, $4, $5)`,
            [estado.id, tipo, monto, concepto, usuarioId]
        );

        const insertId = movResult.id || movResult.insertId;

        // 2. Actualizar totales en cierres_caja
        let updateQuery = "";
        if (tipo === 'ingreso') {
            updateQuery = "UPDATE cierres_caja SET otros_ingresos = otros_ingresos + $1 WHERE id = $2";
        } else {
            updateQuery = "UPDATE cierres_caja SET retiros = retiros + $1 WHERE id = $2";
        }

        await pool.query(updateQuery, [monto, estado.id]);

        const finalMov = await pool.query("SELECT * FROM movimientos_caja WHERE id = $1", [insertId]);
        return finalMov.rows[0];

    } catch (error) {
        throw error;
    }
};

const cerrarCaja = async (cajaId, totalFisico, observaciones) => {
    const estado = await getEstadoCaja(cajaId);
    if (!estado) throw new Error('La caja ya está cerrada');

    const totalSistema = parseFloat(estado.monto_inicial || 0) +
        parseFloat(estado.ventas_efectivo || 0) +
        parseFloat(estado.otros_ingresos || 0) -
        parseFloat(estado.retiros || 0);

    const diferencia = parseFloat(totalFisico) - totalSistema;

    await pool.query(
        `UPDATE cierres_caja 
         SET fecha_cierre = CURRENT_TIMESTAMP, 
             total_fisico = $1, 
             diferencia = $2, 
             observaciones = $3, 
             estado = 'cerrada'
         WHERE id = $4`,
        [totalFisico, diferencia, observaciones, estado.id]
    );

    const result = await pool.query("SELECT * FROM cierres_caja WHERE id = $1", [estado.id]);

    logger.info(`Caja ${cajaId} cerrada. Sistema: ${totalSistema}, Físico: ${totalFisico}, Dif: ${diferencia}`);
    return result.rows[0];
};

const getHistorialCierres = async (cajaId, limite = 10) => {
    const result = await pool.query(
        `SELECT c.*, e.nombre as empleado_nombre 
         FROM cierres_caja c
         JOIN empleados e ON c.empleado_id = e.id
         WHERE c.caja_id = $1 AND c.estado = 'cerrada'
         ORDER BY c.fecha_cierre DESC LIMIT $2`,
        [cajaId, limite]
    );
    return result.rows;
};

module.exports = {
    abrirCaja,
    getEstadoCaja,
    getMiCajaAsignada,
    registrarMovimiento,
    cerrarCaja,
    getHistorialCierres
};
