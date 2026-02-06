# 🗺️ MEGAMAYOREO - Lista de Tareas de Implementación

> **Última actualización:** 2026-01-02 16:30  
> **Estado general:** Fases 1-4 casi completadas, Fase 5-7 en progreso

---

## ✅ Decisiones Confirmadas

- [x] Base de datos única centralizada (PostgreSQL)
- [x] Mercado Pago: API + Link de pago
- [x] Check-in por QR (no NFC) → Geolocalización en MVP
- [x] Sistema de puntos: 1000 puntos = $1 MXN
- [x] Ordenar por complejidad (fácil → difícil)

---

## ✅ Fase 1: Fundamentos (Completada)
**Estimado:** 2-3 días ✅

### Sucursales
- [x] Agregar sucursales reales al sistema
  - 01 - Globolandia
  - 02 - Megacentro
  - 03 - Todo de Papelería
  - CEDIS - Centro de Distribución
- [x] Asignar usuarios existentes a sucursales

### Roles Nuevos
- [x] Rol `bodeguero`
- [x] Rol `rutero`
- [x] Rol `gerente_cedis`

### Base de Datos
- [x] Tabla `zonas_precio` (precios por distancia)
- [x] Tabla `rutas` (definición de rutas)
- [x] Tabla `puntos_cliente` (monedero)
- [x] Tabla `historial_puntos`

---

## ✅ Fase 2: Sistema de Puntos (Completada)
**Estimado:** 3-4 días ✅

### Backend ✅
- [x] Lógica de acumulación de puntos (1000 pts = $1)
- [x] Lógica de canje de puntos
- [x] Servicios de venta actualizados para procesar puntos

### Frontend (POS) ✅
- [x] Mostrar puntos disponibles del cliente en POS
- [x] Opción para pagar usando puntos (Canje)
- [x] Mostrar puntos ganados en el ticket impreso

---

## ✅ Fase 3: Alertas de Stock y Traspasos (Completada)
**Estimado:** 3-4 días ✅

### Alertas ✅
- [x] Alerta automática de stock bajo por sucursal
- [x] Notificación al CEDIS cuando stock < mínimo
- [x] Dashboard de alertas en panel cajero

### Traspasos ✅
- [x] API de solicitud de traspaso entre sucursales
- [x] Aprobación de traspaso desde CEDIS
- [x] Confirmación de recepción
- [x] Registro en movimientos_inventario

---

## ✅ Fase 4: Ruteros (Completada ~95%)
**Estimado:** 1-2 semanas ✅

### POS Móvil Ruteros ✅
- [x] Panel dedicado `/rutero` (`RuteroDashboard.jsx`)
- [x] Interfaz optimizada para móvil
- [x] Catálogo con precios de ruta

### Inventario Móvil ✅
- [x] Tabla `inventario_ruta`
- [x] Carga semanal de mercancía (`rutero.service.js → cargarCamioneta`)
- [x] Recuperación de sábados (Proceso manual/operativo)
- [x] Stock en tiempo real (`getInventarioRuta`)

### Check-in QR ⚠️
- [x] Geolocalización implementada (MVP)
- [ ] Generación de QR por cliente (Opcional - Fase futura)
- [x] Escaneo desde app rutero con geolocalización
- [x] Registro de visita con coordenadas (`visitas.service.js`)

### Visitas y Notas ✅
- [x] Tabla `visitas_ruteros` 
- [x] Historial de notas por cliente
- [x] **Calificación de visita** (1-5 estrellas) - `RutaVisitas.jsx` con modal ⭐
- [x] **Estadísticas semanales** (visitas, ventas, promedio calificación)

### Integración Pagos ✅
- [ ] Mercado Pago API real (cobro con terminal) - *Requiere credenciales MP*
- [x] **Link de pago simulado** (estructura lista para MP API)
- [x] **Envío por WhatsApp** - Genera URL wa.me con mensaje formateado
- [x] **Registro de pago en sistema** - Tabla `pagos_mercadopago`

### Precios por Zona ✅
- [x] **Cálculo automático por distancia** - API `/admin/calcular-precio`
- [x] **Configuración de zonas en admin** - `ZonasPrecioConfig.jsx`
- [x] **Tabla zonas_precio** con incremento % y cargo fijo

---

## 🚧 Fase 5: CEDIS Completo (En Progreso ~40%)
**Estimado:** 2-3 semanas

