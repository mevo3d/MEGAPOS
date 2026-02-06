const { Pool } = require('pg');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const { pool } = require('../config/db');

class ExcelImportService {
  constructor() {
    this.requiredColumns = [
      { key: 'sku', label: 'SKU', required: true },
      { key: 'nombre', label: 'Nombre del Producto', required: true },
      { key: 'descripcion', label: 'Descripción', required: false },
      { key: 'categoria', label: 'Categoría', required: false },
      { key: 'unidad_medida', label: 'Unidad de Medida', required: false },
      { key: 'precio_base', label: 'Precio Base', required: true },
      { key: 'costo_promedio', label: 'Costo Promedio', required: false },
      { key: 'minimo_stock', label: 'Stock Mínimo', required: false },
      { key: 'codigo_barras', label: 'Código de Barras', required: false },
      { key: 'stock_inicial', label: 'Stock Inicial', required: false },
      { key: 'imagen_url', label: 'URL Imagen', required: false }
    ];

    this.validUnits = ['pieza', 'kg', 'litro', 'caja', 'metro', 'paquete', 'docena'];
  }

  /**
   * Genera una plantilla de Excel para descargar
   */
  async generarPlantilla(res) {
    try {
      const workbook = xlsx.utils.book_new();
      const worksheetData = [
        this.requiredColumns.map(col => col.label),
        ...Array(5).fill(null).map(() => this.requiredColumns.map(() => ''))
      ];

      const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);

      // Establecer ancho de columnas
      worksheet['!cols'] = this.requiredColumns.map(() => ({ width: 20 }));

      // Agregar hoja de instrucciones
      const instructionsData = [
        ['INSTRUCCIONES DE IMPORTACIÓN'],
        [''],
        ['COLUMNAS REQUERIDAS:'],
        ...this.requiredColumns.filter(col => col.required).map(col => [col.label, '- Obligatorio']),
        [''],
        ['COLUMNAS OPCIONALES:'],
        ...this.requiredColumns.filter(col => !col.required).map(col => [col.label, '- Opcional']),
        [''],
        ['UNIDADES DE MEDIDA VÁLIDAS:'],
        ...this.validUnits.map(unit => [unit]),
        [''],
        ['NOTAS IMPORTANTES:'],
        ['1. El SKU debe ser único por producto'],
        ['2. Los precios deben usar punto decimal (ej: 99.99)'],
        ['3. Si la categoría no existe, será creada automáticamente'],
        ['4. El stock inicial se asignará a la sucursal del importador'],
        ['5. Máximo 5000 productos por archivo']
      ];

      const instructionsSheet = xlsx.utils.aoa_to_sheet(instructionsData);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Productos');
      xlsx.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="plantilla_productos.xlsx"');
      res.send(buffer);

    } catch (error) {
      console.error('Error generando plantilla:', error);
      throw new Error('No se pudo generar la plantilla');
    }
  }

  /**
   * Procesa un archivo Excel de productos
   */
  async procesarImportacion(archivo, empleadoId, sucursalId) {
    const client = await pool.connect();
    let importacionId = null;

    try {
      // Validar archivo
      if (!archivo || !archivo.path) {
        throw new Error('No se proporcionó ningún archivo');
      }

      // Leer archivo Excel
      const workbook = xlsx.readFile(archivo.path);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        throw new Error('El archivo no contiene datos');
      }

      if (data.length > 5000) {
        throw new Error('El archivo excede el límite de 5000 productos');
      }

      // Validar columnas requeridas
      await this.validarColumnas(data[0]);

      // Crear registro de importación
      const result = await client.query(`
        INSERT INTO importaciones_log (empleado_id, sucursal_id, nombre_archivo, total_registros, estado)
        VALUES ($1, $2, $3, $4, 'procesando')
        RETURNING id
      `, [empleadoId, sucursalId, archivo.originalname, data.length]);

      importacionId = result.rows[0].id;

      // Procesar productos
      const resultado = await this.procesarProductos(client, data, sucursalId);

      // Actualizar registro de importación
      await client.query(`
        UPDATE importaciones_log
        SET registros_procesados = $1,
            registros_errores = $2,
            registros_duplicados = $3,
            estado = $4,
            errores_detalle = $5,
            fecha_fin = NOW()
        WHERE id = $6
      `, [
        resultado.procesados,
        resultado.errores.length,
        resultado.duplicados,
        resultado.errores.length > 0 ? 'completado_con_errores' : 'completado',
        JSON.stringify(resultado.errores),
        importacionId
      ]);

      await client.query('COMMIT');

      return {
        id: importacionId,
        total: data.length,
        procesados: resultado.procesados,
        errores: resultado.errores.length,
        duplicados: resultado.duplicados,
        detalles: resultado.errores
      };

    } catch (error) {
      await client.query('ROLLBACK');

      // Actualizar registro con error si se creó
      if (importacionId) {
        await client.query(`
          UPDATE importaciones_log
          SET estado = 'error',
              errores_detalle = $1,
              fecha_fin = NOW()
          WHERE id = $2
        `, [JSON.stringify([{ tipo: 'error_general', mensaje: error.message }]), importacionId]);
      }

      console.error('Error en importación:', error);
      throw error;
    } finally {
      client.release();

      // Eliminar archivo temporal
      if (archivo && archivo.path && fs.existsSync(archivo.path)) {
        fs.unlinkSync(archivo.path);
      }
    }
  }

  /**
   * Valida que las columnas requeridas estén presentes
   */
  async validarColumnas(headers) {
    const availableColumns = Object.keys(headers);
    const missingColumns = [];

    for (const col of this.requiredColumns.filter(c => c.required)) {
      const found = availableColumns.some(available =>
        available.toLowerCase().includes(col.key.toLowerCase()) ||
        available.toLowerCase().includes(col.label.toLowerCase())
      );

      if (!found) {
        missingColumns.push(col.label);
      }
    }

    if (missingColumns.length > 0) {
      throw new Error(`Columnas requeridas faltantes: ${missingColumns.join(', ')}`);
    }
  }

  /**
   * Procesa los productos del Excel
   */
  async procesarProductos(client, productos, sucursalId) {
    const resultado = {
      procesados: 0,
      duplicados: 0,
      errores: []
    };

    await client.query('BEGIN');

    try {
      for (let i = 0; i < productos.length; i++) {
        const row = productos[i];
        const rowNum = i + 2; // +2 porque Excel empieza en 1 y headers en fila 1

        try {
          const producto = await this.mapearProducto(row, sucursalId);
          await this.guardarProducto(client, producto, sucursalId);
          resultado.procesados++;

        } catch (error) {
          resultado.errores.push({
            fila: rowNum,
            tipo: 'producto',
            mensaje: error.message,
            datos: row
          });
        }
      }

      await client.query('COMMIT');
      return resultado;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Mapea una fila del Excel a un objeto producto
   */
  async mapearProducto(row, sucursalId) {
    const producto = {};

    // Mapear columnas con diferentes nombres posibles
    for (const col of this.requiredColumns) {
      const value = this.findColumnValue(row, col);

      if (col.required && (!value || value.toString().trim() === '')) {
        throw new Error(`Columna requerida vacía: ${col.label}`);
      }

      switch (col.key) {
        case 'sku':
          producto.sku = value.toString().trim();
          break;
        case 'nombre':
          producto.nombre = value.toString().trim();
          break;
        case 'descripcion':
          producto.descripcion = value ? value.toString().trim() : null;
          break;
        case 'categoria':
          producto.categoria = value ? value.toString().trim() : 'Sin categoría';
          break;
        case 'unidad_medida':
          const unidad = value ? value.toString().trim().toLowerCase() : 'pieza';
          if (!this.validUnits.includes(unidad)) {
            throw new Error(`Unidad de medida inválida: ${unidad}. Use: ${this.validUnits.join(', ')}`);
          }
          producto.unidad_medida = unidad;
          break;
        case 'precio_base':
          const precio = parseFloat(value);
          if (isNaN(precio) || precio < 0) {
            throw new Error('Precio base inválido');
          }
          producto.precio_base = precio;
          break;
        case 'costo_promedio':
          const costo = parseFloat(value) || 0;
          if (costo < 0) {
            throw new Error('Costo promedio inválido');
          }
          producto.costo_promedio = costo;
          break;
        case 'minimo_stock':
          const stockMin = parseInt(value) || 5;
          if (stockMin < 0) {
            throw new Error('Stock mínimo inválido');
          }
          producto.minimo_stock = stockMin;
          break;
        case 'codigo_barras':
          producto.codigo_barras = value ? value.toString().trim() : null;
          break;
        case 'stock_inicial':
          const stock = parseFloat(value) || 0;
          if (stock < 0) {
            throw new Error('Stock inicial inválido');
          }
          producto.stock_inicial = stock;
          break;
        case 'imagen_url':
          producto.imagen_url = value ? value.toString().trim() : null;
          break;
      }
    }

    return producto;
  }

  /**
   * Busca el valor de una columna con diferentes posibles nombres
   */
  findColumnValue(row, col) {
    const possibleNames = [
      col.key.toLowerCase(),
      col.label.toLowerCase(),
      ...col.label.toLowerCase().split(' ')
    ];

    for (const key in row) {
      if (possibleNames.some(name =>
        key.toLowerCase().includes(name) ||
        name.includes(key.toLowerCase())
      )) {
        return row[key];
      }
    }

    return null;
  }

  /**
   * Guarda un producto en la base de datos
   */
  async guardarProducto(client, producto, sucursalId) {
    try {
      // Verificar si ya existe el SKU
      const existente = await client.query(
        'SELECT id FROM productos WHERE sku = $1',
        [producto.sku]
      );

      if (existente.rows.length > 0) {
        // Actualizar producto existente
        await client.query(`
          UPDATE productos
          SET nombre = $1,
              descripcion = $2,
              unidad_medida = $3,
              precio_base = $4,
              costo_promedio = $5,
              minimo_stock = $6,
              codigo_barras = $7,
              imagen_url = $8,
              updated_at = NOW()
          WHERE sku = $9
        `, [
          producto.nombre,
          producto.descripcion,
          producto.unidad_medida,
          producto.precio_base,
          producto.costo_promedio,
          producto.minimo_stock,
          producto.codigo_barras,
          producto.imagen_url,
          producto.sku
        ]);

        const productoId = existente.rows[0].id;

        // Actualizar inventario si se especificó stock inicial
        if (producto.stock_inicial !== undefined) {
          await client.query(`
            INSERT INTO inventario (producto_id, sucursal_id, stock_fisico)
            VALUES ($1, $2, $3)
            ON CONFLICT (producto_id, sucursal_id)
            DO UPDATE SET
              stock_fisico = EXCLUDED.stock_fisico,
              version = inventario.version + 1,
              last_sync = NOW()
          `, [productoId, sucursalId, producto.stock_inicial]);
        }

        return { id: productoId, accion: 'actualizado' };
      } else {
        // Crear nuevo producto
        const categoriaId = await this.obtenerOCrearCategoria(client, producto.categoria);

        const nuevoProducto = await client.query(`
          INSERT INTO productos (
            sku, nombre, descripcion, categoria_id, unidad_medida,
            precio_base, costo_promedio, minimo_stock, codigo_barras, imagen_url
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `, [
          producto.sku,
          producto.nombre,
          producto.descripcion,
          categoriaId,
          producto.unidad_medida,
          producto.precio_base,
          producto.costo_promedio,
          producto.minimo_stock,
          producto.codigo_barras,
          producto.imagen_url
        ]);

        const productoId = nuevoProducto.rows[0].id;

        // Crear inventario inicial
        await client.query(`
          INSERT INTO inventario (producto_id, sucursal_id, stock_fisico)
          VALUES ($1, $2, $3)
        `, [productoId, sucursalId, producto.stock_inicial || 0]);

        return { id: productoId, accion: 'creado' };
      }
    } catch (error) {
      if (error.code === '23505') {
        throw new Error(`El SKU "${producto.sku}" ya existe en la base de datos`);
      }
      throw error;
    }
  }

  /**
   * Obtiene o crea una categoría
   */
  async obtenerOCrearCategoria(client, nombreCategoria) {
    if (!nombreCategoria || nombreCategoria === 'Sin categoría') {
      return null;
    }

    // Buscar categoría existente
    const existente = await client.query(
      'SELECT id FROM categorias WHERE LOWER(nombre) = LOWER($1)',
      [nombreCategoria]
    );

    if (existente.rows.length > 0) {
      return existente.rows[0].id;
    }

    // Crear nueva categoría
    const nuevaCategoria = await client.query(`
      INSERT INTO categorias (nombre, descripcion)
      VALUES ($1, $2)
      RETURNING id
    `, [nombreCategoria, `Categoría creada automáticamente durante importación`]);

    return nuevaCategoria.rows[0].id;
  }

  /**
   * Obtiene el historial de importaciones
   */
  async getHistorialImportaciones(sucursalId = null, limit = 50) {
    try {
      const query = sucursalId ? `
        SELECT il.*, e.nombre as empleado_nombre, s.nombre as sucursal_nombre
        FROM importaciones_log il
        LEFT JOIN empleados e ON il.empleado_id = e.id
        LEFT JOIN sucursales s ON il.sucursal_id = s.id
        WHERE il.sucursal_id = $1
        ORDER BY il.created_at DESC
        LIMIT $2
      ` : `
        SELECT il.*, e.nombre as empleado_nombre, s.nombre as sucursal_nombre
        FROM importaciones_log il
        LEFT JOIN empleados e ON il.empleado_id = e.id
        LEFT JOIN sucursales s ON il.sucursal_id = s.id
        ORDER BY il.created_at DESC
        LIMIT $1
      `;

      const params = sucursalId ? [sucursalId, limit] : [limit];
      const result = await pool.query(query, params);

      return result.rows;
    } catch (error) {
      console.error('Error obteniendo historial de importaciones:', error);
      throw error;
    }
  }

  /**
   * Obtiene detalles de una importación específica
   */
  async getDetallesImportacion(importacionId) {
    try {
      const result = await pool.query(`
        SELECT il.*, e.nombre as empleado_nombre, s.nombre as sucursal_nombre
        FROM importaciones_log il
        LEFT JOIN empleados e ON il.empleado_id = e.id
        LEFT JOIN sucursales s ON il.sucursal_id = s.id
        WHERE il.id = $1
      `, [importacionId]);

      return result.rows[0];
    } catch (error) {
      console.error('Error obteniendo detalles de importación:', error);
      throw error;
    }
  }
}

module.exports = ExcelImportService;