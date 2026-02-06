const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db');
const ExcelImportService = require('../services/excelImport.service');
const auth = require('../middleware/auth');

const router = express.Router();
const excelImportService = new ExcelImportService();

// Configuración de multer para archivos Excel
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/temp');

    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  // Solo permitir archivos Excel
  const allowedTypes = [
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/octet-stream' // A veces .xlsx se detecta así
  ];

  const allowedExtensions = ['.xls', '.xlsx'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos Excel (.xls, .xlsx)'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  }
});

/**
 * @route GET /api/import/plantilla
 * @desc Descargar plantilla de Excel para importación
 * @access Private (requiere rol admin o gerente)
 */
router.get('/plantilla', auth.verifyToken, async (req, res) => {
  try {
    // Verificar permisos
    if (req.user.rol !== 'admin' && req.user.rol !== 'gerente') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para descargar plantillas'
      });
    }

    await excelImportService.generarPlantilla(res);

  } catch (error) {
    console.error('Error generando plantilla:', error);
    res.status(500).json({
      success: false,
      message: 'Error al generar la plantilla: ' + error.message
    });
  }
});

/**
 * @route POST /api/import/productos
 * @desc Importar productos desde archivo Excel
 * @access Private (requiere rol admin o gerente)
 */
router.post('/productos', auth.verifyToken, upload.single('archivo'), async (req, res) => {
  try {
    // Verificar permisos
    if (req.user.rol !== 'admin' && req.user.rol !== 'gerente') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para importar productos'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo'
      });
    }

    const resultado = await excelImportService.procesarImportacion(
      req.file,
      req.user.id,
      req.user.sucursal_id
    );

    res.json({
      success: true,
      message: 'Importación procesada correctamente',
      data: resultado
    });

  } catch (error) {
    console.error('Error en importación:', error);

    // Eliminar archivo si existe
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route GET /api/import/historial
 * @desc Obtener historial de importaciones
 * @access Private (requiere rol admin o gerente)
 */
router.get('/historial', auth.verifyToken, async (req, res) => {
  try {
    // Verificar permisos
    if (req.user.rol !== 'admin' && req.user.rol !== 'gerente') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver el historial de importaciones'
      });
    }

    const { limit = 50 } = req.query;

    // Los administradores pueden ver todas las importaciones, los gerentes solo de su sucursal
    const sucursalId = req.usuario.rol === 'admin' ? null : req.user.sucursal_id;

    const historial = await excelImportService.getHistorialImportaciones(
      sucursalId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: historial
    });

  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el historial de importaciones'
    });
  }
});

/**
 * @route GET /api/import/detalles/:id
 * @desc Obtener detalles de una importación específica
 * @access Private (requiere rol admin o gerente)
 */
router.get('/detalles/:id', auth.verifyToken, async (req, res) => {
  try {
    // Verificar permisos
    if (req.user.rol !== 'admin' && req.user.rol !== 'gerente') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver detalles de importaciones'
      });
    }

    const { id } = req.params;

    const detalles = await excelImportService.getDetallesImportacion(parseInt(id));

    if (!detalles) {
      return res.status(404).json({
        success: false,
        message: 'Importación no encontrada'
      });
    }

    // Los gerentes solo pueden ver importaciones de su sucursal
    if (req.usuario.rol === 'gerente' && detalles.sucursal_id !== req.user.sucursal_id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta importación'
      });
    }

    res.json({
      success: true,
      data: detalles
    });

  } catch (error) {
    console.error('Error obteniendo detalles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los detalles de la importación'
    });
  }
});

/**
 * @route DELETE /api/import/cancelar/:id
 * @desc Cancelar una importación en proceso
 * @access Private (requiere rol admin)
 */
router.delete('/cancelar/:id', auth.verifyToken, async (req, res) => {
  try {
    // Solo los administradores pueden cancelar importaciones
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Solo los administradores pueden cancelar importaciones'
      });
    }

    const { id } = req.params;

    const result = await pool.query(`
      UPDATE importaciones_log
      SET estado = 'cancelado',
          fecha_fin = NOW()
      WHERE id = $1 AND estado = 'procesando'
      RETURNING id
    `, [parseInt(id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Importación no encontrada o ya no está en proceso'
      });
    }

    res.json({
      success: true,
      message: 'Importación cancelada correctamente'
    });

  } catch (error) {
    console.error('Error cancelando importación:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar la importación'
    });
  }
});

// Middleware para manejar errores de multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Máximo permitido: 10MB'
      });
    }
  }

  if (error.message.includes('Solo se permiten archivos Excel')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
});

module.exports = router;