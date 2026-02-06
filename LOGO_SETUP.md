# 📋 Gestión de Logo - Guía de Implementación

## Resumen de Cambios

Se ha implementado un sistema completo para gestionar el logotipo del sistema en el panel de superadmin. El logo se muestra tanto en la pantalla de login como se prepara la infraestructura para mostrarlo en las cajas POS.

---

## 🔄 Cambios Realizados

### 1️⃣ **Base de Datos**
**Archivo**: `database/schema.sql` y `database/add-configuracion-tables.sql`

Se agregaron dos nuevas tablas:

```sql
-- Tabla para almacenar configuración del sistema
CREATE TABLE configuracion_sistema (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    tipo VARCHAR(50), -- 'texto', 'numero', 'json', 'archivo'
    descripcion TEXT,
    actualizado_por INTEGER REFERENCES empleados(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para almacenar archivos (logos, documentos, etc)
CREATE TABLE archivos_sistema (
    id SERIAL PRIMARY KEY,
    nombre_original VARCHAR(255) NOT NULL,
    nombre_guardado VARCHAR(255) UNIQUE NOT NULL,
    tipo_archivo VARCHAR(50),
    ruta_archivo TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'logo', 'documento', etc
    tamaño INTEGER,
    actualizado_por INTEGER REFERENCES empleados(id),
    activo BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Por qué**:
- `configuracion_sistema`: Permite almacenar cualquier configuración futura del sistema
- `archivos_sistema`: Gestiona archivos como logos, documentos, etc. con control de versiones

---

### 2️⃣ **Backend - Controlador**
**Archivo**: `backend/src/controllers/configuracion.controller.js`

Nuevos controladores:
- `getConfiguracion()` - Obtener todas las configuraciones
- `getConfigValue()` - Obtener un valor específico
- `updateConfiguracion()` - Actualizar configuración
- `getLogo()` - Descargar logo (público)
- `getLogoInfo()` - Información del logo
- `uploadLogo()` - Subir nuevo logo (admin)
- `deleteLogo()` - Eliminar logo (admin)

**Características**:
- Validación de tipos MIME (PNG, JPG, WEBP, SVG)
- Límite de tamaño (5MB)
- Desactivación automática de logos anteriores
- Manejo de errores robusto

---

### 3️⃣ **Backend - Rutas**
**Archivo**: `backend/src/routes/configuracion.routes.js`

Endpoints disponibles:

```
GET  /api/configuracion/logo           - Descargar logo (público)
GET  /api/configuracion/logo/info      - Info del logo (público)
GET  /api/configuracion/all            - Todas las configs (admin)
GET  /api/configuracion/:clave         - Config específica (admin)
POST /api/configuracion/update         - Actualizar config (admin)
POST /api/configuracion/logo/upload    - Subir logo (admin)
DELETE /api/configuracion/logo/:id     - Eliminar logo (admin)
```

---

### 4️⃣ **Backend - Servidor**
**Archivo**: `backend/src/server.js`

Cambios:
- Agregada ruta `/api/configuracion`
- Configurada carpeta estática `/uploads` para servir archivos

```javascript
app.use('/api/configuracion', require('./routes/configuracion.routes'));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
```

---

### 5️⃣ **Frontend - Componente Logo Settings**
**Archivo**: `frontend/src/pages/admin/LogoSettings.jsx`

Nuevo componente con:
- Vista previa del logo actual
- Carga de archivo con validaciones
- Información del logo (nombre, tipo, tamaño, fecha)
- Botón para eliminar logo
- Recomendaciones de formato

**Características**:
- Validación en cliente de tipo y tamaño
- Preview local antes de subir
- Manejo de estados (cargando, subiendo)
- Feedback con toast notifications

---

### 6️⃣ **Frontend - AdminPanel**
**Archivo**: `frontend/src/pages/admin/AdminPanel.jsx`

Cambios:
- Agregada opción "Logo del Sistema" al menú
- Importada componente `LogoSettings`
- Nuevo switch case para renderizar `LogoSettings`

```javascript
{
  id: 'logo',
  title: 'Logo del Sistema',
  icon: Image,
  description: 'Personalizar logotipo'
}
```

---

### 7️⃣ **Frontend - Página de Login**
**Archivo**: `frontend/src/pages/auth/Login.jsx`

Cambios:
- Agregado estado para logo URL y carga
- Función `loadLogo()` que obtiene el logo del servidor
- Renderizado condicional del logo o icono por defecto
- Fallback a icono `Store` si no hay logo
- Timeout de 5 segundos para no bloquear el login

```javascript
const [logoUrl, setLogoUrl] = useState(null);
const [logoLoading, setLogoLoading] = useState(true);

