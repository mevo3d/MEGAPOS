# MegaMayoreo POS/ERP

Sistema POS Offline-First con arquitectura distribuida, diseñado para multi-sucursal y alta disponibilidad. Este sistema permite la gestión integral de ventas, inventarios y administración para negocios de mayoreo y menudeo.

## 🌟 Funcionalidades Principales

### 🛒 Punto de Venta (POS)
- Interfaz optimizada para venta rápida.
- Búsqueda eficiente de productos por nombre, SKU o código de barras.
- Manejo de carrito de compras, cálculo de totales e impuestos.
- Soporte para tickets y recibos.
- Funcionamiento Offline: Continúa vendiendo sin internet.

### 📦 Gestión de Inventarios
- Administración completa de productos (Altas, Bajas, Modificaciones).
- Control de Stock en tiempo real.
- Sincronización entre sucursales y nube central.
- Manejo de proveedores y recepciones de mercancía.

### 👥 Administración
- Dashboard con métricas clave (Ventas del día, productos más vendidos).
- Gestión de Usuarios y Roles (Administradores, Cajeros, Almacenistas, Gestores).
- Configuración de sucursales y cajas.

### 🔄 Arquitectura Distribuida
- **Offline-First:** Los datos se guardan localmente y se sincronizan cuando hay conexión.
- **Sincronización Bidireccional:** Comunicación fluida entre sucursales y servidor central.

---

## 🚀 Guía de Instalación y Ejecución

### Opción 1: Ejecución Manual (Node.js)

Requisitos: Node.js (v16+), npm, PostgreSQL.

1.  **Instalar Dependencias:**
    Ejecuta el siguiente comando en la raíz del proyecto para instalar dependencias de frontend y backend:
    ```bash
    npm run install-all
    ```

2.  **Configuración de Entorno:**
    - Asegúrate de tener una instancia de PostgreSQL corriendo.
    - Configura las variables de entorno en `.env` (si aplica) con tus credenciales de base de datos.
    - El sistema intentará conectarse a la base de datos local por defecto.

3.  **Iniciar Aplicación:**
    Para levantar tanto el Backend como el Frontend en modo desarrollo:
    ```bash
    npm run dev
    ```
    - **Frontend:** http://localhost:5173
    - **Backend:** http://localhost:3000 (o el puerto configurado)

### Opción 2: Docker (Recomendado para Desarrollo Completo)

Para levantar todo el entorno de infraestructura (Base de datos, Colas, Caché):

```bash
docker-compose -f docker-compose.dev.yml up --build
```

Esto iniciará:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3005
- **RabbitMQ Admin:** http://localhost:15672 (guest/guest)
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379

---

## 📂 Estructura del Proyecto

- `/backend`: API REST/GraphQL, lógica de negocio y workers de sincronización.
- `/frontend`: Aplicación SPA React con TailwindCSS.
- `/database`: Scripts de inicialización SQL y migraciones.
- `/scripts`: Scripts de utilidad para mantenimiento y despliegue.

## 🛠️ Stack Tecnológico

- **Frontend:** React, Vite, TailwindCSS, Zustand (Estado), React Query.
- **Backend:** Node.js, Express, Socket.io.
- **Base de Datos:** PostgreSQL.
- **Mensajería:** RabbitMQ (para sincronización).
