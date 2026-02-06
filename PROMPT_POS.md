# 📋 PROMPT POS MEGAMAYOREO - Guía Completa de Desarrollo

## 🎯 Descripción General del Proyecto

**POS MegaMayoreo** es un Sistema de Punto de Venta y ERP (Enterprise Resource Planning) completo, diseñado para negocios de mayoreo con múltiples sucursales. El sistema sigue una arquitectura **offline-first** y está preparado para sincronización distribuida entre sucursales y un servidor central en la nube.

### Visión del Producto
Un sistema POS moderno, responsivo y escalable que permita:
- Gestionar ventas en punto de venta físico
- Administrar inventario multi-sucursal
- Controlar empleados, asistencia y roles
- Manejar rutas de vendedores móviles
- Sincronización en tiempo real entre sucursales
- Operar offline cuando no hay conexión a internet

---

## 🏗️ Arquitectura Tecnológica

### Stack Principal

| Capa | Tecnología | Versión | Propósito |
|------|------------|---------|-----------|
| **Frontend** | React + Vite | 18.2 / 5.0 | Interfaz de usuario SPA/PWA |
| **Estilos** | TailwindCSS | 3.3 | Sistema de diseño utility-first |
| **Estado** | Zustand | 4.4 | Gestión de estado global |
| **Peticiones** | Axios + React Query | - | Caché y gestión de datos |
| **Backend** | Node.js + Express | 18+ / 4.18 | API REST y servidor |
| **GraphQL** | Apollo Server | 3.12 | API GraphQL (complementaria) |
| **WebSocket** | Socket.io | 4.6 | Comunicación en tiempo real |
| **Base de Datos** | PostgreSQL / SQLite | 15 / 5.1 | Almacenamiento persistente |
| **Cola de Mensajes** | RabbitMQ | - | Sincronización asíncrona |
| **Caché** | Redis | - | Sesiones y caché |
| **Autenticación** | JWT + bcrypt | - | Tokens y hash de contraseñas |

### Estructura de Directorios

```
POS_MEGAMAYOREO/
├── backend/                    # Servidor API
│   ├── src/
│   │   ├── config/            # Configuración (DB, Redis, RabbitMQ, Logger)
│   │   ├── controllers/       # Lógica de negocio (13 controladores)
│   │   ├── routes/            # Endpoints REST (14 archivos)
│   │   ├── services/          # Servicios de negocio (9 servicios)
│   │   ├── middleware/        # Auth, validación
│   │   ├── graphql/           # Schema y resolvers GraphQL
│   │   └── server.js          # Punto de entrada
│   ├── data/                  # Base de datos SQLite
│   ├── uploads/               # Archivos subidos
│   ├── logs/                  # Logs del sistema
│   └── .env                   # Variables de entorno
│
├── frontend/                  # Aplicación React
│   ├── src/
│   │   ├── components/        # Componentes reutilizables
│   │   │   ├── ui/           # Button, Card, Input, Loading, Modal
│   │   │   ├── pos/          # ProductCard, Cart
│   │   │   └── layout/       # POSLayout
│   │   ├── pages/            # Páginas por módulo
│   │   │   ├── admin/        # Panel administrador
│   │   │   ├── gerente/      # Panel gerente
│   │   │   ├── pos/          # Punto de venta
│   │   │   └── auth/         # Login
│   │   ├── context/          # Estado global (authStore)
│   │   ├── services/         # API services
│   │   ├── utils/            # Utilidades (api.js, formatters.js)
│   │   ├── App.jsx           # Rutas principales
│   │   └── main.jsx          # Entry point
│   └── dist/                 # Build de producción
│
├── database/                  # Scripts SQL
│   ├── schema.sql            # Esquema completo PostgreSQL
│   ├── seeds.sql             # Datos iniciales
│   └── migrations/           # Migraciones
│
└── docs/                      # Documentación
```

---

## 🗄️ Modelo de Base de Datos

### Esquema Completo de Tablas

