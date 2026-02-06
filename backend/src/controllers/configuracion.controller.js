const { pool } = require('../config/db');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');

// Obtener configuración del sistema
exports.getConfiguracion = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM configuracion_sistema ORDER BY clave'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error('Error obteniendo configuración:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener un valor específico de configuración
exports.getConfigValue = async (req, res) => {
  try {
    const { clave } = req.params;
    const result = await pool.query(
      'SELECT valor FROM configuracion_sistema WHERE clave = $1',
      [clave]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Configuración no encontrada' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error obteniendo valor de configuración:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Actualizar configuración
exports.updateConfiguracion = async (req, res) => {
  try {
    const { clave, valor, descripcion } = req.body;
    const userId = req.user.id;

    // SQLite uses INSERT OR REPLACE for upsert simple cases, or a manual check
    await pool.query(
      `INSERT OR REPLACE INTO configuracion_sistema (clave, valor, descripcion, actualizado_por, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [clave, valor, descripcion || null, userId]
    );

    const result = await pool.query('SELECT * FROM configuracion_sistema WHERE clave = $1', [clave]);

    logger.info(`Configuración actualizada: ${clave}`);
    res.json({ success: true, data: result.rows[0], message: 'Configuración actualizada' });
  } catch (error) {
    logger.error('Error actualizando configuración:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Obtener logo
exports.getLogo = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM archivos_sistema 
       WHERE tipo = 'logo' AND activo = 1 
       ORDER BY created_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Logo no encontrado' });
    }

    const archivo = result.rows[0];
    const rutaArchivo = path.join(process.cwd(), 'uploads', archivo.nombre_guardado);

    // Verificar que el archivo existe
    if (!fs.existsSync(rutaArchivo)) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
    }

    // Enviar el archivo
    res.sendFile(rutaArchivo);
  } catch (error) {
    logger.error('Error obteniendo logo:', error);
    // Devolver 404 en lugar de 500 para que el frontend maneje esto elegantemente
    res.status(404).json({ success: false, message: 'Logo no disponible' });
  }
};

// Obtener información del logo (metadata)
exports.getLogoInfo = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre_original, tipo_archivo, tamaño, updated_at 
       FROM archivos_sistema 
       WHERE tipo = 'logo' AND activo = true 
       ORDER BY created_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Logo no encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error obteniendo info del logo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Subir logo
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No se proporcionó archivo' });
    }

    const userId = req.user.id;
    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];

    if (!allowedMimes.includes(req.file.mimetype)) {
      // Eliminar archivo subido
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Solo se permiten imágenes (PNG, JPG, WEBP, SVG)'
      });
    }

    // Validar tamaño (máximo 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande (máximo 5MB)'
      });
    }

    // Desactivar logos anteriores
    await pool.query(
      'UPDATE archivos_sistema SET activo = false WHERE tipo = $1',
      ['logo']
    );

    // Guardar información del nuevo logo
    const insertResult = await pool.query(
      `INSERT INTO archivos_sistema (nombre_original, nombre_guardado, tipo_archivo, ruta_archivo, tipo, tamaño, actualizado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        req.file.originalname,
        req.file.filename,
        req.file.mimetype,
        req.file.path,
        'logo',
        req.file.size,
        userId
      ]
    );

    const result = await pool.query(
      'SELECT * FROM archivos_sistema WHERE id = $1',
      [insertResult.id]
    );

    logger.info(`Logo subido: ${req.file.originalname}`);
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Logo actualizado exitosamente'
    });
  } catch (error) {
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    logger.error('Error subiendo logo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Eliminar logo
exports.deleteLogo = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener información del archivo
    const result = await pool.query(
      'SELECT * FROM archivos_sistema WHERE id = $1 AND tipo = $2',
      [id, 'logo']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Logo no encontrado' });
    }

    const archivo = result.rows[0];
    const rutaArchivo = path.join(process.cwd(), 'uploads', archivo.nombre_guardado);

    // Desactivar en la BD
    await pool.query(
      'UPDATE archivos_sistema SET activo = false WHERE id = $1',
      [id]
    );

    // Eliminar archivo físico si existe
    if (fs.existsSync(rutaArchivo)) {
      fs.unlinkSync(rutaArchivo);
    }

    logger.info(`Logo eliminado: ${archivo.nombre_original}`);
    res.json({ success: true, message: 'Logo eliminado exitosamente' });
  } catch (error) {
    logger.error('Error eliminando logo:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
