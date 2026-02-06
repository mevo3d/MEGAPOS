# FUNCIONES POS_MEGAMAYOREO - Documentación Completa

> **Última actualización:** 2026-01-01  
> **Versión:** 2.0 - Módulo de IA integrado

---

## 📋 Índice

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Módulos Principales](#módulos-principales)
3. [Gestión de Usuarios y Roles](#gestión-de-usuarios-y-roles)
4. [Inventario Inteligente con IA](#inventario-inteligente-con-ia)
5. [Asistente IA de Business Intelligence](#asistente-ia-de-business-intelligence)
6. [Punto de Venta (POS)](#punto-de-venta-pos)
7. [Pagos B2B y Verificación](#pagos-b2b-y-verificación)
8. [Reportes y Análisis](#reportes-y-análisis)
9. [Configuración del Sistema](#configuración-del-sistema)
10. [API Endpoints](#api-endpoints)

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   POS    │  │  Admin   │  │  BI/IA   │  │ Reportes │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                    API REST (Express.js)
                              │
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Controllers│ │ Services │  │Middleware│  │  Utils   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────┴────┐         ┌─────┴─────┐        ┌────┴────┐
    │ SQLite  │         │  OpenAI   │        │  Python │
    │   DB    │         │   API     │        │  rembg  │
    └─────────┘         └───────────┘        └─────────┘
```

---

## 📦 Módulos Principales

### 1. Gestión de Sucursales
- Crear, editar y desactivar sucursales
- Tipos de sucursal personalizables (bodega, tienda, etc.)
- Puntos de venta por sucursal

### 2. Gestión de Empleados
- CRUD completo de empleados
- Asignación a sucursales
- Control de acceso por rol

### 3. Catálogo de Productos
- Productos con campos extendidos (proveedor, marca, SKU)
- Galería de imágenes con procesamiento automático
- Descripciones SEO generadas con IA
- Categorización y búsqueda

### 4. Inventario Multi-sucursal
- Stock por ubicación
- Movimientos de inventario (entradas, salidas, traspasos)
- Alertas de stock mínimo

### 5. Compras y Proveedores
- Órdenes de compra
- Recepción de mercancía
- Actualización automática de inventario

### 6. Ventas y POS
- Punto de venta táctil
- Múltiples métodos de pago
- Tickets y facturas

### 7. CRM y Clientes
- Base de datos de clientes
- Historial de compras
- Notas de seguimiento

---

## 👥 Gestión de Usuarios y Roles

| Rol | Panel Dedicado | Descripción |
|-----|----------------|-------------|
| **superadmin** | `/admin` | Control total + Asistente IA + Configuración |
| **admin** | `/admin` | Administración de sucursal |
| **gerente** | `/gerente` | Reportes, inventario, supervisión |
| **telemarketing** | `/telemarketing` | CRM, llamadas, seguimiento clientes |
| **compras** | `/compras` | Órdenes de compra, proveedores, recepciones |
| **cajero** | `/pos` | Punto de venta, cobros |
| **vendedor** | `/pos` | Punto de venta, pedidos |
| **capturista** | `/mobile/capture` | Carga rápida de productos (PWA) |

### Autenticación Flexible
- Acceso por **email** (admin@megamayoreo.com) O **usuario** (admin)
- Una persona puede tener múltiples cuentas con diferentes roles
- Ejemplo: "Barby" puede tener cuenta de superadmin y otra de compras

---

## 🤖 Inventario Inteligente con IA

### Campos de Producto Extendidos
| Campo | Uso |
|-------|-----|
| `nombre_proveedor` | Nombre exacto del fabricante |
| `sku_proveedor` | Código original del proveedor |
| `marca` | Marca del producto |
| `descripcion_corta` | Búsqueda rápida interna |
| `descripcion_seo` | Para e-commerce/catálogo web |
| `palabras_clave` | SEO y búsqueda |

### Galería de Imágenes
- **Máximo**: 5 imágenes por producto
- **Procesamiento**: Eliminación automática de fondo blanco
- **Tecnología**: Python + rembg (IA offline)

### Generación de Descripciones
- **Motor**: OpenAI GPT-3.5-turbo
- **Formato**: Estándar MEGAMAYOREO
- **Optimización**: SEO para e-commerce

---

## 🧠 Asistente IA de Business Intelligence

### Descripción
Módulo exclusivo para **Superadmin** que permite hacer consultas en lenguaje natural a la base de datos del sistema.

### Ejemplos de Consultas
- "¿Cuánto vendí este mes?"
- "¿Cuál es el producto más vendido en la sucursal Centro?"
- "Dame un resumen de inventario con stock bajo"
- "¿Cuántos clientes nuevos tuve esta semana?"

### Configuración
Ubicación: **Panel Superadmin → Asistente IA**
- API Key de OpenAI (configurada en .env)
- Modelo a utilizar (GPT-3.5-turbo por defecto)
- Historial de consultas guardado

### Características
- Generación automática de SQL desde lenguaje natural
- Validación de seguridad (solo SELECT permitido)
- Respuestas en lenguaje natural
- Visualización de datos en tabla
- Historial de consultas por usuario

---

## 📱 PWA Móvil para Carga Rápida de Productos ✅

### Descripción
Aplicación web progresiva (PWA) optimizada para iPhone/Android que permite:
- **Carga rápida de productos** desde el celular
- **Escaneo de código de barras** con la cámara
- **Captura de foto** del producto
- **Multi-usuario simultáneo** (3, 8, 20+ dispositivos)

### Acceso
- URL: `http://TU_IP:5173/mobile/capture`
- Usuarios con rol `capturista` van automáticamente aquí

### Casos de Uso
| Usuario | Función |
|---------|---------|
| **Capturista** | Alta rápida de nuevos productos |
| **Encargado CEDIS** | Recepción de mercancía |
| **Bodeguero** | Verificación de inventario |

### Características Técnicas
- Interfaz minimalista optimizada para móvil
- Funciona offline (sincroniza al reconectar)
- Cada usuario tiene su login individual
- Registro de quién cargó cada producto
- Integración con cámara para fotos y barcode

### Estado: � Implementado


## 💰 Punto de Venta (POS)

### Flujo de Venta
1. Seleccionar cliente (opcional)
2. Agregar productos al carrito
3. Aplicar descuentos si corresponde
4. Seleccionar método de pago
5. Procesar cobro
6. Imprimir ticket

### Métodos de Pago
- Efectivo
- Tarjeta (terminal externa)
- Transferencia SPEI
- Crédito a cliente

---

## 🔐 Pagos B2B y Verificación

### Estados de Pago
```
pendiente → verificacion → detectado → confirmado → liberado
                                    ↓
                               rechazado
```

### Flujo de Liberación
1. Cliente genera pedido → estado `pendiente`
2. Sistema genera referencia SPEI
3. Webhook detecta pago → estado `detectado`
4. Contabilidad confirma → estado `confirmado`
5. Logística puede surtir → mercancía liberada

---

## 📊 Reportes y Análisis

### Dashboard de BI
- KPIs principales (ventas, tickets, utilidad)
- Gráficas de tendencia
- Top productos
- Comparativas por período

### Reportes Disponibles
- Ventas por período
- Ventas por sucursal
- Productos más vendidos
- Inventario valorizado
- Movimientos de caja

---

## ⚙️ Configuración del Sistema

### Panel de Configuración (Superadmin)
| Sección | Opciones |
|---------|----------|
| General | Logo, nombre empresa, datos fiscales |
| IA | API Key OpenAI, modelo, límites |
| Sucursales | Tipos, configuración por defecto |
| Usuarios | Políticas de contraseña, sesiones |

---

## 🔌 API Endpoints

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/logout` | Cerrar sesión |

### Productos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/productos` | Listar productos |
| POST | `/api/productos` | Crear producto |
| PUT | `/api/productos/:id` | Actualizar producto |
| DELETE | `/api/productos/:id` | Eliminar producto |
| POST | `/api/productosIA/:id/generar-descripcion` | Generar descripción IA |

### Imágenes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/productosImagenes/:id/imagenes` | Listar imágenes |
| POST | `/api/productosImagenes/:id/imagenes` | Subir imagen |
| DELETE | `/api/productosImagenes/imagenes/:id` | Eliminar imagen |

### Asistente IA (NUEVO)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/ai-assistant/query` | Consulta en lenguaje natural |
| GET | `/api/ai-assistant/history` | Historial de consultas |
| PUT | `/api/ai-assistant/config` | Actualizar configuración |

---

## 📝 Historial de Cambios

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2026-01-01 | 2.0 | Módulo de IA, Inventario Inteligente, Asistente BI |
| 2025-12-31 | 1.5 | Pagos B2B, Verificación, Roles |
| 2025-12-15 | 1.0 | Sistema base POS |

---

> 📌 **Nota**: Este documento se actualiza conforme se agregan nuevas funcionalidades al sistema.
