const express = require('express');
const router = express.Router();
const {
    getAllEmpleados,
    getEmpleadoById,
    createEmpleado,
    updateEmpleado,
    changePassword,
    deleteEmpleado,
    getSucursales,
    getDocumentosEmpleado,
    deleteDocumento
} = require('../controllers/empleados.controller');
const { verifyToken, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de Multer para documentos de empleados
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads', 'empleados');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `doc_${req.params.id}_${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes (JPG, PNG) o PDF'));
        }
    }
});

// Aplicar middleware a todas las rutas
router.use(verifyToken);
router.use(isAdmin);

// GET - Obtener todos los empleados
router.get('/', getAllEmpleados);

// GET - Obtener sucursales para formularios
router.get('/sucursales', getSucursales);

// GET - Obtener empleado por ID
router.get('/:id', getEmpleadoById);

// POST - Crear nuevo empleado
router.post('/', createEmpleado);

// PUT - Actualizar empleado
router.put('/:id', updateEmpleado);

// PUT - Cambiar contraseña de empleado
router.put('/:id/password', changePassword);

// DELETE - Desactivar empleado
router.delete('/:id', deleteEmpleado);

// --- Rutas de Documentos HR ---
// GET - Obtener documentos del empleado
router.get('/:id/documentos', getDocumentosEmpleado);

// POST - Subir documento de empleado
router.post('/:id/documentos', upload.single('documento'), (req, res, next) => {
    // Pasar a controller
    const { uploadDocumento } = require('../controllers/empleados.controller');
    uploadDocumento(req, res);
});

// DELETE - Eliminar un documento específico
router.delete('/documentos/:docId', deleteDocumento);

module.exports = router;