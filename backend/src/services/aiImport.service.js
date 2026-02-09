const { Pool } = require('pg');
const { pool } = require('../config/db');
const OpenAI = require('openai');

class AiImportService {
    constructor() {
        this.openai = null; // Initialize lazily
    }

    /**
     * Initializes OpenAI client using the key from the database
     */
    async initOpenAI(client) {
        if (this.openai) return;

        // Get Key from DB
        const res = await client.query("SELECT value FROM configuraciones WHERE key = 'openai_api_key'");

        if (res.rows.length === 0 || !res.rows[0].value) {
            console.error('❌ Error: API Key no encontrada en BD');
            throw new Error('OpenAI API Key no configurada. Por favor configúrala en el panel de SuperAdmin.');
        }

        console.log('✅ OpenAI API Key cargada desde BD');
        this.openai = new OpenAI({
            apiKey: res.rows[0].value
        });
    }

    /**
     * Analyzes an invoice image using GPT-4o Vision
     * @param {Object} file - The file object from multer
     * @param {number} sucursalId - Current branch ID
     */
    /**
     * Analyzes multiple invoice images using GPT-4o Vision
     * @param {Array} files - Array of file objects from multer
     * @param {number} sucursalId - Current branch ID
     */
    async analyzeInvoices(files, sucursalId) {
        const client = await pool.connect();
        try {
            await this.initOpenAI(client);

            let allProducts = [];
            let detectedProvider = null;
            let invoiceMetadata = null;

            // Process each file
            for (const file of files) {
                // Read file
                const fs = require('fs');
                let imageBuffer = fs.readFileSync(file.path);
                let mimeType = file.mimetype;

                // Support HEIC -> JPEG conversion
                if (mimeType === 'image/heic' || mimeType === 'image/heif' || file.originalname.toLowerCase().endsWith('.heic')) {
                    try {
                        const heicConvert = require('heic-convert');
                        imageBuffer = await heicConvert({
                            buffer: imageBuffer,
                            format: 'JPEG',
                            quality: 0.8
                        });
                        mimeType = 'image/jpeg';
                        console.log('✅ HEIC converted to JPEG successfully');
                    } catch (err) {
                        console.error('Error converting HEIC:', err);
                        throw new Error('No se pudo procesar la imagen HEIC. Intenta enviarla como JPG.');
                    }
                }

                const base64Image = imageBuffer.toString('base64');
                const dataUrl = `data:${mimeType};base64,${base64Image}`;

                // Enhanced prompt with comprehensive provider and product fields
                const prompt = `Analiza esta imagen de factura/documento comercial y extrae TODOS los datos disponibles.
            Devuelve un objeto JSON con la siguiente estructura:
            {
                "proveedor": {
                    "nombre": "Nombre o Razón Social del Proveedor",
                    "nombre_comercial": "Nombre comercial si es diferente",
                    "rfc": "RFC del proveedor (formato: 3-4 letras + 6 dígitos + 3 alfanuméricos)",
                    "regimen_fiscal": "Régimen fiscal si aparece (ej: 601 - General de Ley)",
                    "direccion": "Calle y número",
                    "colonia": "Colonia",
                    "ciudad": "Ciudad o Municipio",
                    "estado": "Estado (ej: Morelos, CDMX)",
                    "codigo_postal": "Código Postal (5 dígitos)",
                    "telefono": "Teléfono principal",
                    "telefono_2": "Teléfono secundario si hay",
                    "fax": "Fax si aparece",
                    "email": "Email principal",
                    "pagina_web": "Sitio web si aparece",
                    "banco": "Banco para pagos si aparece",
                    "cuenta_bancaria": "Número de cuenta",
                    "clabe": "CLABE interbancaria (18 dígitos)",
                    "vendedor_asignado": "Nombre del vendedor/agente"
                },
                "documento": {
                    "tipo": "factura | cotizacion | nota | remision",
                    "numero_factura": "Número o folio del documento",
                    "uuid": "UUID del CFDI si es factura fiscal (36 caracteres con guiones)",
                    "folio_fiscal": "Folio fiscal SAT",
                    "fecha_emision": "Fecha de emisión YYYY-MM-DD",
                    "forma_pago": "Código forma pago (01, 03, 99, etc.)",
                    "metodo_pago": "PUE o PPD",
                    "uso_cfdi": "Uso del CFDI (G01, G03, etc.)",
                    "moneda": "MXN, USD, etc.",
                    "tipo_cambio": number(Tipo de cambio si no es MXN),
                    "condiciones_pago": "Condiciones (ej: 30 días, Contado)",
                    "orden_compra_ref": "Número de orden de compra relacionada",
                    "vendedor": "Nombre del vendedor que atendió",
                    "via_embarque": "Tipo de envío/transporte",
                    "subtotal": number(Subtotal antes de impuestos),
                    "descuento_total": number(Descuento total si hay),
                    "iva": number(IVA total),
                    "total": number(Total del documento)
                },
                "productos": [
                    {
                        "numero_linea": number(Línea en la factura),
                        "clave_producto": "Código/Clave del producto",
                        "sku_proveedor": "SKU o No. Parte del proveedor",
                        "codigo_barras": "Código de barras si aparece",
                        "clave_sat": "Clave del catálogo SAT (8 dígitos)",
                        "descripcion": "Descripción completa",
                        "cantidad": number(Cantidad),
                        "unidad": "PIEZA | CAJA | PAQUETE | KG | LITRO | METRO",
                        "unidad_sat": "Clave unidad SAT (ej: H87, XBX)",
                        "precio_unitario": number(Precio unitario sin IVA),
                        "descuento_porcentaje": number(% descuento si hay),
                        "descuento_monto": number(Monto descuento),
                        "importe": number(Importe antes de IVA),
                        "iva_porcentaje": number(% IVA, normalmente 16),
                        "iva_monto": number(Monto IVA),
                        "total_linea": number(Total de la línea),
                        "peso_kg": number(Peso en kg si aparece),
                        "ancho_cm": number(Ancho si aparece),
                        "largo_cm": number(Largo si aparece),
                        "gramaje": "Gramaje para papelería (ej: 50.0 G)"
                    }
                ]
            }
      
      Reglas:
            1. Extrae TODOS los datos que encuentres, aunque no estén en todas las facturas.
            2. Ignora líneas de subtotales, fletes y totales generales (solo productos).
            3. Si no encuentras un dato, usa null.
            4. Para montos, devuelve números sin símbolo de moneda ni comas.
            5. Detecta el tipo de unidad basándote en la descripción o columna.
            6. El RFC mexicano tiene formato: 3-4 letras + 6 dígitos + 3 alfanuméricos.
            7. El UUID del CFDI tiene formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      
      Proveedores conocidos y sus particularidades:
            - AZOR: usa columnas 'Clave Prod', 'No. Identificación', 'Código de Barras'
            - SCRIBE: combina 'Descripcion' con 'Presentacion', tiene columna KILOS
            - JANEL: CFDI completo con UUID, tiene datos bancarios
            - SHELY PACK: cotizaciones con email y vendedor
            - DIPAK/Corporación Impresora: CFDI con descuentos por línea
                    `;

                const response = await this.openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: dataUrl,
                                        detail: "high"
                                    },
                                },
                            ],
                        },
                    ],
                    max_tokens: 4096,
                    response_format: { type: "json_object" }
                });

                const result = JSON.parse(response.choices[0].message.content);

                // Track which page/image each product came from (1-indexed)
                const pageNumber = files.indexOf(file) + 1;

                if (result.productos && Array.isArray(result.productos)) {
                    // Add page number to each product
                    const productsWithPage = result.productos.map(p => ({
                        ...p,
                        pagina: pageNumber
                    }));
                    allProducts = [...allProducts, ...productsWithPage];
                }

                // Capture provider info from first page that has it
                if (!detectedProvider && result.proveedor) {
                    detectedProvider = result.proveedor;
                }

                // Capture invoice/document metadata (support both old and new structure)
                if (!invoiceMetadata && (result.documento || result.numero_factura || result.fecha_factura)) {
                    if (result.documento) {
                        // New comprehensive structure
                        invoiceMetadata = {
                            ...result.documento,
                            fecha_llegada: new Date().toISOString()
                        };
                    } else {
                        // Legacy structure fallback
                        invoiceMetadata = {
                            numero_factura: result.numero_factura,
                            fecha_emision: result.fecha_factura,
                            fecha_llegada: new Date().toISOString()
                        };
                    }
                }

                // Clean up processed file immediately
                if (file.path && fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }

            // APPLY LEARNING (Memory Match) to ALL products
            const processedProducts = await this.applyLearning(client, allProducts, sucursalId);

            return {
                proveedor: detectedProvider || { nombre: "Desconocido" },
                documento: invoiceMetadata || {
                    numero_factura: null,
                    fecha_emision: null,
                    fecha_llegada: new Date().toISOString()
                },
                // Legacy fields for backwards compatibility
                numero_factura: invoiceMetadata?.numero_factura || null,
                fecha_factura: invoiceMetadata?.fecha_emision || null,
                total_paginas: files.length,
                productos: processedProducts.map(p => ({
                    ...p,
                    // Ensure unique ID for frontend key
                    id: Date.now() + Math.random()
                }))
            };

        } catch (error) {
            console.error('Error in AI Analysis:', error);
            throw new Error(`Error en análisis de IA: ${error.message} `);
        } finally {
            client.release();
            // Cleanup in case of error (loops through all provided files just in case)
            const fs = require('fs');
            files.forEach(file => {
                if (file.path && fs.existsSync(file.path)) {
                    try { fs.unlinkSync(file.path); } catch (e) { }
                }
            });
        }
    }

    /**
     * Matches AI results against learned patterns in DB
     */
    async applyLearning(client, aiProducts, sucursalId) {
        const processed = [];

        for (const item of aiProducts) {
            // Try to find exact match by SKU or Name (use descripcion for new format, nombre for legacy)
            const productName = item.descripcion || item.nombre || '';
            const matchQuery = `
            SELECT pa.*, p.nombre as nombre_interno, p.codigo as codigo_interno
            FROM productos_aprendizaje pa
            JOIN productos_catalogo p ON pa.producto_interno_id = p.id
            WHERE
                (pa.sku_proveedor_factura = $1 AND $1 <> '') OR
                    (LOWER(pa.nombre_proveedor_factura) = LOWER($2))
            LIMIT 1
        `;

            const match = await client.query(matchQuery, [item.sku_proveedor || '', productName]);

            // Get quantity - handle both new and legacy field names
            const cantidad = item.cantidad || item.cantidad_cajas || 1;
            const precioUnitario = item.precio_unitario || item.costo_unitario_caja || 0;
            const importe = item.importe || item.costo_total || (cantidad * precioUnitario);

            if (match.rows.length > 0) {
                // Memory Hit!
                const memory = match.rows[0];
                processed.push({
                    ...item,
                    descripcion: productName,
                    nombre_interno: memory.nombre_interno, // Use learned internal name
                    codigo: memory.codigo_interno,
                    cantidad: cantidad,
                    piezas_por_caja: memory.factor_empaque, // Use learned pack size
                    stock_total: cantidad * memory.factor_empaque,
                    precio_unitario: precioUnitario,
                    costo_unitario: Number((precioUnitario / memory.factor_empaque).toFixed(2)),
                    importe: importe,
                    is_learned: true // Flag for UI
                });
            } else {
                // No memory, use raw AI data and defaults
                processed.push({
                    ...item,
                    descripcion: productName,
                    nombre_interno: productName, // Default to same name
                    codigo: '',
                    cantidad: cantidad,
                    piezas_por_caja: 1, // Default
                    stock_total: cantidad,
                    precio_unitario: precioUnitario,
                    costo_unitario: precioUnitario,
                    importe: importe,
                    is_learned: false
                });
            }
        }

        return processed;
    }

    /**
     * Learns from user corrections
     */
    async learn(userId, sucursalId, corrections) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const item of corrections) {
                // Logic: If user mapped it to a valid internal product, save the rule
                if (item.producto_interno_id && item.nombre_proveedor_factura) {

                    // Check if rule exists to avoid duplicates
                    const check = await client.query(
                        `SELECT id FROM productos_aprendizaje 
                     WHERE nombre_proveedor_factura = $1 AND sku_proveedor_factura = $2`,
                        [item.nombre_proveedor_factura, item.sku_proveedor_factura || '']
                    );

                    if (check.rows.length === 0) {
                        await client.query(`
                        INSERT INTO productos_aprendizaje
                (sucursal_id, nombre_proveedor_factura, sku_proveedor_factura, producto_interno_id, factor_empaque)
            VALUES($1, $2, $3, $4, $5)
                `, [
                            sucursalId,
                            item.nombre_proveedor_factura,
                            item.sku_proveedor_factura || '',
                            item.producto_interno_id,
                            item.factor_empaque || 1
                        ]);
                    }
                }
            }

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error saving learning:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = AiImportService;
