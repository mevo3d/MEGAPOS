Prompt para Desarrollo de POS Megamayoreo
Contexto del Proyecto: Necesito desarrollar/refactorizar un Punto de Venta (POS) completo para un supermercado/sistema de mayoreo. El sistema ya existe pero necesita ser mejorado. Es un sistema web con arquitectura cliente-servidor usando Node.js, Express, Socket.IO y PostgreSQL con frontend vanilla JavaScript. URL del Demo: http://nuevo.sistemamegamos.com/ (usuario: 1, contraseña: 1) Análisis de Funcionalidades Actuales Requeridas:
1. PANEL DE LOGIN (/index.html)
Función: Autenticación de usuarios
Campos: Usuario, Contraseña
Botones:
"Entrar al Sistema" (verifica credenciales)
"Ver tutorial" (abre modal con instrucciones)
Links a "Recuperar Contraseña" y "Solicitar Acceso"
Validación: Muestra errores específicos según credenciales incorrectas
2. PANEL PRINCIPAL (dashboard.html)
Función: Centro de control con acceso a todos los módulos
Secciones:
Panel Superior: Menú de navegación
Logo del sistema
"Panel" - Página principal
"Realizar Venta" - Módulo POS
"Mis Ventas" - Historial de transacciones
"Reportes" - Generación de informes
"Configuración" - Administración del sistema
Info usuario + "Cerrar sesión"
Panel Central: Tarjetas de información
Total de productos en inventario
Total de clientes registrados
Total de ventas del día
Total de usuarios del sistema
Panel Derecho: Actividad reciente
Log de últimas actividades del sistema
Panel Inferior: Módulos rápidos
"Caja Rápida" (acceso directo a venta)
"Buscar Producto" (búsqueda rápida)
"Historial de Ventas" (acceso a ventas)
"Reportes" (acceso a reportes)
3. MÓDULO DE VENTAS POS (/vender.html)
Panel de Búsqueda de Productos (Izquierdo):
Campo de búsqueda con filtros (nombre, código)
Opciones de búsqueda (descripción exacta/contiene)
Checkboxes: "Buscar solo por nombre", "Buscar solo por código"
Botón: "Buscar en base de datos"
Panel de Carrito de Compras (Central):
Listado de productos agregados
Columnas: Código, Descripción, Cantidad, Precio, Total
Botones de acción: "+" y "-" para ajustar cantidades
Campos modificables: Cantidad, Precio unitario
Panel de Información de Venta (Derecho):
Cliente: Selector desplegable, botón "Añadir cliente"
Método de Pago: Efectivo, Tarjeta, Transferencia, Mixto
Descuentos:
Descuento general (% y $)
Descuento por porcentaje de cliente
Subtotales y Totales:
Subtotal, Descuentos, Total final
Campos: Pago con, Cambio
Botones de Acción Principal:
"Cobrar venta": Procesa el pago final
"Cancelar": Vacía carrito
"Pausar Venta": Guarda carrito temporalmente
"Reanudar Venta": Recupera carrito pausado
4. PANEL DE CLIENTES (/clientes.html)
Función: Gestión de clientes
Secciones:
Lista de Clientes: Tabla con todos los clientes
Columnas: ID, Nombre, Teléfono, Crédito, Estado
Botones: "Estatus", "Editar", "Historial"
Panel de Búsqueda: Filtros por nombre, teléfono, estado
Botones Superiores:
"Añadir Cliente" (abre modal para nuevo cliente)
"Ver detalles" (muestra información del cliente seleccionado)
"Editar" (modifica datos del cliente)
"Historial de compras" (muestra ventas del cliente)
"Cambiar estatus" (activa/desactiva cliente)
5. PANEL DE PROVEEDORES (/proveedores.html)
Función: Gestión de proveedores de productos
Secciones:
Lista de Proveedores: Tabla con información completa
Columnas: ID, Nombre, Contacto, Productos, Estado
Botones de acción por cada proveedor
Panel de Búsqueda: Filtros múltiples
Botones de Acción:
"Añadir Proveedor": Modal para nuevo proveedor
"Editar": Modificar datos existentes
"Ver Productos": Muestra productos del proveedor
"Desactivar/Activar": Cambia estado del proveedor
6. PANEL DE INVENTARIO (/inventario.html)
Panel de Control Superior:
Buscador: Filtrado por nombre, código, categoría
Categorías: Selector dinámico de categorías
Botones: "Añadir producto", "Exportar", "Categorías"
Tabla de Productos:
Columnas: Código, Nombre, Descripción, Categoría, Stock, Precio, Estado
Botones de Acción:
"Editar": Modifica datos del producto
"Estatus": Activa/desactiva producto
"Historial": Muestra movimientos del producto
Modal de Producto:
Pestaña "Información":
Nombre, Código de Barras, Categoría
Descripción, Precio de compra, Precio de venta
Stock, Stock mínimo, Unidad de medida
IVA aplicable, Proveedor
Pestaña "Imagen": Carga de imagen del producto
Pestaña "Código de Barras": Generador de código
Botones: "Guardar", "Limpiar", "Generar código"
7. PANEL DE VENTAS (/mis-ventas.html)
Filtros Superiores:
Buscador: Por producto, cliente o método de pago
Fecha: Selector de rango de fechas
Botones: "Exportar", "Filtrar"
Tabla de Ventas:
Columnas: Folio, Fecha, Cliente, Productos, Total, Método, Estado
Botones de Acción:
"Ver detalles": Despliega información completa de la venta
"Imprimir ticket": Genera PDF del ticket
"Cancelar": Anula la venta (si está pendiente)
8. PANEL DE REPORTES (/reportes.html)
Panel de Filtros:
Tipo de reporte: Ventas, Inventario, Clientes, Proveedores
Fecha: Rango de fechas
Categoría: Filtrado por categoría
Secciones de Reportes:
Reporte de Ventas: Gráficos de tendencias, productos más vendidos
Reporte de Inventario: Productos con bajo stock, movimientos
Reporte de Clientes: Clientes activos, historial de compras
Exportación: PDF, Excel, CSV
9. PANEL DE CONFIGURACIÓN (/configuracion.html)
Pestañas de Configuración: Información General:
Datos de la tienda: Nombre, Dirección, Teléfono
Impuesto: Configuración de IVA
Usuarios:
Lista de usuarios: Tabla con roles y permisos
Botones: "Añadir usuario", "Editar permisos"
Campos: Nombre, Usuario, Contraseña, Rol (Vendedor, Admin, Caja)
Categorías:
Gestión de categorías: Crear, editar, eliminar categorías
Asignación de productos a categorías
Métodos de Pago:
Configuración de métodos de pago aceptados
Configuración de comisiones por método
Base de Datos:
Botones de mantenimiento:
"Crear copia de seguridad"
"Restaurar copia de seguridad"
"Optimizar base de datos"
"Vaciar registros antiguos"
10. SISTEMA DE NOTIFICACIONES
Notificaciones en tiempo real con Socket.IO
Tipos: Ventas completadas, stock bajo, nuevos usuarios
Panel de notificaciones en la esquina superior derecha
11. PANEL DE CRÉDITO (/gestion-credito.html)
Función: Administración de créditos a clientes
Secciones:
Clientes con Crédito: Lista de clientes con saldos pendientes
Historial de Créditos: Registro de movimientos de crédito
Gestión de Pagos: Abonos a créditos existentes
Reportes de Crédito: Estado de cuentas por cobrar
Interconexión entre Módulos:
Inventario ↔ Ventas: Actualización automática de stock
Clientes ↔ Ventas: Asignación de créditos y descuentos
Proveedores ↔ Inventario: Asociación de productos
Ventas ↔ Reportes: Datos para generación de informes
Configuración → Todos: Parámetros globales del sistema
Características Técnicas Requeridas:
Base de datos PostgreSQL persistente
Actualizaciones en tiempo real con Socket.IO
Exportación de reportes en múltiples formatos
Sistema de respaldo de base de datos
Validaciones de entrada en todos los formularios
Sistema de notificaciones en tiempo real
Integración con generación de códigos de barras
Soporte para imágenes de productos
Decisiones Técnicas a Evaluar:
¿Mantener la arquitectura actual o migrar a framework moderno?
¿Implementar sistema de caché para mejor rendimiento?
¿Agregar autenticación con JWT en lugar de sesiones simples?
¿Implementar testing automatizado?
¿Mejorar la UI/UX con framework frontend moderno?
¿Agregar API REST para integraciones externas?
¿Implementar sistema de auditoría de cambios?
El objetivo es tener un sistema robusto, escalable y fácil de mantener que pueda funcionar en múltiples dispositivos y navegadores.