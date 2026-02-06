const { pool } = require('../config/db');
const logger = require('../config/logger');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Obtener imágenes de un producto
const getImagenesByProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM productos_imagenes WHERE producto_id = $1 ORDER BY es_principal DESC, orden ASC',
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        logger.error('Error obteniendo imágenes:', error);
        res.status(500).json({ message: 'Error obteniendo imágenes' });
    }
};

// Subir imagen de producto
const uploadImagen = async (req, res) => {
    try {
        const { id } = req.params;
        const { es_principal } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No se proporcionó imagen' });
        }

        // Verificar que el producto existe
        const productoExists = await pool.query(
            'SELECT id FROM productos_catalogo WHERE id = $1',
            [id]
        );

        if (productoExists.rows.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        // Verificar límite de 5 imágenes
        const countResult = await pool.query(
            'SELECT COUNT(*) as count FROM productos_imagenes WHERE producto_id = $1',
            [id]
        );

        if (parseInt(countResult.rows[0].count) >= 5) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'Máximo 5 imágenes por producto' });
        }

        const rutaOriginal = req.file.path;
        const nombreBase = path.basename(req.file.filename, path.extname(req.file.filename));
        const rutaProcesada = path.join(path.dirname(rutaOriginal), `${nombreBase}_nobg.png`);

        // Procesar imagen para eliminar fondo (en segundo plano)
        procesarFondo(rutaOriginal, rutaProcesada);

        // Si es principal, quitar el flag de otras imágenes
        if (es_principal === 'true' || es_principal === true) {
            await pool.query(
                'UPDATE productos_imagenes SET es_principal = 0 WHERE producto_id = $1',
                [id]
            );
        }

        // Obtener el siguiente orden
        const ordenResult = await pool.query(
            'SELECT MAX(orden) as max_orden FROM productos_imagenes WHERE producto_id = $1',
            [id]
        );
        const nuevoOrden = (ordenResult.rows[0]?.max_orden || 0) + 1;

        // Insertar registro de imagen
        const insertResult = await pool.query(`
            INSERT INTO productos_imagenes (producto_id, nombre_archivo, ruta_original, ruta_procesada, es_principal, orden)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, req.file.filename, rutaOriginal, rutaProcesada, es_principal ? 1 : 0, nuevoOrden]);

        const imageId = insertResult.id;
        const result = await pool.query('SELECT * FROM productos_imagenes WHERE id = $1', [imageId]);

        logger.info(`Imagen subida para producto ${id}: ${req.file.filename}`);

        res.status(201).json({
            success: true,
            message: 'Imagen subida exitosamente. El procesamiento de fondo se realizará en segundo plano.',
            imagen: result.rows[0]
        });

    } catch (error) {
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
        }
        logger.error('Error subiendo imagen:', error);
        res.status(500).json({ message: 'Error subiendo imagen' });
    }
};

// Procesar fondo de imagen con Python
const procesarFondo = (rutaOriginal, rutaSalida) => {
    // La ruta al script Python está en backend/scripts/
    const pythonScript = path.join(process.cwd(), 'scripts', 'remove_background.py');

    // Verificar si Python está disponible
    const python = spawn('python', [pythonScript, rutaOriginal, rutaSalida]);

    python.stdout.on('data', (data) => {
        logger.info(`Procesamiento de imagen: ${data}`);
    });

    python.stderr.on('data', (data) => {
        logger.error(`Error procesando imagen: ${data}`);
    });

    python.on('close', (code) => {
        if (code === 0) {
            logger.info(`Fondo eliminado exitosamente: ${rutaSalida}`);
        } else {
            logger.warn(`Procesamiento de fondo falló (código: ${code}). La imagen original se mantiene.`);
        }
    });
};

// Eliminar imagen
const deleteImagen = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener info de la imagen
        const result = await pool.query(
            'SELECT * FROM productos_imagenes WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Imagen no encontrada' });
        }

        const imagen = result.rows[0];

        // Eliminar archivos físicos
        if (imagen.ruta_original && fs.existsSync(imagen.ruta_original)) {
            fs.unlinkSync(imagen.ruta_original);
        }
        if (imagen.ruta_procesada && fs.existsSync(imagen.ruta_procesada)) {
            fs.unlinkSync(imagen.ruta_procesada);
        }

        // Eliminar registro de BD
        await pool.query('DELETE FROM productos_imagenes WHERE id = $1', [id]);

        logger.info(`Imagen eliminada: ${imagen.nombre_archivo}`);

        res.json({ success: true, message: 'Imagen eliminada exitosamente' });

    } catch (error) {
        logger.error('Error eliminando imagen:', error);
        res.status(500).json({ message: 'Error eliminando imagen' });
    }
};

// Establecer imagen como principal
const setPrincipal = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener producto_id de esta imagen
        const result = await pool.query(
            'SELECT producto_id FROM productos_imagenes WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Imagen no encontrada' });
        }

        const productoId = result.rows[0].producto_id;

        // Quitar flag principal de otras imágenes
        await pool.query(
            'UPDATE productos_imagenes SET es_principal = 0 WHERE producto_id = $1',
            [productoId]
        );

        // Establecer esta como principal
        await pool.query(
            'UPDATE productos_imagenes SET es_principal = 1 WHERE id = $1',
            [id]
        );

        res.json({ success: true, message: 'Imagen establecida como principal' });

    } catch (error) {
        logger.error('Error estableciendo imagen principal:', error);
        res.status(500).json({ message: 'Error estableciendo imagen principal' });
    }
};

module.exports = {
    getImagenesByProducto,
    uploadImagen,
    deleteImagen,
    setPrincipal
};