#### 1. Organización
```sql
-- Sucursales (tiendas, CEDIS, virtuales)
sucursales (id, nombre, tipo, codigo, direccion, telefono, configuracion, activa)

-- Puntos de venta por sucursal
puntos_venta (id, sucursal_id, nombre, tipo, mac_address, activa)
```

#### 2. Personal y Usuarios
```sql
-- Empleados con roles
empleados (id, sucursal_id, nombre, email, telefono, password_hash, rol, pin_acceso, activo)
-- Roles disponibles: 'admin', 'gerente', 'cajero', 'vendedor', 'chofer', 'capturista'
```

#### 3. Productos e Inventario
```sql
-- Categorías jerárquicas
categorias (id, nombre, descripcion, padre_id, activa)

-- Catálogo de productos
productos (id, sku, codigo_barras, nombre, descripcion, categoria_id, unidad_medida, 
           precio_base, costo_promedio, impuestos, minimo_stock, imagen_url, activo)

-- Precios personalizados por sucursal
productos_precios_sucursal (id, producto_id, sucursal_id, precio)

-- Ubicación física en almacén
ubicaciones_fisicas (id, producto_id, sucursal_id, codigo_ubicacion)

-- Stock en tiempo real
inventario (id, producto_id, sucursal_id, stock_fisico, stock_reservado, 
            stock_disponible [calculado], version, last_sync)
```

#### 4. Clientes
```sql
clientes (id, nombre, nombre_comercial, rfc, email, telefono, direccion, 
          lat, lng, tipo_precio, limite_credito, saldo_actual, dias_credito, 
          ruta_asignada_id, activo)
-- tipo_precio: 'general', 'mayoreo', 'distribuidor'
```

#### 5. Ventas
```sql
-- Encabezado de venta
ventas (id [UUID], folio_sucursal, sucursal_id, caja_id, empleado_id, cliente_id,
        subtotal, impuestos, descuento, total, estado, origen, sincronizado, fecha_venta)

-- Detalle de productos vendidos
ventas_detalle (id, venta_id, producto_id, cantidad, precio_unitario, 
                impuesto_unitario, descuento_unitario, subtotal, nombre_producto)

-- Métodos de pago (una venta puede tener múltiples)
metodos_pago (id, venta_id, metodo, monto, referencia)
-- metodo: 'efectivo', 'tarjeta', 'transferencia', 'credito'
```

#### 6. Cajas y Cortes
```sql
-- Cierres de caja (turnos)
cierres_caja (id, sucursal_id, caja_id, empleado_id, fecha_apertura, fecha_cierre,
              monto_inicial, ventas_efectivo, ventas_tarjeta, otros_ingresos, retiros,
              total_sistema [calculado], total_fisico, diferencia, estado, observaciones)

-- Movimientos de caja (ingresos/retiros)
movimientos_caja (id, cierre_id, tipo, monto, concepto, usuario_autorizo, fecha)
```

#### 7. Asistencia y RRHH
```sql
-- Registro de asistencia
asistencias (id, empleado_id, sucursal_id, entrada, salida, metodo_registro,
             lat_entrada, lng_entrada, estado, observaciones)

-- Eventualidades/incidencias
eventualidades (id, sucursal_id, empleado_id, tipo, descripcion, prioridad, estado)
```

#### 8. Rutas y Logística
```sql
-- Rutas de vendedores
rutas (id, nombre, vendedor_id, dia_semana, activa)

-- Visitas a clientes en ruta
visitas_ruta (id, ruta_id, cliente_id, empleado_id, fecha, lat, lng, resultado)
```

#### 9. Sistema
```sql
-- Log de sincronización
sync_log (id, sucursal_id, entidad, operacion, estado, registros_afectados)

-- Notificaciones push
notificaciones (id, empleado_id, titulo, mensaje, tipo, leida, data)

-- Historial de importaciones Excel
importaciones_log (id, empleado_id, sucursal_id, nombre_archivo, total_registros,
                   registros_procesados, registros_errores, estado, errores_detalle)

-- Configuración del sistema
configuracion_sistema (id, clave, valor, tipo, descripcion)

-- Archivos del sistema (logos, etc.)
archivos_sistema (id, nombre_original, nombre_guardado, tipo_archivo, ruta_archivo)
```

