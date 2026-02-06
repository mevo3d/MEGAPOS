# Sistema de Importación de Productos - Guía Completa

## 📋 Overview

El sistema de importación de productos permite cargar miles de productos al catálogo del POS MEGAMAYOREO desde archivos Excel, con validación automática de datos, gestión de existencias iniciales y reportes detallados de errores.

## 🔧 Características Principales

### ✅ Funcionalidades Implementadas
- **Carga Masiva**: Importa hasta 5,000 productos por archivo
- **Validación Automática**: Verifica SKU únicos, formatos de datos, precios válidos
- **Gestión de Categorías**: Crea automáticamente categorías que no existen
- **Control de Inventarios**: Asigna existencias iniciales por sucursal
- **Reportes Detallados**: Muestra errores específicos por fila
- **Historial Completo**: Registro de todas las importaciones con estadísticas
- **Plantillas Predefinidas**: Descarga de plantilla con formato correcto
- **Actualización Inteligente**: Actualiza productos existentes o crea nuevos

### 🛡️ Validaciones Incluidas
- SKU único (obligatorio)
- Nombre del producto (obligatorio)
- Precio base válido (obligatorio)
- Unidades de medida válidas
- Formato de precios con punto decimal
- Límite de tamaño de archivo (10MB)
- Máximo de productos (5,000)

## 📁 Estructura del Archivo Excel

### Columnas Requeridas
| Columna | Formato | Ejemplo | Descripción |
|---------|---------|---------|-------------|
| SKU | Texto | SKU00123 | Código único del producto |
| Nombre del Producto | Texto | Coca-Cola 600ml | Nombre descriptivo |
| Precio Base | Decimal | 15.50 | Precio de venta con punto decimal |

### Columnas Opcionales
| Columna | Formato | Ejemplo | Valor por Defecto |
|---------|---------|---------|------------------|
| Descripción | Texto | Refresco de cola | - |
| Categoría | Texto | Bebidas | Sin categoría |
| Unidad de Medida | Texto | pieza | pieza |
| Costo Promedio | Decimal | 12.30 | 0 |
| Stock Mínimo | Entero | 10 | 5 |
| Código de Barras | Texto | 7891234567890 | - |
| Stock Inicial | Decimal | 100 | 0 |
| URL Imagen | Texto | https://... | - |

### Unidades de Medida Válidas
- `pieza`
- `kg`
- `litro`
- `caja`
- `metro`
- `paquete`
- `docena`

## 🚀 Guía de Uso

### Paso 1: Descargar Plantilla
1. Inicia sesión como SUPERADMIN o Gerente
2. Ve a **Panel de Administración** → **Importar Productos**
3. Haz clic en **"Descargar Plantilla"**
4. El archivo incluye hoja de productos y hoja de instrucciones

### Paso 2: Preparar Datos
1. Abre la plantilla descargada
2. Llena las columnas requeridas
3. Revisa las instrucciones en la segunda hoja
4. Verifica que no haya SKUs duplicados
5. Usa formato decimal para precios (ej: 99.99)

### Paso 3: Importar Archivo
1. Regresa a la interfaz de importación
2. Arrastra el archivo o selecciónalo con el botón
3. El sistema validará el formato automáticamente
4. Haz clic en **"Importar Productos"**
5. Espera el procesamiento (ver barra de progreso)

### Paso 4: Revisar Resultados
1. Revisa el resumen de importación:
   - Total de productos
   - Procesados exitosamente
   - Con errores
   - Duplicados
2. Si hay errores, haz clic en "Ver detalles de errores"
3. Los productos exitosos estarán disponibles inmediatamente

## 📊 Reportes y Auditoría

### Historial de Importaciones
- **Registro Completo**: Todas las importaciones quedan registradas
- **Detalles por Usuario**: Quién importó, cuándo, desde qué sucursal
- **Estadísticas**: Tiempo de procesamiento, tasas de éxito
- **Acceso por Rol**: Admins ven todo, gerentes solo su sucursal

### Tipos de Errores Comunes
| Error | Causa | Solución |
|-------|-------|----------|
| Columna requerida vacía | Falta SKU o nombre | Completa los campos obligatorios |
| SKU duplicado | Ya existe en BD | Usa otro SKU o actualiza existente |
| Precio inválido | Formato incorrecto | Usa punto decimal: 99.99 |
| Unidad inválida | No está en lista | Usa: pieza, kg, litro, caja |
| Archivo demasiado grande | >10MB | Divide en archivos más pequeños |

