# NOMINAS POS MEGA PROMPT

## 📋 RESUMEN EJECUTIVO

Este documento contiene la especificación completa del módulo de nómina de ContableSYS para ser migrado a un sistema POS. El módulo gestiona cálculos de nómina quincenal, empleados, percepciones, deducciones y dispersión bancaria.

**Estado actual**: Backend NestJS con lógica de cálculo completa pero sin API expuesta.
**Objetivo**: Migrar funcionalidad crítica a sistema POS con arquitectura simplificada.

---

## 🎯 ALCANCE DEL MÓDULO

### Funcionalidades Principales

1. **Gestión de Catálogos**
   - Niveles salariales (CONFIANZA/SINDICATO)
   - Puestos de trabajo
   - Conceptos de nómina (percepciones y deducciones)
   - Parámetros bancarios

2. **Gestión de Empleados**
   - CRUD completo de empleados
   - Asignación de nivel y puesto
   - Datos bancarios (CLABE, banco)
   - Datos fiscales (RFC, CURP)
   - Régimen contractual

3. **Cálculos de Nómina**
   - Cálculo de neto por empleado
   - Consolidado quincenal
   - Consolidado mensual
   - Acumulación de percepciones por concepto
   - Acumulación de deducciones por concepto

4. **Movimientos**
   - Percepciones automáticas (reglas)
   - Percepciones manuales
   - Deducciones manuales
   - Fuente de origen (REGLA/MANUAL)

5. **Procesos de Nómina**
   - Apertura de quincena
   - Cálculo de nómina
   - Cierre de quincena
   - Generación de pagos

6. **Dispersión Bancaria**
   - Generación de archivos bancarios (BANORTE, SPEI, INBURSA)
   - Layouts configurables (CSV/TXT)
   - Hash de validación

7. **Auditoría**
   - Bitácora de cambios
   - Tracking de modificaciones
   - Usuario responsable

---

## 📊 MODELO DE DATOS COMPLETO

### 1. Nivel

