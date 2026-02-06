const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyToken, isAdmin } = require('../middleware/auth');
const productosImagenesController = require('../controllers/productosImagenes.controller');

// Configuración de Multer para subida de imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(process.cwd(), 'uploads', 'productos'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `prod_${req.params.id}_${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB máximo
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes (JPG, PNG, WEBP)'));
        }
    }
});

// Rutas
router.get('/:id/imagenes', verifyToken, productosImagenesController.getImagenesByProducto);
router.post('/:id/imagenes', verifyToken, upload.single('imagen'), productosImagenesController.uploadImagen);
router.delete('/imagenes/:id', verifyToken, productosImagenesController.deleteImagen);
router.put('/imagenes/:id/principal', verifyToken, productosImagenesController.setPrincipal);

module.exports = router;