## 🏗️ Arquitectura Técnica

### Backend (Node.js + Express)
- **Rutas**: `/api/import/*`
- **Servicio**: `ExcelImportService`
- **Base de Datos**: Tabla `importaciones_log`
- **Procesamiento**: Librería `xlsx`
- **Almacenamiento**: Temporal en `uploads/temp`

### Frontend (React)
- **Componente**: `ProductImport.jsx`
- **Navegación**: Integrado en `AdminPanel.jsx`
- **Estilos**: TailwindCSS con diseño moderno
- **Interfaz**: Arrastrar y soltar + progreso real-time

### Base de Datos (PostgreSQL)
```sql
CREATE TABLE importaciones_log (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER REFERENCES empleados(id),
    sucursal_id INTEGER REFERENCES sucursales(id),
    nombre_archivo VARCHAR(255) NOT NULL,
    total_registros INTEGER NOT NULL,
    registros_procesados INTEGER DEFAULT 0,
    registros_errores INTEGER DEFAULT 0,
    registros_duplicados INTEGER DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'procesando',
    errores_detalle JSONB DEFAULT '[]',
    fecha_inicio TIMESTAMP DEFAULT NOW(),
    fecha_fin TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔐 Seguridad y Permisos

### Roles y Accesos
- **admin**: Acceso completo a todas las importaciones de todas las sucursales
- **gerente**: Puede importar solo para su sucursal, ve solo su historial
- **cajero/vendedor**: No tiene acceso a importación

### Validaciones de Seguridad
- Token JWT requerido en todas las peticiones
- Validación de rol por endpoint
- Límite de tamaño de archivo
- Sanitización de nombres de archivo
- Eliminación automática de archivos temporales

## 🛠️ Instalación y Configuración

### Dependencias Backend
```bash
cd backend
npm install xlsx multer
```

### Migración de Base de Datos
```bash
psql -d megamayoreo -f database/migrations/001_add_import_log.sql
```

### Configuración de Variables de Entorno
```env
DATABASE_URL=postgresql://user:password@localhost:5432/megamayoreo
NODE_ENV=development
```

## 📈 Mejores Prácticas

### Antes de Importar
1. **Verifica SKU únicos**: Asegúrate que no haya duplicados
2. **Limpia los datos**: Elimina caracteres especiales innecesarios
3. **Formatea fechas**: Si necesitas importar fechas, usa formato YYYY-MM-DD
4. **Categorías**: Agrupa productos en categorías lógicas
5. **Valida muestra**: Prueba con 5-10 productos primero

### Durante la Importación
1. **No cierres la página**: Espera a que termine el procesamiento
2. **Monitorea errores**: Revisa los mensajes de error específicos
3. **Archivos grandes**: Divide en lotes de 3000-5000 productos

### Después de Importar
1. **Verifica en inventario**: Confirma que los productos aparecen
2. **Revisa precios**: Verifica que los precios sean correctos
3. **Checa categorías**: Confirma que se crearon correctamente
4. **Consulta stock**: Verifica existencias iniciales

## 🔧 Solución de Problemas

### Problemas Comunes

#### "Error en la conexión a la base de datos"
- **Causa**: URL de BD incorrecta o servicio caído
- **Solución**: Verifica `DATABASE_URL` y que PostgreSQL esté corriendo

#### "Solo se permiten archivos Excel"
- **Causa**: Formato de archivo incorrecto
- **Solución**: Usa .xls o .xlsx, no .csv ni .numbers

#### "SKU ya existe en la base de datos"
- **Causa**: Intentando crear producto con SKU duplicado
- **Solución**: El sistema actualiza automáticamente productos existentes

#### "El archivo excede el límite de 5000 productos"
- **Causa**: Archivo demasiado grande
- **Solución**: Divide en múltiples archivos

### Debug y Logs
- **Backend**: Revisa logs del servidor para errores detallados
- **Frontend**: Usa consola del navegador para ver errores de red
- **Base de Datos**: Consulta tabla `importaciones_log` para historial

## 📞 Soporte

Para ayuda técnica contacta al equipo de desarrollo con:
- Captura de pantalla del error
- Archivo Excel de ejemplo
- Número de importación del historial
- Detalles del navegador y sistema operativo

---

**Nota**: Este sistema está diseñado para manejar eficientemente miles de productos manteniendo la integridad de los datos y proporcionando retroalimentación detallada durante todo el proceso.