const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query: dbQuery } = require('../config/dbAdapter');
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

// ==========================================
// RUTAS DE IA / CHATGPT IMPORTS
// ==========================================

const AiImportService = require('../services/aiImport.service');
const aiService = new AiImportService();

// Configuración de multer para IMÁGENES (Facturas)
const storageImages = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
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

const fileFilterImages = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/heic', 'image/heif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (JPG, PNG, WEBP)'), false);
  }
};

const uploadImages = multer({
  storage: storageImages,
  fileFilter: fileFilterImages,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});


/**
 * @route POST /api/import/analyze
 * @desc Analiza una imagen de factura usando OpenAI Vision
 */
router.post('/analyze', auth.verifyToken, uploadImages.array('invoices', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No se subieron imágenes' });
    }

    const result = await aiService.analyzeInvoices(req.files, req.user.sucursal_id);
    res.json({ success: true, data: result });

  } catch (error) {
    console.error('Error analyzing invoice:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/import/learn
 * @desc Guarda las correcciones del usuario para futuras importaciones
 */
router.post('/learn', auth.verifyToken, async (req, res) => {
  try {
    const { corrections } = req.body; // Array of objects mapping invoice data to internal products
    // corrections format: [{ nombre_proveedor_factura, sku_proveedor_factura, producto_interno_id, factor_empaque }]

    if (!corrections || !Array.isArray(corrections)) {
      return res.status(400).json({ message: 'Formato de correcciones inválido' });
    }

    await aiService.learn(req.user.id, req.user.sucursal_id, corrections);
    res.json({ success: true, message: 'Aprendizaje guardado correctamente' });

  } catch (error) {
    console.error('Error saving learning:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========================================
// PROVEEDOR MATCHING & SEARCH ENDPOINTS
// ========================================

/**
 * POST /import/match-provider
 * Busca proveedores existentes por RFC o nombre similar
 */
router.post('/match-provider', auth.verifyToken, async (req, res) => {
  try {
    const { nombre, rfc } = req.body;

    let query = `
      SELECT id, nombre, rfc, telefono, email, contacto_nombre, dias_credito
      FROM proveedores
      WHERE activo = 1
    `;
    const params = [];
    const conditions = [];

    // Search by RFC (exact match)
    if (rfc && rfc.length >= 5) {
      conditions.push(`UPPER(rfc) = UPPER($${params.length + 1})`);
      params.push(rfc);
    }

    // Search by name (fuzzy match)
    if (nombre) {
      conditions.push(`LOWER(nombre) LIKE LOWER($${params.length + 1})`);
      params.push(`%${nombre}%`);
    }

    if (conditions.length > 0) {
      query += ` AND (${conditions.join(' OR ')})`;
    }

    query += ` ORDER BY nombre LIMIT 10`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error matching provider:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /import/proveedores/search
 * Búsqueda rápida de proveedores para el dropdown
 */
router.get('/proveedores/search', auth.verifyToken, async (req, res) => {
  try {
    const { q } = req.query;

    let query = `
      SELECT id, nombre, rfc, telefono, email
      FROM proveedores
      WHERE activo = 1
    `;
    const params = [];

    if (q && q.length >= 2) {
      query += ` AND (LOWER(nombre) LIKE LOWER($1) OR UPPER(rfc) LIKE UPPER($1))`;
      params.push(`%${q}%`);
    }

    query += ` ORDER BY nombre LIMIT 20`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error searching providers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /import/update-provider
 * Actualiza datos del proveedor después de confirmación del usuario
 */
/**
 * POST /import/confirm
 * Confirma la importación de una factura, guardando proveedor y productos
 */
router.post('/confirm', auth.verifyToken, async (req, res) => {
  try {
    const { proveedor, proveedorData, productos, numero_factura, fecha_factura, documento } = req.body;

    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay productos para importar' });
    }

    // ========================================
    // 1. FIND OR CREATE PROVEEDOR
    // ========================================
    let proveedorId = null;
    const provData = proveedorData || {};
    const provNombre = provData.nombre || proveedor || 'Proveedor Desconocido';

    // Try to find by RFC first (most reliable)
    if (provData.rfc && provData.rfc.length >= 10) {
      const rfcMatch = await pool.query(
        `SELECT id FROM proveedores WHERE UPPER(rfc) = UPPER($1) AND activo = 1`,
        [provData.rfc.trim()]
      );
      if (rfcMatch.rows && rfcMatch.rows.length > 0) {
        proveedorId = rfcMatch.rows[0].id;
      }
    }

    // Try to find by name if RFC didn't match
    if (!proveedorId && provNombre) {
      const nameMatch = await pool.query(
        `SELECT id FROM proveedores WHERE LOWER(nombre) = LOWER($1) AND activo = 1`,
        [provNombre.trim()]
      );
      if (nameMatch.rows && nameMatch.rows.length > 0) {
        proveedorId = nameMatch.rows[0].id;
      }
    }

    // Create new proveedor if not found
    if (!proveedorId) {
      const insertResult = await pool.query(`
                INSERT INTO proveedores (
                    nombre, nombre_comercial, rfc, regimen_fiscal,
                    direccion, colonia, ciudad, estado, codigo_postal, pais,
                    telefono, telefono_2, fax, email, email_2, pagina_web,
                    banco, cuenta_bancaria, clabe,
                    vendedor_asignado, vendedor_telefono, vendedor_email,
                    activo, fecha_alta
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 1, CURRENT_TIMESTAMP)
            `, [
        provNombre,
        provData.nombre_comercial || null,
        provData.rfc || null,
        provData.regimen_fiscal || null,
        provData.direccion || null,
        provData.colonia || null,
        provData.ciudad || null,
        provData.estado || null,
        provData.codigo_postal || null,
        provData.pais || 'México',
        provData.telefono || null,
        provData.telefono_2 || null,
        provData.fax || null,
        provData.email || null,
        provData.email_2 || null,
        provData.pagina_web || null,
        provData.banco || null,
        provData.cuenta_bancaria || null,
        provData.clabe || null,
        provData.vendedor_asignado || null,
        provData.vendedor_telefono || null,
        provData.vendedor_email || null
      ]);

      // Get the inserted ID (SQLite returns lastID, PostgreSQL needs RETURNING or separate query)
      if (insertResult.lastID) {
        proveedorId = insertResult.lastID;
      } else {
        // For PostgreSQL, get last inserted
        const lastIdResult = await pool.query(`SELECT id FROM proveedores WHERE nombre = $1 ORDER BY id DESC LIMIT 1`, [provNombre]);
        proveedorId = lastIdResult.rows[0]?.id;
      }

      console.log(`✅ Proveedor creado: ${provNombre} (ID: ${proveedorId})`);
    } else {
      // Update existing proveedor with new data if available
      const updates = [];
      const params = [proveedorId];
      let paramIdx = 2;

      if (provData.telefono) { updates.push(`telefono = COALESCE(telefono, $${paramIdx++})`); params.push(provData.telefono); }
      if (provData.email) { updates.push(`email = COALESCE(email, $${paramIdx++})`); params.push(provData.email); }
      if (provData.direccion) { updates.push(`direccion = COALESCE(direccion, $${paramIdx++})`); params.push(provData.direccion); }
      if (provData.rfc) { updates.push(`rfc = COALESCE(rfc, $${paramIdx++})`); params.push(provData.rfc); }

      if (updates.length > 0) {
        updates.push(`fecha_ultima_compra = CURRENT_TIMESTAMP`);
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        await pool.query(`UPDATE proveedores SET ${updates.join(', ')} WHERE id = $1`, params);
      }

      console.log(`🔄 Proveedor existente actualizado: ID ${proveedorId}`);
    }

    // ========================================
    // 2. SAVE FACTURA IMPORTADA (Optional tracking)
    // ========================================
    const docData = documento || {};
    let facturaId = null;
    try {
      const facturaResult = await pool.query(`
                INSERT INTO facturas_importadas (
                    proveedor_id, tipo_documento, numero_factura, uuid, folio_fiscal,
                    fecha_emision, forma_pago, metodo_pago, uso_cfdi, moneda, tipo_cambio,
                    subtotal, descuento_total, iva, total,
                    condiciones_pago, orden_compra_ref, vendedor,
                    estado, importado_por_id, sucursal_destino_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'procesada', $19, $20)
            `, [
        proveedorId,
        docData.tipo || 'factura',
        numero_factura || docData.numero_factura || null,
        docData.uuid || null,
        docData.folio_fiscal || null,
        fecha_factura || docData.fecha_emision || null,
        docData.forma_pago || null,
        docData.metodo_pago || null,
        docData.uso_cfdi || null,
        docData.moneda || 'MXN',
        docData.tipo_cambio || 1,
        docData.subtotal || null,
        docData.descuento_total || 0,
        docData.iva || null,
        docData.total || productos.reduce((sum, p) => sum + (p.importe || 0), 0),
        docData.condiciones_pago || null,
        docData.orden_compra_ref || null,
        docData.vendedor || null,
        req.user.id,
        req.user.sucursal_id || 1
      ]);
      facturaId = facturaResult.lastID || facturaResult.rows?.[0]?.id;
    } catch (facturaError) {
      console.warn('⚠️ No se pudo guardar factura_importada:', facturaError.message);
    }

    // ========================================
    // 3. UPSERT PRODUCTOS INTO CATALOG
    // ========================================
    let productosCreados = 0;
    let productosActualizados = 0;
    const sucursalId = req.user.sucursal_id || 1;

    for (const producto of productos) {
      const descripcionProveedor = producto.descripcion || 'Producto Sin Nombre';
      const nombreComercial = producto.nombre_interno || descripcionProveedor; // Usuario puede asignar nombre propio
      const skuProveedor = producto.sku_proveedor || producto.clave_producto || producto.codigo || null;
      const codigoBarras = producto.codigo_barras || null;
      const precioBase = producto.precio_unitario || 0;
      const cantidad = producto.cantidad || producto.stock_total || 0;

      let productoId = null;
      let esNuevoMapeo = false;

      // ========================================
      // PASO 1: Buscar en tabla de MAPEO por SKU del proveedor
      // (Esto permite reconocer productos aunque tengan diferente nombre)
      // ========================================
      if (skuProveedor && proveedorId) {
        const mapeoMatch = await pool.query(`
          SELECT m.producto_id, p.nombre as nombre_comercial
          FROM productos_proveedor_mapeo m
          JOIN productos_catalogo p ON p.id = m.producto_id
          WHERE m.proveedor_id = $1 AND m.sku_proveedor = $2 AND m.activo = 1
        `, [proveedorId, skuProveedor]);

        if (mapeoMatch.rows && mapeoMatch.rows.length > 0) {
          productoId = mapeoMatch.rows[0].producto_id;
          console.log(`✅ Producto reconocido por mapeo: "${mapeoMatch.rows[0].nombre_comercial}" (SKU proveedor: ${skuProveedor})`);
        }
      }

      // ========================================
      // PASO 2: Si no hay mapeo, buscar por código barras o SKU interno
      // ========================================
      if (!productoId && codigoBarras) {
        const barcodeMatch = await pool.query(`SELECT id FROM productos_catalogo WHERE codigo_barras = $1`, [codigoBarras]);
        if (barcodeMatch.rows && barcodeMatch.rows.length > 0) {
          productoId = barcodeMatch.rows[0].id;
          esNuevoMapeo = true; // Necesita crear mapeo
        }
      }

      if (!productoId && skuProveedor) {
        // Buscar como SKU interno (para compatibilidad hacia atrás)
        const skuMatch = await pool.query(`SELECT id FROM productos_catalogo WHERE sku = $1 OR sku_proveedor = $1`, [skuProveedor]);
        if (skuMatch.rows && skuMatch.rows.length > 0) {
          productoId = skuMatch.rows[0].id;
          esNuevoMapeo = true;
        }
      }

      // ========================================
      // PASO 3: Si existe, actualizar precio de compra
      // ========================================
      if (productoId) {
        await pool.query(`
          UPDATE productos_catalogo 
          SET precio_compra = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [precioBase, productoId]);
        productosActualizados++;

        // Crear mapeo si encontramos producto pero no tenía mapeo previo
        if (esNuevoMapeo && skuProveedor && proveedorId) {
          try {
            await pool.query(`
              INSERT INTO productos_proveedor_mapeo 
              (producto_id, proveedor_id, sku_proveedor, codigo_barras_proveedor, descripcion_proveedor, unidad_proveedor, ultimo_precio_compra, fecha_ultimo_precio)
              VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
              ON CONFLICT (proveedor_id, sku_proveedor) DO UPDATE SET 
                ultimo_precio_compra = EXCLUDED.ultimo_precio_compra,
                fecha_ultimo_precio = CURRENT_TIMESTAMP
            `, [productoId, proveedorId, skuProveedor, codigoBarras, descripcionProveedor, producto.unidad || 'PIEZA', precioBase]);
            console.log(`📎 Mapeo creado: SKU proveedor ${skuProveedor} → Producto ID ${productoId}`);
          } catch (mapErr) {
            console.warn('⚠️ No se pudo crear mapeo:', mapErr.message);
          }
        }

        // Actualizar precio en mapeo existente
        if (!esNuevoMapeo && skuProveedor && proveedorId) {
          await pool.query(`
            UPDATE productos_proveedor_mapeo 
            SET ultimo_precio_compra = $1, fecha_ultimo_precio = CURRENT_TIMESTAMP
            WHERE proveedor_id = $2 AND sku_proveedor = $3
          `, [precioBase, proveedorId, skuProveedor]);
        }
      } else {
        // ========================================
        // PASO 4: Producto nuevo - crear en catálogo + mapeo
        // ========================================
        const nuevoSku = `MGA-${String(Date.now()).slice(-6)}-${Math.floor(Math.random() * 100)}`;
        const insertProd = await pool.query(`
          INSERT INTO productos_catalogo (
            codigo, sku, codigo_barras, nombre, descripcion, 
            precio_venta, precio_compra, sku_proveedor, nombre_proveedor, unidad_medida, activo
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)
        `, [
          nuevoSku,
          nuevoSku,
          codigoBarras,
          nombreComercial, // TU nombre comercial (puede ser editado después)
          descripcionProveedor, // Descripción original como referencia
          precioBase * 1.3, // Precio venta sugerido
          precioBase,
          skuProveedor,
          proveedor?.nombre || provNombre,
          producto.unidad || 'PIEZA'
        ]);

        // Obtener ID del nuevo producto
        if (insertProd.lastID) {
          productoId = insertProd.lastID;
        } else {
          const lastIdQuery = await pool.query(`SELECT last_insert_rowid() as id`);
          productoId = lastIdQuery.rows?.[0]?.id;
        }

        // Crear mapeo para el nuevo producto
        if (productoId && skuProveedor && proveedorId) {
          await pool.query(`
            INSERT INTO productos_proveedor_mapeo 
            (producto_id, proveedor_id, sku_proveedor, codigo_barras_proveedor, descripcion_proveedor, unidad_proveedor, ultimo_precio_compra, fecha_ultimo_precio)
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
          `, [productoId, proveedorId, skuProveedor, codigoBarras, descripcionProveedor, producto.unidad || 'PIEZA', precioBase]);
          console.log(`🆕 Producto creado con mapeo: "${nombreComercial}" (SKU proveedor: ${skuProveedor})`);
        }

        productosCreados++;
      }

      // ========================================
      // PASO 5: Actualizar inventario
      // ========================================
      if (productoId && cantidad > 0) {
        await pool.query(`
          INSERT INTO inventario_sucursal (sucursal_id, producto_id, stock_actual)
          VALUES ($1, $2, $3)
          ON CONFLICT (sucursal_id, producto_id) 
          DO UPDATE SET stock_actual = inventario_sucursal.stock_actual + EXCLUDED.stock_actual,
                        updated_at = CURRENT_TIMESTAMP
        `, [sucursalId, productoId, cantidad]);

        // Log the movement
        await pool.query(`
          INSERT INTO movimientos_inventario (sucursal_id, producto_id, tipo_movimiento, cantidad, usuario_id, observaciones)
          VALUES ($1, $2, 'entrada', $3, $4, $5)
        `, [sucursalId, productoId, cantidad, req.user.id, `Importación factura ${numero_factura || 'S/N'}`]);
      }
    }

    res.json({
      success: true,
      message: `Importación completada: ${productosCreados} productos creados, ${productosActualizados} actualizados`,
      data: {
        proveedor_id: proveedorId,
        factura_id: facturaId,
        productos_creados: productosCreados,
        productos_actualizados: productosActualizados,
        total_productos: productos.length
      }
    });

  } catch (error) {
    console.error('Error en confirmación de importación:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/update-provider', auth.verifyToken, async (req, res) => {
  try {
    const { proveedor_id, datos } = req.body;

    if (!proveedor_id) {
      return res.status(400).json({ success: false, message: 'ID de proveedor requerido' });
    }

    const updates = [];
    const params = [proveedor_id];
    let paramIndex = 2;

    if (datos.telefono) {
      updates.push(`telefono = $${paramIndex++}`);
      params.push(datos.telefono);
    }
    if (datos.email) {
      updates.push(`email = $${paramIndex++}`);
      params.push(datos.email);
    }
    if (datos.direccion) {
      updates.push(`direccion = $${paramIndex++}`);
      params.push(datos.direccion);
    }
    if (datos.rfc) {
      updates.push(`rfc = $${paramIndex++}`);
      params.push(datos.rfc);
    }

    if (updates.length === 0) {
      return res.json({ success: true, message: 'Nada que actualizar' });
    }

    const query = `
      UPDATE proveedores 
      SET ${updates.join(', ')}
      WHERE id = $1
    `;

    await pool.query(query, params);

    res.json({ success: true, message: 'Proveedor actualizado' });

  } catch (error) {
    console.error('Error updating provider:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;