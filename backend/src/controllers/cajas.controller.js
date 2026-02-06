const cajasService = require('../services/cajas.service');

const abrirCaja = async (req, res) => {
    const { sucursalId, cajaId, montoInicial } = req.body;
    const empleadoId = req.user.id; // Del token

    try {
        const sesion = await cajasService.abrirCaja(sucursalId, cajaId, empleadoId, montoInicial);
        res.status(201).json(sesion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getEstado = async (req, res) => {
    const { cajaId } = req.params;
    try {
        const sesion = await cajasService.getEstadoCaja(cajaId);
        if (!sesion) {
            return res.json({ estado: 'cerrada' }); // No 404, solo estado cerrada
        }
        res.json(sesion);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const registrarMovimiento = async (req, res) => {
    const { cajaId } = req.params;
    const { tipo, monto, concepto } = req.body;
    const usuarioId = req.user.id;

    try {
        const movimiento = await cajasService.registrarMovimiento(cajaId, tipo, monto, concepto, usuarioId);
        res.status(201).json(movimiento);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const cerrarCaja = async (req, res) => {
    const { cajaId } = req.params;
    const { totalFisico, observaciones } = req.body;

    try {
        const cierre = await cajasService.cerrarCaja(cajaId, totalFisico, observaciones);
        res.json(cierre);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getHistorial = async (req, res) => {
    const { cajaId } = req.params;
    try {
        const historial = await cajasService.getHistorialCierres(cajaId);
        res.json(historial);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMiCaja = async (req, res) => {
    try {
        const caja = await cajasService.getMiCajaAsignada(req.user.id);
        if (!caja) {
            return res.status(404).json({ message: 'No tienes una caja asignada' });
        }
        res.json(caja);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    abrirCaja,
    getEstado,
    registrarMovimiento,
    cerrarCaja,
    getHistorial,
    getMiCaja
};
