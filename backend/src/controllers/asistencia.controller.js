const asistenciaService = require('../services/asistencia.service');
const logger = require('../config/logger');

const registrarEntrada = async (req, res) => {
    try {
        const { metodo, lat, lng } = req.body;
        const asistencia = await asistenciaService.registrarEntrada(
            req.user.id,
            req.sucursalId,
            metodo || 'manual',
            lat,
            lng
        );

        // Notificar al admin panel
        const { io } = require('../server');
        io.to('admin-panel').emit('asistencia-registrada', {
            empleado: req.user.nombre, // Asumiendo que el nombre viene en el token o se busca
            sucursal_id: req.sucursalId,
            hora: new Date()
        });

        res.status(201).json({ success: true, asistencia });
    } catch (error) {
        logger.error('Error registrando entrada:', error);
        res.status(400).json({ message: error.message });
    }
};

const registrarSalida = async (req, res) => {
    try {
        const asistencia = await asistenciaService.registrarSalida(req.user.id);
        res.json({ success: true, asistencia });
    } catch (error) {
        logger.error('Error registrando salida:', error);
        res.status(400).json({ message: error.message });
    }
};

const getAsistenciasHoy = async (req, res) => {
    try {
        const asistencias = await asistenciaService.getAsistenciasHoy(req.sucursalId);
        res.json(asistencias);
    } catch (error) {
        logger.error('Error obteniendo asistencias:', error);
        res.status(500).json({ message: 'Error al obtener asistencias' });
    }
};

module.exports = { registrarEntrada, registrarSalida, getAsistenciasHoy };
