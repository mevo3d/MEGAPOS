# API Reference - Configuración del Sistema

## Endpoints de Logo

### 1. Obtener Logo (Público)
```http
GET /api/configuracion/logo
```
**Descripción**: Descarga el logo actual del sistema
**Autenticación**: No requerida
**Respuesta**: Archivo binario de imagen

**Ejemplo**:
```javascript
const response = await fetch('/api/configuracion/logo', {
  responseType: 'blob'
});
const url = URL.createObjectURL(response.data);
setLogoUrl(url);
```

---

### 2. Obtener Información del Logo (Público)
```http
GET /api/configuracion/logo/info
```
**Descripción**: Obtiene metadata del logo actual
**Autenticación**: No requerida
**Respuesta**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre_original": "logo.png",
    "tipo_archivo": "image/png",
    "tamaño": 25600,
    "updated_at": "2025-12-01T10:30:00Z"
  }
}
```

---

### 3. Subir Logo (Admin)
```http
POST /api/configuracion/logo/upload
```
**Autenticación**: Requerida (JWT token)
**Rol requerido**: admin
**Content-Type**: multipart/form-data

**Parámetros**:
- `logo` (file): Imagen a subir (PNG, JPG, WEBP, SVG, máx 5MB)

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre_original": "logo.png",
    "nombre_guardado": "a1b2c3d4-e5f6-g7h8.png",
    "tipo_archivo": "image/png",
    "tamaño": 25600,
    "actualizado_por": 1,
    "created_at": "2025-12-01T10:30:00Z"
  },
  "message": "Logo actualizado exitosamente"
}
```

**Ejemplo**:
```javascript
const formData = new FormData();
formData.append('logo', file);

const response = await api.post('/configuracion/logo/upload', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});
```

---

### 4. Eliminar Logo (Admin)
```http
DELETE /api/configuracion/logo/:id
```
**Autenticación**: Requerida (JWT token)
**Rol requerido**: admin

**Parámetros**:
- `id` (path): ID del logo a eliminar

**Respuesta**:
```json
{
  "success": true,
  "message": "Logo eliminado exitosamente"
}
```

---

## Endpoints de Configuración General

### 5. Obtener Todas las Configuraciones (Admin)
```http
GET /api/configuracion/all
```
**Autenticación**: Requerida (JWT token)
**Rol requerido**: admin

**Respuesta**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "clave": "nombre_empresa",
      "valor": "MegaMayoreo",
      "tipo": "texto",
      "descripcion": "Nombre de la empresa",
      "created_at": "2025-12-01T10:00:00Z"
    }
  ]
}
```

---

### 6. Obtener Configuración Específica (Admin)
```http
GET /api/configuracion/:clave
```
**Autenticación**: Requerida (JWT token)
**Rol requerido**: admin

**Parámetros**:
- `clave` (path): Clave de configuración

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "clave": "nombre_empresa",
    "valor": "MegaMayoreo",
    "tipo": "texto"
  }
}
```

---

### 7. Actualizar Configuración (Admin)
```http
POST /api/configuracion/update
```
**Autenticación**: Requerida (JWT token)
**Rol requerido**: admin
**Content-Type**: application/json

**Body**:
```json
{
  "clave": "nombre_empresa",
  "valor": "MegaMayoreo SAS",
  "descripcion": "Nombre de la empresa"
}
```

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "clave": "nombre_empresa",
    "valor": "MegaMayoreo SAS",
    "tipo": null,
    "descripcion": "Nombre de la empresa",
    "actualizado_por": 1,
    "updated_at": "2025-12-01T10:30:00Z"
  },
  "message": "Configuración actualizada"
}
```

---

## Códigos de Error

| Código | Mensaje | Solución |
|--------|---------|----------|
| 400 | No se proporcionó archivo | Enviar archivo en multipart/form-data |
| 400 | Solo se permiten imágenes | Usar PNG, JPG, WEBP o SVG |
| 400 | El archivo es demasiado grande | Reducir a menos de 5MB |
| 403 | Acceso denegado | Usuario no es admin |
| 404 | Logo no encontrado | No hay logo subido o ya fue eliminado |
| 404 | Archivo no encontrado | El archivo se eliminó del servidor |
| 500 | Error al subir el logo | Revisar logs del servidor |

---

## Ejemplos de Uso

### React Component
```javascript
import { useEffect, useState } from 'react';
import api from '../utils/api';

export function LogoDisplay() {
  const [logo, setLogo] = useState(null);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const response = await api.get('/configuracion/logo', {
          responseType: 'blob'
        });
        setLogo(URL.createObjectURL(response.data));
      } catch (error) {
        console.log('Logo no disponible');
      }
    };
    loadLogo();
  }, []);

  if (!logo) return <DefaultIcon />;
  return <img src={logo} alt="Logo" />;
}
```

### Subir Logo desde Admin
```javascript
async function handleUploadLogo(file) {
  const formData = new FormData();
  formData.append('logo', file);

  try {
    const response = await api.post('/configuracion/logo/upload', formData);
    console.log('Logo actualizado:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data?.message);
  }
}
```

---

## Variables de Entorno

Asegúrate de que el backend tenga permisos para crear la carpeta `uploads`:

```env
# No se requieren variables especiales, se crea automáticamente
# La ruta es: {PROJECT_ROOT}/backend/uploads
```
