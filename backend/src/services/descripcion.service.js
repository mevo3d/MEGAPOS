/**
 * Servicio de Generación de Descripciones con IA
 * Usa OpenAI GPT para generar descripciones de productos optimizadas para SEO
 */

const OpenAI = require('openai');
const logger = require('../config/logger');

// Inicializar cliente OpenAI (requiere OPENAI_API_KEY en .env)
let openai = null;
try {
    if (process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }
} catch (error) {
    logger.warn('OpenAI no configurado. La generación de descripciones con IA no estará disponible.');
}

// Formato estándar MEGAMAYOREO para descripciones
const FORMATO_MEGAMAYOREO = `
Genera una descripción de producto profesional para e-commerce siguiendo este formato exacto:

[NOMBRE DEL PRODUCTO] - [MARCA]

📦 Características principales:
• [Característica 1]
• [Característica 2]
• [Característica 3]

📐 Especificaciones:
• Material: [...]
• Dimensiones: [...]
• Peso: [...]

✅ Ideal para: [Uso recomendado]

🏷️ SKU: [Código interno] | Referencia Proveedor: [SKU Proveedor]

IMPORTANTE:
- Usa lenguaje profesional pero accesible
- Incluye palabras clave para SEO
- Si no tienes información exacta de especificaciones, usa "Consultar disponibilidad"
- La descripción debe ser útil para el cliente final
`;

/**
 * Genera una descripción SEO para un producto
 * @param {Object} producto - Datos del producto
 * @returns {Object} - { descripcion_seo, descripcion_corta, palabras_clave }
 */
const generarDescripcion = async (producto) => {
    if (!openai) {
        return {
            success: false,
            error: 'OpenAI no está configurado. Agrega OPENAI_API_KEY en el archivo .env'
        };
    }

    try {
        const prompt = `
${FORMATO_MEGAMAYOREO}

Datos del producto:
- Nombre interno: ${producto.nombre || 'No especificado'}
- Nombre del proveedor: ${producto.nombre_proveedor || 'No especificado'}
- SKU interno: ${producto.codigo || 'No especificado'}
- SKU proveedor: ${producto.sku_proveedor || 'No especificado'}
- Marca: ${producto.marca || 'No especificada'}
- Categoría: ${producto.categoria || 'General'}
- Descripción actual: ${producto.descripcion || 'Sin descripción'}

Genera:
1. Una descripción SEO completa (máximo 500 palabras)
2. Una descripción corta (máximo 100 caracteres) para uso interno
3. 5-8 palabras clave separadas por comas
`;

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'Eres un experto en copywriting para e-commerce y SEO. Generas descripciones de productos profesionales y optimizadas para motores de búsqueda.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 800
        });

        const contenido = response.choices[0].message.content;

        // Parsear respuesta (la IA debería seguir el formato)
        const resultado = {
            descripcion_seo: contenido,
            descripcion_corta: extraerDescripcionCorta(contenido, producto.nombre),
            palabras_clave: extraerPalabrasClave(contenido, producto),
            success: true
        };

        return resultado;

    } catch (error) {
        logger.error('Error generando descripción con IA:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Extrae o genera una descripción corta
 */
const extraerDescripcionCorta = (contenidoIA, nombreProducto) => {
    // Intentar extraer la primera línea como descripción corta
    const primeraLinea = contenidoIA.split('\n')[0];
    if (primeraLinea && primeraLinea.length <= 100) {
        return primeraLinea.replace(/[📦📐✅🏷️]/g, '').trim();
    }
    return nombreProducto || 'Producto MEGAMAYOREO';
};

/**
 * Extrae palabras clave del contenido
 */
const extraerPalabrasClave = (contenidoIA, producto) => {
    // Buscar sección de palabras clave o generar basándose en el contenido
    const keywords = [];

    if (producto.marca) keywords.push(producto.marca);
    if (producto.categoria) keywords.push(producto.categoria);
    if (producto.nombre) {
        // Extraer palabras significativas del nombre
        const palabras = producto.nombre.split(' ').filter(p => p.length > 3);
        keywords.push(...palabras.slice(0, 3));
    }

    return keywords.join(', ');
};

/**
 * Busca información del producto en internet (simulado)
 * En una implementación real, usarías APIs de búsqueda o scraping
 */
const buscarInfoProducto = async (nombreProveedor, skuProveedor) => {
    // Por ahora, retornamos datos básicos
    // En el futuro, esto podría integrar:
    // - Google Custom Search API
    // - Web scraping de sitios de proveedores
    // - Bases de datos de productos

    return {
        encontrado: false,
        mensaje: 'Búsqueda en internet no implementada. Usa la generación con IA basada en datos existentes.'
    };
};

module.exports = {
    generarDescripcion,
    buscarInfoProducto
};