```typescript
{
  id: string (UUID)
  clave: string (unique, ej: "N01", "N02")
  tipo: TipoNivel (CONFIANZA | SINDICATO)
  descripcion: string?
  netoMensual: Decimal(12,2)
  netoQuincenal: Decimal(12,2)
  activo: boolean (default: true)
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Propósito**: Define niveles salariales precalculados.

---

### 2. Puesto

```typescript
{
  id: string (UUID)
  nombre: string (unique, ej: "Gerente", "Vendedor")
  descripcion: string?
  nivelId: string (FK -> Nivel.id)
  activo: boolean (default: true)
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Propósito**: Catalogo de puestos con nivel salarial asociado.

---

### 3. Empleado

```typescript
{
  id: string (UUID)
  clave: string (unique, ej: "EMP001")
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string?
  rfc: string (unique, length 13)
  curp: string (unique, length 18)
  regimen: Regimen (ASIMILADOS | SUJETOS)
  nivelId: string (FK -> Nivel.id)
  puestoId: string (FK -> Puesto.id)
  banco: Banco? (BANORTE | SPEI | INBURSA | BBVA | SANTANDER)
  clabe: string? (length 18, validated)
  email: string?
  telefono: string?
  fechaAlta: DateTime (default: now)
  fechaBaja: DateTime?
  activo: boolean (default: true)
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Propósito**: Maestra de empleados con datos fiscales y bancarios.

**Validaciones**:
- RFC: 4 letras mayúsculas + 6 dígitos + 3 caracteres (homoclave)
- CURP: 18 caracteres alfanuméricos
- CLABE: 18 dígitos con dígito verificador

---

### 4. Quincena

```typescript
{
  id: string (UUID)
  quincena: Int (1-24)
  anno: Int
  periodoInicio: DateTime
  periodoFin: DateTime
  tipo: TipoQuincena (TIM | ESP)
  estado: EstadoQuincena (BORRADOR | CALCULADA | CERRADA)
  diasPago: Int (default: 15)
  observaciones: string?
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Propósito**: Periodo de nómina con estado de workflow.

**Workflow**:
```
BORRADOR -> CALCULADA -> CERRADA
   ↑           ↓
   └───────┘
 (puede recalcular)
```

**Reglas de negocio**:
- Solo 1 quincena activa por tipo (TIM/ESP) al mismo tiempo
- No se puede modificar quincena CERRADA
- Recálculo solo permitido en estado CALCULADA

---

### 5. Concepto

```typescript
{
  id: string (UUID)
  clave: string (unique, ej: "001", "002")
  nombre: string
  tipo: TipoConcepto (PERCEPCION | DEDUCCION)
  formula: string? (ej: "sueldoBase * 0.10")
  esEditable: boolean (default: false)
  esImponible: boolean (default: true) // afecta cálculo de impuestos
  activo: boolean (default: true)
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Propósito**: Catálogo de conceptos de nómina con fórmulas opcionales.

**Conceptos típicos**:
- Percepciones: Sueldo base, horas extra, comisiones, bonos
- Deducciones: ISR, IMSS, préstamos, ausentismo

---

### 6. MovimientoNomina

```typescript
{
  id: string (UUID)
  quincenaId: string (FK -> Quincena.id)
  empleadoId: string (FK -> Empleado.id)
  conceptoId: string (FK -> Concepto.id)
  tipo: TipoConcepto (PERCEPCION | DEDUCCION)
  importe: Decimal(12,2)
  fuente: FuenteMovimiento (REGLA | MANUAL)
  referencia: string? // descripción del movimiento
  createdAt: DateTime
  updatedAt: DateTime

  // Relaciones
  quincena: Quincena @relation(fields: [quincenaId], references: [id])
  empleado: Empleado @relation(fields: [empleadoId], references: [id])
  concepto: Concepto @relation(fields: [conceptoId], references: [id])
}
```

**Propósito**: Movimientos contables de percepciones/deducciones por empleado.

**Reglas**:
- Fuente REGLA: Generado automáticamente por fórmula
- Fuente MANUAL: Creado/editado por usuario (si esEditable=true)
- Un empleado puede tener múltiples movimientos del mismo concepto en una quincena

---

### 7. Pago

```typescript
{
  id: string (UUID)
  quincenaId: string (FK -> Quincena.id)
  empleadoId: string (FK -> Empleado.id)
  formaPago: FormaPago (TRANSFERENCIA | EFECTIVO | CHEQUE)
  banco: Banco?
  cuenta: string? // últimos 4 dígitos
  netoPagar: Decimal(12,2)
  referencia: string? // número de operación
  estatus: EstatusPago (PENDIENTE | PAGADO | ERROR)
  pagadoEn: DateTime?
  createdAt: DateTime
  updatedAt: DateTime

  // Relaciones
  quincena: Quincena @relation(fields: [quincenaId], references: [id])
  empleado: Empleado @relation(fields: [empleadoId], references: [id])
}
```

**Propósito**: Registro de pagos generados por nómina.

**Reglas**:
- Se crea automáticamente al cerrar quincena
- netoPagar = Σ percepciones - Σ deducciones
- No se puede modificar pago de quincena CERRADA

---

### 8. ArchivoDispersion

```typescript
{
  id: string (UUID)
  quincenaId: string (FK -> Quincena.id)
  tipo: TipoArchivo (BANORTE | SPEI | INBURSA)
  banco: Banco
  tipoArchivo: TipoArchivo (CSV | TXT)
  version: string (ej: "v1.0", "v2.1")
  archivoPath: string // ruta del archivo generado
  hash: string // SHA256 para validación
  registroCount: Int // número de pagos en el archivo
  totalMonto: Decimal(12,2) // suma de pagos
  generadoEn: DateTime
  createdAt: DateTime
  updatedAt: DateTime

  // Relaciones
  quincena: Quincena @relation(fields: [quincenaId], references: [id])
}
```

**Propósito**: Metadatos de archivos de dispersión bancaria generados.

---

### 9. Auditoria

```typescript
{
  id: string (UUID)
  entidad: string // nombre del modelo (ej: "Empleado", "MovimientoNomina")
  entidadId: string // ID del registro afectado
  accion: AccionAuditoria (CREAR | ACTUALIZAR | ELIMINAR)
  datosAntes: Json? // estado antes del cambio
  datosDespues: Json? // estado después del cambio
  usuario: string // usuario que hizo el cambio
  ipAddress: string?
  userAgent: string?
  createdAt: DateTime
}
```

**Propósito**: Bitácora de cambios para compliance y troubleshooting.

**Casos de uso**:
- Quién modificó el sueldo de un empleado
- Qué movimientos se agregaron manualmente
- Reversión de cambios erróneos

---

### 10. ParametroBanco

```typescript
{
  id: string (UUID)
  banco: Banco (BANORTE | SPEI | INBURSA | BBVA | SANTANDER)
  tipoArchivo: TipoArchivo (CSV | TXT)
  version: string (ej: "v1.0")
  plantillaCsv: string? // headers y formato
  plantillaTxt: string? // estructura de línea fija
  separador: string (default: ",")
  incluirEncabezado: boolean (default: true)
  activo: boolean (default: true)
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Propósito**: Configuración de layouts bancarios para generar archivos de dispersión.

---

## 🔤 ENUMS COMPLETOS

### TipoNivel
```typescript
enum TipoNivel {
  CONFIANZA  // Empleados de confianza
  SINDICATO  // Empleados sindicalizados
}
```

### Regimen
```typescript
enum Regimen {
  ASIMILADOS  // Asimilados a salarios
  SUJETOS     // Sujetos a régimen contractual
}
```

### Banco
```typescript
enum Banco {
  BANORTE
  SPEI
  INBURSA
  BBVA
  SANTANDER
}
```

### TipoQuincena
```typescript
enum TipoQuincena {
  TIM  // Tiempo completo (1-15)
  ESP  // Especial (días variables)
}
```

### EstadoQuincena
```typescript
enum EstadoQuincena {
  BORRADOR   // En creación
  CALCULADA  // Con cálculos
  CERRADA    // No modificable
}
```

### TipoConcepto
```typescript
enum TipoConcepto {
  PERCEPCION
  DEDUCCION
}
```

### FuenteMovimiento
```typescript
enum FuenteMovimiento {
  REGLA   // Generado por sistema
  MANUAL  // Creado por usuario
}
```

### FormaPago
```typescript
enum FormaPago {
  TRANSFERENCIA
  EFECTIVO
  CHEQUE
}
```

### EstatusPago
```typescript
enum EstatusPago {
  PENDIENTE
  PAGADO
  ERROR
}
```

### TipoArchivo
```typescript
enum TipoArchivo {
  CSV
  TXT
}
```

### AccionAuditoria
```typescript
enum AccionAuditoria {
  CREAR
  ACTUALIZAR
  ELIMINAR
}
```

---

## 💻 LÓGICA DE NEGOCIO PRINCIPAL

### Servicio: CalculoNominaService

#### 1. Calcular Neto de Empleado

```typescript
/**
 * Calcula el neto a pagar de un empleado en una quincena
 *
 * @param quincenaId - ID de la quincena
 * @param empleadoId - ID del empleado
 * @returns Objeto con neto, percepciones, deducciones y desglose por concepto
 */
async calcularNetoEmpleado(
  quincenaId: string,
  empleadoId: string
): Promise<{
  empleadoId: string
  quincenaId: string
  netoPagar: number
  totalPercepciones: number
  totalDeducciones: number
  percepciones: ConceptoDesglose[]
  deducciones: ConceptoDesglose[]
}>
```

**Algoritmo**:

1. **Obtener datos base**
   - Buscar quincena por ID
   - Buscar empleado por ID
   - Validar que quincena esté en estado BORRADOR o CALCULADA

2. **Obtener movimientos de la quincena**
   - Filtrar por empleadoId
   - Agrupar por conceptoId
   - Sumarizar por tipo (PERCEPCION vs DEDUCCION)

3. **Calcular totales**
   - totalPercepciones = Σ movimientos WHERE tipo = PERCEPCION
   - totalDeducciones = Σ movimientos WHERE tipo = DEDUCCION
   - netoPagar = totalPercepciones - totalDeducciones

4. **Redondeo**
   - Usar función de redondeo bancario (2 decimales)
   - Ejemplo: `Math.round(neto * 100) / 100`

5. **Retornar DTO**
   ```typescript
   {
     empleadoId: "uuid",
     quincenaId: "uuid",
     netoPagar: 12500.50,
     totalPercepciones: 15000.00,
     totalDeducciones: 2499.50,
     percepciones: [
       { concepto: "Sueldo base", importe: 12000.00 },
       { concepto: "Horas extra", importe: 3000.00 }
     ],
     deducciones: [
       { concepto: "ISR", importe: 1800.00 },
       { concepto: "IMSS", importe: 699.50 }
     ]
   }
   ```

**Casos borde**:
- Empleado sin movimientos: retorna 0 en todos los campos
- Quincena CERRADA: permite lectura pero no modificación
- Deducciones > Percepciones: netoPagar puede ser negativo (indicar deuda)

---

#### 2. Consolidado Quincenal

```typescript
/**
 * Genera consolidado de toda la quincena
 *
 * @param quincenaId - ID de la quincena
 * @param tipo - Tipo de consolidado (QUINCENAL | MENSUAL)
 * @returns Resumen con totales y desglose por empleado
 */
async consolidadoQuincena(
  quincenaId: string,
  tipo: 'QUINCENAL' | 'MENSUAL' = 'QUINCENAL'
): Promise<{
  quincenaId: string
  tipo: string
  totalEmpleados: number
  totalPercepciones: number
  totalDeducciones: number
  totalNetoPagar: number
  empleados: EmpleadoResumen[]
}>
```

**Algoritmo**:

1. **Obener quincena**
   - Buscar quincena por ID
   - Validar existencia

2. **Obtener empleados activos**
   - WHERE activo = true
   - AND fechaBaja IS NULL (o > periodoFin)

3. **Calcular por cada empleado**
   - Llamar a `calcularNetoEmpleado(empleadoId, quincenaId)`
   - Acumular totales generales

4. **Si es MENSUAL**
   - Buscar quincena par (ej: quincena 2 y 4)
   - Sumarizar ambas quincenas
   - Incluir empleados con movimiento en cualquiera de las dos

5. **Retornar DTO**
   ```typescript
   {
     quincenaId: "uuid",
     tipo: "QUINCENAL",
     totalEmpleados: 5,
     totalPercepciones: 75000.00,
     totalDeducciones: 12500.00,
     totalNetoPagar: 62500.00,
     empleados: [
       {
         empleadoId: "uuid",
         nombre: "Juan Pérez",
         netoPagar: 12500.50,
         totalPercepciones: 15000.00,
         totalDeducciones: 2499.50
       },
       // ... más empleados
     ]
   }
   ```

---

### 3. Generar Movimientos Automáticos (REGLA)

```typescript
/**
 * Genera percepciones por regla de negocio
 *
 * @param quincenaId - ID de la quincena
 * @param regla - Tipo de regla a aplicar
 */
async generarMovimientosRegla(
  quincenaId: string,
  regla: 'SUELDO_BASE' | 'HORAS_EXTRA' | 'BONOS'
): Promise<void>
```

**Regla SUELDO_BASE**:
1. Para cada empleado con nivel asignado:
   - Buscar concepto de "Sueldo base"
   - Si no existe movimiento de ese concepto en la quincena:
     - Crear MovimientoNomina:
       ```typescript
       {
         quincenaId,
         empleadoId,
         conceptoId: "sueldo-base-id",
         tipo: PERCEPCION,
         importe: empleado.nivel.netoQuincenal,
         fuente: REGLA,
         referencia: "Sueldo base quincenal"
       }
       ```

**Regla HORAS_EXTRA** (ejemplo con parámetros):
- Requiere parámetros: horasTrabajadas, tarifaHora
- Se puede extender para cálculo complejo

---

### 4. Cerrar Quincena

```typescript
/**
 * Cierra la quincena e inmoviliza movimientos
 * Genera registros de pago
 *
 * @param quincenaId - ID de la quincena
 */
async cerrarQuincena(quincenaId: string): Promise<{
  quincenaId: string
  pagosGenerados: number
  totalMonto: number
}>
```

**Algoritmo**:

1. **Validaciones**
   - Quincena debe estar en estado CALCULADA
   - Todos los empleados deben tener cálculo
   - Validar que no haya duplicados

2. **Cambiar estado**
   - UPDATE Quincena SET estado = 'CERRADA'

3. **Generar pagos**
   - Para cada empleado:
     - Calcular neto
     - Crear registro Pago:
       ```typescript
       {
         quincenaId,
         empleadoId,
         formaPago: empleado.banco ? TRANSFERENCIA : EFECTIVO,
         banco: empleado.banco,
         cuenta: empleado.clabe?.slice(-4),
         netoPagar: calculo.netoPagar,
         estatus: PENDIENTE
       }
       ```

4. **Registrar auditoría**
   - Crear registro Auditoria con acción CERRAR_QUINCENA

5. **Retornar resumen**
   - Cantidad de pagos generados
   - Suma total de neto a pagar

**Validaciones críticas**:
- No se puede cerrar quincena sin movimientos
- No se puede recalcular quincena CERRADA
- Requiere confirmación del usuario

---

### 5. Generar Archivo de Dispersión

```typescript
/**
 * Genera archivo bancario para dispersión de pagos
 *
 * @param quincenaId - ID de la quincena
 * @param banco - Banco destino
 * @param tipoArchivo - Formato (CSV | TXT)
 * @returns Ruta del archivo generado y hash
 */
async generarArchivoDispersion(
  quincenaId: string,
  banco: Banco,
  tipoArchivo: TipoArchivo
): Promise<{
  archivoPath: string
  hash: string
  registroCount: number
  totalMonto: number
}>
```

**Algoritmo**:

1. **Obtener configuración**
   - Buscar ParametroBanco WHERE banco = {banco}
   - Validar que esté activo

2. **Obtener pagos**
   - Buscar Pago WHERE quincenaId = {quincenaId}
   - FILTER WHERE estatus = PENDIENTE
   - FILTER WHERE banco = {banco} OR banco IS NULL (todos)

3. **Generar archivo según formato**

   **Formato CSV (ejemplo BANORTE)**:
   ```csv
   Cuenta,Beneficiario,CLABE,Monto,Referencia
   12345678,JUAN PEREZ LOPEZ,123456789012345678,12500.50,PAGO001
   87654321,MARIA GONZALEZ,987654321098765432,15000.00,PAGO002
   ```

   **Formato TXT (ejemplo SPEI)**:
   ```
   CLABE|NOMBRE|MONTO|REFERENCIA|FECHA
   123456789012345678|JUAN PEREZ LOPEZ|12500.50|PAGO001|2024-01-15
   987654321098765432|MARIA GONZALEZ|15000.00|PAGO002|2024-01-15
   ```

4. **Guardar archivo**
   - Ruta: `{OUTPUT_DIR}/dispersion/{quincenaId}_{banco}_{timestamp}.csv`
   - Generar hash SHA256 del contenido

5. **Crear registro ArchivoDispersion**
   ```typescript
   {
     quincenaId,
     tipo: banco,
     banco,
     tipoArchivo,
     version: "v1.0",
     archivoPath: rutaGenerada,
     hash: hashSHA256,
     registroCount: pagos.length,
     totalMonto: sumaMontos
   }
   ```

6. **Retornar metadatos**

---

## 🧪 TESTS UNITARIOS (Referencia)

### Casos de prueba del CalculoNominaService

```typescript
describe('CalculoNominaService', () => {
  let service: CalculoNominaService;
  let prisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    // Setup de mocks de Prisma
    prisma = mockDeep<PrismaClient>();
    service = new CalculoNominaService(prisma);
  });

  describe('calcularNetoEmpleado', () => {
    it('debe calcular el neto correctamente con percepciones y deducciones', async () => {
      // Arrange: Mock de datos
      prisma.movimientoNomina.findMany.mockResolvedValue([
        {
          id: '1',
          tipo: 'PERCEPCION',
          conceptoId: 'c1',
          concepto: { nombre: 'Sueldo base' },
          importe: 10000.00
        },
        {
          id: '2',
          tipo: 'PERCEPCION',
          conceptoId: 'c2',
          concepto: { nombre: 'Horas extra' },
          importe: 2000.00
        },
        {
          id: '3',
          tipo: 'DEDUCCION',
          conceptoId: 'c3',
          concepto: { nombre: 'ISR' },
          importe: 1800.00
        }
      ]);

      // Act
      const result = await service.calcularNetoEmpleado('q1', 'e1');

      // Assert
      expect(result.netoPagar).toBe(10200.00); // 12000 - 1800
      expect(result.totalPercepciones).toBe(12000.00);
      expect(result.totalDeducciones).toBe(1800.00);
      expect(result.percepciones).toHaveLength(2);
      expect(result.deducciones).toHaveLength(1);
    });

    it('debe retornar ceros cuando no hay movimientos', async () => {
      prisma.movimientoNomina.findMany.mockResolvedValue([]);

      const result = await service.calcularNetoEmpleado('q1', 'e1');

      expect(result.netoPagar).toBe(0);
      expect(result.totalPercepciones).toBe(0);
      expect(result.totalDeducciones).toBe(0);
      expect(result.percepciones).toEqual([]);
      expect(result.deducciones).toEqual([]);
    });

    it('debe agrupar movimientos del mismo concepto', async () => {
      prisma.movimientoNomina.findMany.mockResolvedValue([
        {
          id: '1',
          tipo: 'PERCEPCION',
          conceptoId: 'c1',
          concepto: { nombre: 'Horas extra' },
          importe: 500.00
        },
        {
          id: '2',
          tipo: 'PERCEPCION',
          conceptoId: 'c1',
          concepto: { nombre: 'Horas extra' },
          importe: 300.00
        }
      ]);

      const result = await service.calcularNetoEmpleado('q1', 'e1');

      expect(result.percepciones).toHaveLength(1);
      expect(result.percepciones[0].importe).toBe(800.00);
    });

    it('debe redondear a 2 decimales correctamente', async () => {
      prisma.movimientoNomina.findMany.mockResolvedValue([
        {
          id: '1',
          tipo: 'PERCEPCION',
          conceptoId: 'c1',
          concepto: { nombre: 'Sueldo' },
          importe: 10000.333
        }
      ]);

      const result = await service.calcularNetoEmpleado('q1', 'e1');

      expect(result.totalPercepciones).toBe(10000.33); // Redondeo bancario
    });
  });

  describe('consolidadoQuincenal', () => {
    it('debe generar consolidado quincenal', async () => {
      const mockEmpleados = [
        { id: 'e1', nombre: 'Juan', apellidoPaterno: 'Perez' },
        { id: 'e2', nombre: 'Maria', apellidoPaterno: 'Gonzalez' }
      ];

      prisma.quincena.findUnique.mockResolvedValue({
        id: 'q1',
        tipo: 'TIM',
        estado: 'CALCULADA'
      });
      prisma.empleado.findMany.mockResolvedValue(mockEmpleados);
      prisma.movimientoNomina.findMany.mockResolvedValue([
        {
          empleadoId: 'e1',
          tipo: 'PERCEPCION',
          importe: 10000.00
        },
        {
          empleadoId: 'e2',
          tipo: 'PERCEPCION',
          importe: 12000.00
        }
      ]);

      const result = await service.consolidadoQuincena('q1', 'QUINCENAL');

      expect(result.totalEmpleados).toBe(2);
      expect(result.totalPercepciones).toBe(22000.00);
      expect(result.empleados).toHaveLength(2);
    });
  });
});
```

---

## 🗃️ SEED DATA (Datos de prueba)

```sql
-- Niveles
INSERT INTO Nivel (clave, tipo, netoMensual, netoQuincenal) VALUES
('N01', 'CONFIANZA', 24000.00, 12000.00),
('N02', 'SINDICATO', 18000.00, 9000.00);

-- Puestos
INSERT INTO Puesto (nombre, nivelId) VALUES
('Gerente', (SELECT id FROM Nivel WHERE clave = 'N01')),
('Vendedor', (SELECT id FROM Nivel WHERE clave = 'N02')),
('Ayudante', (SELECT id FROM Nivel WHERE clave = 'N02'));

-- Empleados
INSERT INTO Empleado (clave, nombre, apellidoPaterno, rfc, curp, regimen, nivelId, puestoId, banco, clabe) VALUES
('EMP001', 'Juan', 'Perez', 'PERJ800101H01', 'PERJ800101HDFRRN01', 'ASIMILADOS',
 (SELECT id FROM Nivel WHERE clave = 'N01'), (SELECT id FROM Puesto WHERE nombre = 'Gerente'),
 'BANORTE', '012345678901234567'),
('EMP002', 'Maria', 'Gonzalez', 'GOMA750101M01', 'GOMA750101MDFRRN02', 'ASIMILADOS',
 (SELECT id FROM Nivel WHERE clave = 'N02'), (SELECT id FROM Puesto WHERE nombre = 'Vendedor'),
 'SPEI', '987654321098765432'),
('EMP003', 'Pedro', 'Lopez', 'LOPM900101K01', 'LOPM900101KDFRRN03', 'SUJETOS',
 (SELECT id FROM Nivel WHERE clave = 'N02'), (SELECT id FROM Puesto WHERE nombre = 'Ayudante'),
 NULL, NULL);

-- Conceptos
INSERT INTO Concepto (clave, nombre, tipo, esEditable, esImponible) VALUES
('001', 'Sueldo base', 'PERCEPCION', false, true),
('002', 'Horas extra', 'PERCEPCION', true, true),
('003', 'Bono ventas', 'PERCEPCION', true, true),
('004', 'ISR', 'DEDUCCION', false, false),
('005', 'IMSS', 'DEDUCCION', false, false);

-- Quincenas
INSERT INTO Quincena (quincena, anno, periodoInicio, periodoFin, tipo, estado, diasPago) VALUES
(1, 2024, '2024-01-01', '2024-01-15', 'TIM', 'BORRADOR', 15),
(2, 2024, '2024-01-16', '2024-01-31', 'TIM', 'BORRADOR', 15);
```

---

## 🎨 DTOs Y TYPES

### CalcularNetoDto

```typescript
export class CalcularNetoDto {
  empleadoId: string;
  quincenaId: string;
}

export class ConceptoDesglose {
  concepto: string;
  clave: string;
  importe: number;
}

export class CalculoNetoResponse {
  empleadoId: string;
  empleadoNombre: string;
  quincenaId: string;
  quincenaDescripcion: string;
  netoPagar: number;
  totalPercepciones: number;
  totalDeducciones: number;
  percepciones: ConceptoDesglose[];
  deducciones: ConceptoDesglose[];
}
```

### ConsolidadoQuincenalDto

```typescript
export class ConsolidadoDto {
  quincenaId: string;
  tipo: 'QUINCENAL' | 'MENSUAL';
}

export class EmpleadoResumen {
  empleadoId: string;
  nombre: string;
  clave: string;
  netoPagar: number;
  totalPercepciones: number;
  totalDeducciones: number;
}

export class ConsolidadoResponse {
  quincenaId: string;
  quincenaDescripcion: string;
  tipo: string;
  totalEmpleados: number;
  totalPercepciones: number;
  totalDeducciones: number;
  totalNetoPagar: number;
  empleados: EmpleadoResumen[];
}
```

---

## 🔧 FUNCIONES UTILITARIAS

### Redondeo Bancario

```typescript
/**
 * Redondea a 2 decimales usando método bancario
 * (Round half away from zero)
 */
export function roundBancario(valor: number): number {
  if (valor === 0) return 0;
  const signo = Math.sign(valor);
  const abs = Math.abs(valor);
  return signo * (Math.round((abs + Number.EPSILON) * 100) / 100);
}

// Tests:
// roundBancario(10.555) -> 10.56
// roundBancario(10.554) -> 10.55
// roundBancario(-10.555) -> -10.56
```

### Validación CLABE

```typescript
/**
 * Valita CLABE bancaria mexicana (18 dígitos con dígito verificador)
 */
export function validarCLABE(clabe: string): boolean {
  if (!/^\d{18}$/.test(clabe)) return false;

  // Cálculo de dígito verificador
  const pesos = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
  let suma = 0;
  for (let i = 0; i < 17; i++) {
    suma += parseInt(clabe[i]) * pesos[i];
  }
  const dv = (10 - (suma % 10)) % 10;
  return dv === parseInt(clabe[17]);
}

// Test:
// validarCLABE('012345678901234567') -> true/false
```

### Validación RFC

```typescript
/**
 * Valida RFC mexicano (persona física o moral)
 * Formato: 4 letras + 6 dígitos + 3 caracteres (homoclave)
 */
export function validarRFC(rfc: string): boolean {
  // Persona física: 4 letras + 6 dígitos + 3 alfanuméricos (13 caracteres)
  const regexFisica = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
  // Persona moral: 3 letras + 6 dígitos + 3 alfanuméricos (12 caracteres)
  const regexMoral = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;

  return regexFisica.test(rfc) || regexMoral.test(rfc);
}

// Tests:
// validarRFC('PERJ800101H01') -> true (física)
// validarRFC('GOMA750101M01') -> true (física)
// validarRFC('ABC800101H01') -> false (falta un carácter)
```

---

## 📋 ENDPOINTS HTTP RECOMENDADOS

### Catálogos

```
GET    /api/catalogos/niveles          - Listar niveles
POST   /api/catalogos/niveles          - Crear nivel
GET    /api/catalogos/niveles/:id      - Obtener nivel
PUT    /api/catalogos/niveles/:id      - Actualizar nivel
DELETE /api/catalogos/niveles/:id      - Eliminar nivel

GET    /api/catalogos/puestos          - Listar puestos
POST   /api/catalogos/puestos          - Crear puesto
GET    /api/catalogos/puestos/:id      - Obtener puesto
PUT    /api/catalogos/puestos/:id      - Actualizar puesto
DELETE /api/catalogos/puestos/:id      - Eliminar puesto

GET    /api/catalogos/conceptos        - Listar conceptos
POST   /api/catalogos/conceptos        - Crear concepto
GET    /api/catalogos/conceptos/:id    - Obtener concepto
PUT    /api/catalogos/conceptos/:id    - Actualizar concepto
DELETE /api/catalogos/conceptos/:id    - Eliminar concepto
```

### Empleados

```
GET    /api/empleados                  - Listar empleados (paginado)
POST   /api/empleados                  - Crear empleado
GET    /api/empleados/:id              - Obtener empleado
PUT    /api/empleados/:id              - Actualizar empleado
DELETE /api/empleados/:id              - Eliminar empleado (soft delete)
GET    /api/empleados/:id/nomina       - Obtener historial de nómina
```

### Quincenas

```
GET    /api/quincenas                  - Listar quincenas
POST   /api/quincenas                  - Crear quincena
GET    /api/quincenas/:id              - Obtener quincena
PUT    /api/quincenas/:id              - Actualizar quincena
DELETE /api/quincenas/:id              - Eliminar quincena
POST   /api/quincenas/:id/cerrar       - Cerrar quincena
POST   /api/quincenas/:id/recalcular   - Recalcular nómina
```

### Cálculos de Nómina

```
POST   /api/nomina/calcular            - Calcular nómina (body: quincenaId)
GET    /api/nomina/:quincenaId/empleados/:empleadoId  - Calcular neto empleado
GET    /api/nomina/:quincenaId/consolidado            - Consolidado quincena
GET    /api/nomina/:quincenaId/consolidado/mensual   - Consolidado mensual
```

### Movimientos

```
GET    /api/movimientos                - Listar movimientos (filtros: quincenaId, empleadoId)
POST   /api/movimientos                - Crear movimiento manual
GET    /api/movimientos/:id            - Obtener movimiento
PUT    /api/movimientos/:id            - Actualizar movimiento (si es editable)
DELETE /api/movimientos/:id            - Eliminar movimiento
POST   /api/movimientos/generar        - Generar movimientos por regla
```

### Pagos

```
GET    /api/pagos                      - Listar pagos (filtros: quincenaId, estatus)
GET    /api/pagos/:id                  - Obtener pago
PUT    /api/pagos/:id                  - Actualizar estatus de pago
GET    /api/pagos/quincena/:id         - Listar pagos de quincena
```

### Dispersión

```
POST   /api/dispersion/generar         - Generar archivo dispersión
GET    /api/dispersion/:id             - Obtener metadatos de archivo
GET    /api/dispersion/quincena/:id    - Listar archivos de quincena
GET    /api/dispersion/:id/descargar   - Descargar archivo
```

### Auditoría

```
GET    /api/auditoria                  - Listar auditoría (filtros: entidad, entidadId, fechas)
GET    /api/auditoria/:id              - Obtener detalle de auditoría
```

---

## 🚀 REQUERIMIENTOS DE IMPLEMENTACIÓN

### Stack Tecnológico Recomendado

**Backend**:
- Node.js 20+ / Bun 1+
- NestJS o Fastify
- Prisma ORM
- PostgreSQL 14+
- Zod para validación

**Frontend**:
- Next.js 14+ (App Router) / Vite + React
- shadcn/ui o Chakra UI
- React Query (TanStack Query)
- Zod para validación de forms

**DevOps**:
- Docker + Docker Compose
- GitHub Actions (CI/CD)

---

### Configuración de Base de Datos

**PostgreSQL requirements**:
```sql
-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Para búsqueda de texto

-- Configuración de decimales
ALTER DATABASE nomina_pos SET extra_float_digits = 0;
```

**Índices recomendados**:
```sql
CREATE INDEX idx_empleado_clave ON empleado(clave);
CREATE INDEX idx_empleado_rfc ON empleado(rfc);
CREATE INDEX idx_empleado_curp ON empleado(curp);
CREATE INDEX idx_empleado_activo ON empleado(activo) WHERE activo = true;
CREATE INDEX idx_movimiento_quincena ON movimiento_nomina(quincenaId);
CREATE INDEX idx_movimiento_empleado ON movimiento_nomina(empleadoId);
CREATE INDEX idx_pago_quincena ON pago(quincenaId);
CREATE INDEX idx_auditoria_entidad ON auditoria(entidad, entidadId);
CREATE INDEX idx_auditoria_fecha ON auditoria(createdAt);
```

---

### Variables de Entorno

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/nomina_pos?schema=public"

# API
PORT=3000
NODE_ENV=development
API_PREFIX="api"

# JWT
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="8h"

# Storage
OUTPUT_DIR="./storage/output"

# Logging
LOG_LEVEL="debug"  // debug | info | warn | error
LOG_PRETTY=true

# Pagination
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
```

---

## ⚠️ REGLAS DE NEGOCIO CRÍTICAS

1. **Solo 1 quincena abierta por tipo (TIM/ESP)**: Evitar superposición de periodos

2. **No se puede modificar quincena CERRADA**: Inmovilizar datos históricos

3. **Movimientos MANUAL solo si concepto.esEditable = true**: Proteger cálculos automáticos

4. **Todo movimiento debe crear registro de Auditoría**: Trazabilidad completa

5. **CLABE debe validarse antes de guardar**: Evitar errores en dispersión

6. **Neto no puede ser negativo al cerrar quincena**: Validar antes de cerrar

7. **Empleado debe tener nivel y puesto asignados**: Para cálculo de sueldo base

8. **Regenerar archivo de dispersión sobrescribe anterior**: Solo 1 archivo por banco/quincena

9. **Eliminación de empleado es soft delete**: Marcar activo=false, no borrar registro

10. **Recálculo de nómina borra movimientos REGLA**: Preservar movimientos MANUAL

---

## 📊 REPORTES RECOMENDADOS

1. **Recibo de nómina individual** (PDF)
   - Datos del empleado
   - Periodo de nómina
   - Desglose de percepciones
   - Desglose de deducciones
   - Neto a pagar
   - Forma de pago

2. **Carátula de quincena** (PDF)
   - Totales de la quincena
   - Número de empleados
   - Resumen por banco
   - Firma de autorización

3. **Reporte de impuestos** (CSV/PDF)
   - ISR por empleado
   - Base gravable
   - Subsidio causal

4. **Reporte de dispersión** (CSV)
   - Lista de pagos por banco
   - Totales por banco
   - Errores en CLABE

---

## 🎓 LEARNINGS DEL PROYECTO ORIGINAL

**Qué funcionó bien**:
✅ Arquitectura modular con separación clara de responsabilidades
✅ Tests unitarios completos con mocking de Prisma
✅ Enums bien definidos para evitar strings mágicos
✅ DTOs TypeScript para type safety
✅ Logging estructurado con Pino

**Qué mejorar**:
❌ Falta implementación de autenticación (JWT)
❌ No hay validación de DTOs con class-validator
❌ Faltan tests de integración (e2e)
❌ No hay documentación de arquitectura
❌ Falta manejo de concurrencia (lock al cerrar quincena)

**Deudas técnicas**:
- Implementar cache (Redis) para cálculos frecuentes
- Agregar cola de jobs para cálculos asíncronos
- Implementar webhooks para notificar cálculos completados
- Agregar métricas (Prometheus) para monitoreo

---

## 📝 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Fundamentos (2-3 días)
- [ ] Configurar proyecto (NestJS/Fastify + Prisma)
- [ ] Definir schema completo de Prisma
- [ ] Ejecutar migraciones
- [ ] Crear seed de datos
- [ ] Configurar Docker Compose

### Fase 2: Catálogos (3-4 días)
- [ ] CRUD Niveles
- [ ] CRUD Puestos
- [ ] CRUD Conceptos
- [ ] Validaciones con Zod
- [ ] Tests unitarios

### Fase 3: Empleados (3-4 días)
- [ ] CRUD Empleados
- [ ] Validar RFC, CURP, CLABE
- [ ] Soft delete
- [ ] Tests unitarios
- [ ] Endpoint de búsqueda

### Fase 4: Quincenas (2-3 días)
- [ ] CRUD Quincenas
- [ ] Validar solo 1 abierta por tipo
- [ ] Endpoint de quincena activa
- [ ] Tests unitarios

### Fase 5: Cálculos (5-7 días)
- [ ] Servicio de cálculo de nómina
- [ ] Calcular neto por empleado
- [ ] Consolidado quincenal
- [ ] Consolidado mensual
- [ ] Tests completos
- [ ] Endpoints HTTP

### Fase 6: Movimientos (3-4 días)
- [ ] CRUD Movimientos
- [ ] Generar movimientos por regla
- [ ] Validar conceptos editables
- [ ] Auditoría automática
- [ ] Tests

### Fase 7: Pagos y Dispersión (4-5 días)
- [ ] Generar pagos al cerrar quincena
- [ ] Generar archivos CSV/TXT
- [ ] Validar layouts bancarios
- [ ] Descargar archivos
- [ ] Tests

### Fase 8: Cierre de Nómina (2-3 días)
- [ ] Endpoint de cierre
- [ ] Validaciones previas
- [ ] Inmovilizar datos
- [ ] Auditoría de cierre
- [ ] Tests

### Fase 9: PDFs (opcional, 5-7 días)
- [ ] Generar recibo individual
- [ ] Carátula de quincena
- [ ] Reportes de impuestos
- [ ] Logo de empresa

**Tiempo total estimado**: 30-45 días (sin frontend)

---

## 🔗 RECURSOS ÚTILES

**Documentación**:
- [Prisma Docs](https://www.prisma.io/docs)
- [NestJS Docs](https://docs.nestjs.com)
- [SAT México - Nómina](https://www.sat.gob.mx/nominas)

**Layouts bancarios**:
- [STPS - Especificaciones de dispersión](http://www.conasami.gob.mx/)
- [SPEI - Banxico](https://www.banxico.org.mx/speiol.html)

**Cálculo de impuestos**:
- [ISR - Tablas mensuales SAT](https://www.sat.gob.mx/consultas/47721/tablas-vigentes-del-isisr-aplicables-a-2024)

---

## 🎯 CONCLUSIÓN

Este documento contiene toda la especificación necesaria para recrear el módulo de nómina de ContableSYS en un sistema POS. La arquitectura del proyecto original es sólida y reusable, con la ventaja de que la lógica de cálculo ya está probada con tests unitarios completos.

**Recomendación**: Implementar fase por fase siguiendo el checklist, priorizando:
1. Catálogos → Empleados → Quincenas (foundation)
2. Cálculos → Movimientos (core business logic)
3. Pagos → Dispersión → Cierre (workflows)

Una vez completado el backend, proceder con el frontend usando Next.js + shadcn/ui para una experiencia de usuario moderna.

---

**Última actualización**: Enero 2026
**Proyecto original**: ContableSYS v0.1.0
**Autor**: Claude Code (Anthropic)
**Licencia**: Use libremente para tu proyecto POS