### Panel Encargado CEDIS ✅
- [x] Dashboard básico (`CedisDashboard.jsx`)
- [x] Recepciones pendientes (`getOrdenesPendientes` en cedis.service)
- [x] Cotejo con órdenes de compra (básico)
- [x] **KPIs y métricas del dashboard** - Dashboard completo con alertas
- [ ] **Comunicación con COMPRAS** (chat/notas)

### OCR de Facturas ❌
- [ ] Captura de foto de factura
- [ ] Procesamiento con Tesseract/Google Vision
- [ ] Extracción de productos y cantidades
- [ ] Validación automática

### Recepción de Mercancía (CEDIS) ✅
- [x] Cotejo vs Orden de Compra (`RecepcionMercancia.jsx`)
- [x] Ingreso de stock parcial/total (`registrarRecepcion`)
- [x] **Registro de lote y caducidad** - Campos en recepciones_detalle

### Ubicaciones ⚠️
- [x] Mapa de almacén (Pasillo - Estante - Nivel) (`GestionUbicaciones.jsx`)
- [x] Vista de ubicaciones existentes
- [ ] **Asignación de productos a ubicaciones** (mejorar UX)
- [ ] **Optimización de ruta de picking** (Fase futura)
- [x] Búsqueda de producto → ubicación (`getUbicacionesProducto`)
- [ ] **Gestión de categorías por zona**

---

## 🚧 Fase 6: Telemarketing Avanzado (En Progreso ~50%)
**Estimado:** 1-2 semanas

### Gestión de Llamadas ✅
- [x] Registro de llamadas realizadas (`registrarLlamada` en telemarketing.service)
- [x] Historial de llamadas (`getHistorialLlamadas`)
- [x] **Cuota diaria configurable** - Meta diaria en estadísticas
- [x] **Estadísticas de efectividad** - Página completa con gráficas y ranking
- [ ] **Redistribución de carga entre puestos**

### CRM Avanzado ✅
- [x] Calendario de seguimiento por cliente (`crm_tareas`)
- [x] Recordatorios automáticos (Creación auto de tarea al programar llamada)
- [x] **Clasificación de clientes** (tipos/categorías, etiquetas, filtros avanzados) ✅ 2026-01-06
- [x] Historial de compras integrado (Tab en Dashboard)

### Coordinación ❌
- [ ] **Aprobación de pedidos de sucursales**
- [ ] **Asignación a ruteros**
- [ ] **Tracking de entrega**

### Mapa Georreferenciado ❌
- [ ] **Vista de clientes en mapa** (Leaflet/Google Maps)
- [ ] **Filtros por zona/tipo**
- [ ] **Planificación de rutas**

---

## ⏳ Fase 7: Dashboard SuperAdmin (~10%)
**Estimado:** 1 semana

- [ ] Mapa de cobertura con zonas de precio
- [ ] GPS de ruteros en tiempo real
- [ ] Panel de métricas telemarketing
- [ ] Alertas globales de stock
- [ ] Análisis de productos más vendidos
- [ ] Reportes consolidados

---

## 📊 Progreso General

| Fase | Estado | Progreso |
|------|--------|----------|
| Fase 1: Fundamentos | ✅ Completada | 100% |
| Fase 2: Sistema de Puntos | ✅ Completada | 100% |
| Fase 3: Alertas y Traspasos | ✅ Completada | 100% |
| Fase 4: Ruteros | ✅ Completada | 95% |
| Fase 5: CEDIS Completo | 🚧 En progreso | ~60% |
| Fase 6: Telemarketing Avanzado | 🚧 En progreso | ~80% |
| Fase 7: Dashboard SuperAdmin | ⏳ Pendiente | ~10% |

**Tiempo estimado restante:** 2-3 semanas
**Última actualización:** 2026-01-06

---

## 🎯 Próximas Tareas Prioritarias

### Opción A: Completar Fase 4 (Ruteros) - Recomendado
1. **Calificación de visitas** (agregar campo rating 1-5)
2. **Precios por zona** (configuración en admin)
3. **Integración Mercado Pago** (link de pago WhatsApp)

### Opción B: Avanzar Fase 6 (Telemarketing)
1. **Estadísticas de efectividad** (gráficas)
2. **Cuota diaria configurable**
3. **Clasificación de clientes** por tipo

### Opción C: Mejorar CEDIS (Fase 5)
1. **Lote y caducidad** en recepciones
2. **KPIs del dashboard**
3. **Asignación de productos a ubicaciones** mejorada

---

> 📌 **Leyenda:**
> - ✅ = Completado
> - ⚠️ = Parcialmente implementado
> - ❌ = Pendiente
> - 🚧 = En progreso

---

> Documento actualizado: 2026-01-02