useEffect(() => {
  loadLogo();
}, []);
```

---

## 🚀 Cómo Usar

### Para el Superadmin:

1. **Ir al Panel de Administración**
   - Acceder con credenciales de admin

2. **Navegar a "Logo del Sistema"**
   - Hacer clic en la opción en el menú

3. **Subir el Logo**
   - Hacer clic en "Subir Logo"
   - Seleccionar imagen (PNG, JPG, WEBP, SVG)
   - El sistema validará automáticamente
   - La imagen se mostrará inmediatamente

4. **Ver el Logo en Login**
   - Al cerrar sesión y volver a la pantalla de login
   - El logo aparecerá en lugar del icono por defecto

### Para Usuarios Finales:

- El logo aparecerá automáticamente en la pantalla de login
- Si no hay logo configurado, se muestra el icono por defecto
- No hay cambios en la experiencia de usuario final

---

## 📁 Estructura de Carpetas

```
backend/
├── uploads/                    ← Se crea automáticamente
│   └── [uuid].[ext]           ← Logo guardado
├── src/
│   ├── controllers/
│   │   └── configuracion.controller.js  ← NUEVO
│   └── routes/
│       └── configuracion.routes.js      ← NUEVO

frontend/
└── src/
    └── pages/
        └── admin/
            ├── AdminPanel.jsx           ← MODIFICADO
            └── LogoSettings.jsx         ← NUEVO

database/
├── schema.sql                  ← MODIFICADO
└── add-configuracion-tables.sql ← NUEVO (Script separado)
```

---

## 🔒 Seguridad

✅ **Implementado**:
- Validación de tipos MIME
- Límite de tamaño de archivo (5MB)
- Solo admins pueden subir/eliminar logos
- Autorización mediante JWT
- Eliminación de archivos previos

---

## 🔧 Instalación

### 1. Actualizar Base de Datos

```bash
# Ejecutar en PostgreSQL
psql -U postgres -d pos_megamayoreo -f database/add-configuracion-tables.sql
```

Alternativa: Ejecutar manualmente las queries del archivo en pgAdmin

### 2. Instalar Dependencias (si es necesario)

El backend ya tiene las dependencias necesarias:
- `multer` - Para upload de archivos
- `uuid` - Para generar nombres únicos

### 3. Reiniciar Backend

```bash
# En la carpeta backend
npm restart
# o si usas docker-compose
docker-compose up -d --build
```

### 4. Probar

1. Acceder al admin panel
2. Ir a "Logo del Sistema"
3. Subir una imagen
4. Cerrar sesión
5. Ver el logo en login

---

## 📝 Notas Importantes

- Los logos se guardan en la carpeta `uploads/` del backend
- Los nombres de archivo se generan con UUID para evitar colisiones
- El sistema solo mantiene activo un logo a la vez
- Los logos anteriores se desactivan pero no se eliminan de la BD
- La carpeta `uploads/` se crea automáticamente si no existe

---

## 🐛 Troubleshooting

**Problema**: El logo no aparece en login
- Verificar que el archivo se subió correctamente en el admin panel
- Revisar que la carpeta `uploads/` exista en el backend
- Verificar logs del backend para errores

**Problema**: Error al subir imagen
- Verificar el formato (PNG, JPG, WEBP, SVG)
- Verificar que el tamaño sea menor a 5MB
- Revisar permisos de carpeta `uploads/`

**Problema**: Solo admin puede subir logo
- Verificar que el usuario tenga rol 'admin'
- Verificar token JWT válido

---

## 🎯 Funcionalidades Futuras

Con esta infraestructura ya implementada, es fácil agregar:
- Múltiples logos para diferentes sucursales
- Banners o imágenes en el POS
- Configuración de temas
- Archivos de documentos del sistema

