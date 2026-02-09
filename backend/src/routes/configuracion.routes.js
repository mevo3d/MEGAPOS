const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();
const auth = require('../middleware/auth');
const router = express.Router();

const configuracionController = require('../controllers/configuracion.controller');

// Configurar multer para subidas de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    // Crear directorio si no existe
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${uuidv4()}${ext}`;
    cb(null, name);
  }
});

const upload = multer({ storage });

// Rutas públicas (sin autenticación para obtener logo)
router.get('/', configuracionController.getConfiguracion); // Ruta base para el POS
router.get('/logo', configuracionController.getLogo);
router.get('/logo/info', configuracionController.getLogoInfo);

// Rutas protegidas (solo admin)
router.get('/all', auth.verifyToken, (req, res, next) => {
  // Verificar que sea admin
  if (req.user.rol !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Acceso denegado' });
  }
  next();
}, configuracionController.getConfiguracion);

router.get('/:clave', auth.verifyToken, (req, res, next) => {
  if (req.user.rol !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Acceso denegado' });
  }
  next();
}, configuracionController.getConfigValue);

router.post('/update', auth.verifyToken, (req, res, next) => {
  if (req.user.rol !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Acceso denegado' });
  }
  next();
}, configuracionController.updateConfiguracion);

// Rutas para logo (protegidas)
router.post(
  '/logo/upload',
  auth.verifyToken,
  (req, res, next) => {
    if (req.user.rol !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    next();
  },
  upload.single('logo'),
  configuracionController.uploadLogo
);

router.delete(
  '/logo/:id',
  auth.verifyToken,
  (req, res, next) => {
    if (req.user.rol !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Acceso denegado' });
    }
    next();
  },
  configuracionController.deleteLogo
);

module.exports = router;