---

## 👥 Sistema de Roles y Permisos

### Roles Definidos

| Rol | Ruta Principal | Accesos |
|-----|----------------|---------|
| **admin** | `/admin` | Acceso completo: usuarios, sucursales, configuración, reportes globales |
| **gerente** | `/gerente` | Su sucursal: empleados, inventario, reportes locales, importación |
| **cajero** | `/pos` | Punto de venta, cobro, cierre de caja |
| **vendedor** | `/pos` | Ventas, gestión de clientes |
| **chofer** | `/pos` | Entregas, estado de rutas |
| **capturista** | `/admin` | Solo crear productos (sin editar/eliminar) |

### Credenciales de Prueba

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `superadmin` | `123456` | admin |
| `gerente` | `123456` | gerente |
| `caja1` | `123456` | cajero |
| `caja2` | `123456` | cajero |
| `vendedor1` | `123456` | vendedor |

---

## ✅ FUNCIONALIDADES IMPLEMENTADAS

### 1. Autenticación y Seguridad
- ✅ Login con email o username
- ✅ Tokens JWT con expiración configurable
- ✅ Hashing de contraseñas con bcrypt
- ✅ Middleware de autenticación
- ✅ Protección de rutas por rol
- ✅ Redirección automática según rol

### 2. Panel de Administración (Admin)
- ✅ Dashboard con estadísticas globales
- ✅ Gestión completa de usuarios (CRUD)
- ✅ Gestión de sucursales/tiendas
- ✅ Gestión de puntos de venta (cajas)
- ✅ Configuración del sistema (logo, datos empresa)
- ✅ Importación masiva de productos desde Excel

### 3. Panel de Gerente
- ✅ Dashboard de sucursal específica
- ✅ Gestión de empleados de su sucursal
- ✅ Control de inventario local
- ✅ Importación de productos (filtrado por sucursal)

### 4. Punto de Venta (POS)
- ✅ Búsqueda de productos por nombre/código/SKU
- ✅ Vista de productos en grid/lista
- ✅ Carrito de compras funcional
- ✅ Ajuste de cantidades (+/-)
- ✅ Cálculo de subtotales e impuestos
- ✅ Procesamiento de ventas
- ✅ Múltiples métodos de pago

### 5. Gestión de Productos
- ✅ CRUD completo de productos
- ✅ Generación automática de SKU (formato MEGA-XXXX)
- ✅ Detección de SKU duplicados
- ✅ Multi-selección y eliminación masiva
- ✅ Categorías dinámicas
- ✅ Imágenes de productos

### 6. Importación de Excel
- ✅ Carga masiva (hasta 5,000 productos)
- ✅ Validación automática de datos
- ✅ Reporte de errores por fila
- ✅ Historial de importaciones
- ✅ Plantilla descargable
- ✅ Creación automática de categorías

### 7. Inventario
- ✅ Stock por sucursal
- ✅ Movimientos de entrada/salida
- ✅ Stock reservado (apartados)
- ✅ Alertas de stock mínimo

### 8. WebSocket
- ✅ Conexión en tiempo real
- ✅ Unión a salas por sucursal
- ✅ Eventos de sincronización

### 9. API REST
- ✅ Endpoints para todas las entidades principales
- ✅ Rate limiting configurado
- ✅ Validación con Joi
- ✅ Manejo de errores centralizado
- ✅ Logs con Winston

---

## ⏳ FUNCIONALIDADES PENDIENTES O PARCIALES

### 1. Cierre de Caja (70% completado)
**Estado actual:** Backend implementado, falta UI completa
**Faltante:**
- [ ] Interfaz de apertura de caja
- [ ] Pantalla de cierre con conteo físico
- [ ] Reporte de diferencias
- [ ] Historial de movimientos de caja
- [ ] Autorización de retiros

**Archivos relacionados:**
- `backend/src/controllers/cajas.controller.js`
- `backend/src/services/cajas.service.js`
- `frontend/src/pages/pos/CorteCaja.jsx` (parcial)

### 2. Reportes (40% completado)
**Estado actual:** Endpoints básicos existen, sin dashboard
**Faltante:**
- [ ] Dashboard de reportes con gráficos (Recharts ya instalado)
- [ ] Reporte de ventas por período
- [ ] Reporte de productos más vendidos
- [ ] Reporte de inventario (stock bajo, movimientos)
- [ ] Exportación a PDF/Excel
- [ ] Filtros avanzados

**Archivos relacionados:**
- `backend/src/controllers/reportes.controller.js`
- `backend/src/services/reportes.service.js`

### 3. Gestión de Clientes (30% completado)
**Estado actual:** Tabla en BD, sin UI
**Faltante:**
- [ ] CRUD completo de clientes
- [ ] Asignación de tipo de precio (general/mayoreo/distribuidor)
- [ ] Historial de compras por cliente
- [ ] Gestión de créditos
- [ ] Saldos y límites de crédito
- [ ] Búsqueda en POS

### 4. Rutas y Logística (10% completado)
**Estado actual:** Solo esquema de BD
**Faltante:**
- [ ] Asignación de vendedores a rutas
- [ ] Calendario de rutas por día
- [ ] App/vista móvil para vendedores
- [ ] Registro de visitas con GPS
- [ ] Integración con Google Maps
- [ ] Optimización de rutas

### 5. Sincronización Multi-Sucursal (20% completado)
**Estado actual:** Estructura preparada, sin implementación real
**Faltante:**
- [ ] Queue de operaciones offline
- [ ] Resolución de conflictos
- [ ] Sincronización bidireccional
- [ ] Panel de monitoreo de sync
- [ ] Reconexión automática

### 6. Asistencia de Empleados (20% completado)
**Estado actual:** Backend básico
**Faltante:**
- [ ] Interfaz de check-in/check-out
- [ ] Registro por geolocalización
- [ ] Registro por WiFi
- [ ] Reportes de asistencia
- [ ] Cálculo de retardos/faltas

### 7. Compras/Proveedores (40% completado - según historial)
**Estado actual:** Carrito de requisiciones y pedidos parciales
**Faltante:**
- [ ] CRUD de proveedores
- [ ] Asignación de proveedores a productos
- [ ] Órdenes de compra completas
- [ ] Recepción de mercancía
- [ ] Historial de compras
- [ ] Evaluación de proveedores

### 8. Notificaciones Push (10% completado)
**Estado actual:** Tabla en BD y claves VAPID configuradas
**Faltante:**
- [ ] Service Worker para PWA
- [ ] Suscripción de navegadores
- [ ] Panel de notificaciones en UI
- [ ] Notificaciones de stock bajo
- [ ] Notificaciones de ventas

### 9. Facturación Electrónica
**Estado actual:** No implementado
**Requerido:**
- [ ] Integración con PAC (Facturama, Finkok, etc.)
- [ ] Generación de CFDI 4.0
- [ ] Catálogos SAT
- [ ] Timbrado automático
- [ ] Almacenamiento de XMLs

### 10. Tickets e Impresión
**Estado actual:** No implementado
**Requerido:**
- [ ] Diseñador de tickets
- [ ] Vista previa de impresión
- [ ] Impresión térmica
- [ ] Código de barras en ticket
- [ ] Tickets de corte de caja

---

## 🔧 Variables de Entorno (.env)

```env
# Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pos_megamayoreo
DB_USER=postgres
DB_PASSWORD=tu_password
USE_SQLITE=true  # Cambiar a false para PostgreSQL

# Servidor
PORT=3005
NODE_ENV=development

# JWT
JWT_SECRET=tu_secret_key_muy_segura
JWT_EXPIRES_IN=24h

# CORS
FRONTEND_URL=http://localhost:5173,http://localhost:4444

# Archivos
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Google Maps (para rutas)
GOOGLE_MAPS_API_KEY=tu_api_key

# OpenAI (para asistente IA)
OPENAI_API_KEY=tu_api_key
OPENAI_MODEL=gpt-4o-mini

# Redis (opcional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Notificaciones Push
VAPID_PUBLIC_KEY=tu_public_key
VAPID_PRIVATE_KEY=tu_private_key
VAPID_EMAIL=mailto:admin@tuempresa.com

# Empresa
COMPANY_NAME=Mega Mayoreo
COMPANY_ADDRESS=Tu dirección
COMPANY_PHONE=555-123-4567
COMPANY_EMAIL=contacto@tuempresa.com
COMPANY_RFC=XAXX010101000
```

---

## 🚀 Instrucciones de Ejecución

### Desarrollo Local

```bash
# 1. Clonar repositorio
git clone <url-del-repo>
cd POS_MEGAMAYOREO

# 2. Instalar todas las dependencias
npm run install-all

# 3. Configurar variables de entorno
# Copiar backend/.env.example a backend/.env y configurar

# 4. Iniciar en modo desarrollo
npm run dev

# Esto inicia:
# - Frontend en http://localhost:5173
# - Backend en http://localhost:3005
```

### Con Docker (Completo)

```bash
# Desarrollo con hot-reload
docker-compose -f docker-compose.dev.yml up --build

# Esto inicia:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:3005
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
# - RabbitMQ: http://localhost:15672
```

---

## 📝 Notas Técnicas Importantes

### Base de Datos Dual
- El sistema puede operar con **SQLite** (desarrollo) o **PostgreSQL** (producción)
- Cambiar con `USE_SQLITE=true/false` en `.env`
- La BD SQLite se crea automáticamente en `backend/data/megamayoreo.db`

### Generación de SKU
- Formato: `MEGA-XXXX` (4 dígitos)
- Busca el primer número disponible (rellena huecos)
- Validación de unicidad antes de guardar

### Arquitectura Offline-First
- IndexedDB para almacenamiento local (idb library)
- Queue de operaciones pendientes
- Sincronización al recuperar conexión (pendiente implementar)

### PWA Preparado
- Vite PWA plugin configurado
- Service Worker listo para notificaciones
- Manifest.json pendiente de completar

---

## 🎨 Guía de Diseño UI/UX

### Paleta de Colores (TailwindCSS)
- **Primario:** Azul (`blue-500` a `blue-700`)
- **Secundario:** Gris (`slate-100` a `slate-900`)
- **Éxito:** Verde (`emerald-500`)
- **Error:** Rojo (`red-500`)
- **Advertencia:** Amarillo (`amber-500`)

### Componentes UI Existentes
```
frontend/src/components/ui/
├── Button.jsx    # Botones con variantes (primary, secondary, danger)
├── Card.jsx      # Tarjetas contenedoras
├── Input.jsx     # Inputs con validación
├── Loading.jsx   # Spinners y skeletons
└── Modal.jsx     # Modales reutilizables
```

### Iconos
- Librería: **Lucide React**
- Uso: `import { Icon } from 'lucide-react'`

---

## 📋 Próximos Pasos Recomendados

### Prioridad Alta
1. Completar **Cierre de Caja** (UI faltante)
2. Implementar **Gestión de Clientes** completa
3. Crear **Dashboard de Reportes** con gráficos

### Prioridad Media
4. Finalizar **Sistema de Compras/Proveedores**
5. Implementar **Tickets e Impresión**
6. Desarrollar **Notificaciones Push**

### Prioridad Baja
7. Completar **Rutas y Logística**
8. Implementar **Facturación Electrónica**
9. Desarrollar **App Móvil React Native**

---

## 📞 Información de Contacto y Soporte

Este documento fue generado para servir como guía completa del proyecto POS MegaMayoreo. Cualquier desarrollo futuro debe basarse en esta especificación y mantener la coherencia con la arquitectura existente.

**Última actualización:** 30 de Diciembre de 2024

---

> **Nota:** Este prompt está diseñado para ser utilizado por desarrolladores o asistentes de IA que necesiten continuar o reiniciar el desarrollo del sistema. Contiene toda la información necesaria para entender el estado actual y los objetivos del proyecto.
