# SPEC — Bloque 5: Folio = Número de Orden de Mesera

> **Maestro:** `specs/redesign_master.md`
> **Esfuerzo:** ~30 min
> **Impacto:** 🔥 CRÍTICO (resuelve problema operativo concreto)
> **Para:** Claude Code en F:\BarAvenida

---

## 1. Problema

Coronado dijo:
> *"El número de folio tiene que coincidir con el número de orden de la mesera"*

**Lo que pasa hoy en el bar:**
- La mesera tiene una comanda física de papel azul (logo Bar Avenida).
- Cuando agarra una orden, le pone un número a mano (1, 2, 3...) y se la pasa al barman.
- El barman necesita matchear el papel con la orden que ve en el KDS.
- **Hoy no hay número visible en el KDS que coincida con lo que la mesera escribió.**
- El KDS muestra `Id` interno de la BD (números grandes tipo 58042) que no corresponden a nada en el papel.

**Lo que necesitamos:**
Que cada orden enviada por la mesera tenga un número incremental **POR CUENTA** (1, 2, 3...) y ese mismo número aparezca:
1. En el ticket impreso (BIEN GRANDE arriba)
2. En la tarjeta del KDS
3. En la pantalla de la mesera (vista del detalle de cuenta)
4. En el panel de admin (Centro de Operación, futuro Bloque 1)

Así, mesera escribe "ORDEN 3" en papel, barman lee "ORDEN 3" en KDS, match instantáneo.

---

## 2. Estado actual del modelo

### `BarAvenida.API/Models/Orden.cs`
```csharp
public class Orden
{
    public int Id { get; set; }                  // Id interno BD (58042 actual)
    public int CuentaId { get; set; }
    public Cuenta? Cuenta { get; set; }
    public DateTime FechaEnvio { get; set; }
    public DateTime? FechaListo { get; set; }
    public string Estado { get; set; }           // Pendiente / Listo / Cancelado
    public bool EsAgregado { get; set; }
    public string? Observaciones { get; set; }
    public ICollection<OrdenDetalle> Detalles { get; set; }
}
```

### Endpoint `POST /api/Cuentas/enviar-orden`
Crea la orden con `Id` autogenerado por SQL. No hay número incremental por cuenta.

---

## 3. Cambio propuesto

### 3.1. Modelo `Orden` — agregar campo

```csharp
public class Orden
{
    public int Id { get; set; }
    public int CuentaId { get; set; }
    public Cuenta? Cuenta { get; set; }

    // NUEVO: número incremental DENTRO de la cuenta (1, 2, 3...)
    // Es el "folio mesera" que va impreso en la comanda física.
    public int NumeroOrden { get; set; }

    public DateTime FechaEnvio { get; set; } = DateTime.Now;
    // ... resto igual
}
```

### 3.2. Migration EF

Nombre: `OrdenNumeroOrden` o similar.

```csharp
migrationBuilder.AddColumn<int>(
    name: "NumeroOrden",
    table: "Ordenes",
    type: "int",
    nullable: false,
    defaultValue: 0);

// Backfill: poblar el campo para órdenes históricas con un ROW_NUMBER por cuenta
migrationBuilder.Sql(@"
    WITH ordenadas AS (
        SELECT Id,
               ROW_NUMBER() OVER (PARTITION BY CuentaId ORDER BY FechaEnvio, Id) AS num
        FROM Ordenes
    )
    UPDATE Ordenes
    SET NumeroOrden = ordenadas.num
    FROM Ordenes
    INNER JOIN ordenadas ON Ordenes.Id = ordenadas.Id;
");
```

Down: `DropColumn`.

### 3.3. Endpoint `EnviarOrden` — calcular `NumeroOrden`

En `BarAvenida.API/Controllers/CuentasController.cs`, dentro de `EnviarOrden`, **antes** de crear la `Orden`:

```csharp
// Calcular número de orden incremental para esta cuenta
int siguienteNumero = (cuenta.Ordenes.Any())
    ? cuenta.Ordenes.Max(o => o.NumeroOrden) + 1
    : 1;

var orden = new Orden
{
    CuentaId = cuenta.Id,
    NumeroOrden = siguienteNumero,    // ← NUEVO
    FechaEnvio = DateTime.Now,
    Estado = "Pendiente",
    EsAgregado = esAgregado,
    Observaciones = dto.Observaciones
};
```

**Nota:** `cuenta.Ordenes` ya viene cargado con `.Include(c => c.Ordenes)` arriba, así que no hay query extra.

### 3.4. DTOs — incluir `NumeroOrden`

Buscar y agregar el campo en:
- `OrdenDto` (cualquier parte del archivo `OrdenDtos.cs`)
- Cualquier lugar donde se serialice una orden hacia la API (Cuentas, KDS, Tablet)

```csharp
public class OrdenDto
{
    public int Id { get; set; }
    public int CuentaId { get; set; }
    public int NumeroOrden { get; set; }    // ← NUEVO
    public DateTime FechaEnvio { get; set; }
    public string Estado { get; set; }
    public bool EsAgregado { get; set; }
    // ...
}
```

### 3.5. Frontend KDS — mostrar `ORDEN #N` GIGANTE

`BarAvenida.KDS/src/components/MesaCard.jsx` (o el componente equivalente que renderiza cada orden):

- En el header de la card, mostrar `ORDEN #{numeroOrden}` con tipografía 32-40px bold en dorado.
- Mantener el resto (mesa, mesera, productos, tiempo).

Mockup del header de la card:
```
┌────────────────────────────────────┐
│  ORDEN #3              ⏱ 4 min     │
│  ─────────────────────────────     │
│  Mesa M9 · Rosarito                │
│  ─────────────────────────────     │
│  2x Corona                         │
│  1x Tequila 1800                   │
│  ─────────────────────────────     │
│  [ LISTO ]                         │
└────────────────────────────────────┘
```

### 3.6. Tablet meseras — mostrar `Orden N` en el detalle de cuenta

`BarAvenida.Tablet/src/screens/CuentaScreen.jsx` (o `ResumenCuentaScreen.jsx`, según donde se muestren los productos agrupados por orden):

- Al lado de cada grupo de productos, mostrar `Orden 1`, `Orden 2`, `Orden 3...`
- Es lo que la mesera va a escribir en la comanda física al enviar.

Mockup:
```
Mesa M9 · Cliente: ─                       Folio cuenta #58042
─────────────────────────────────────
Orden 1  ·  19:16
  2x Corona              $80
  1x Tequila 1800        $75

Orden 2  ·  19:42  (Agregado)
  3x Hielo               $0

Orden 3  ·  20:15  (Agregado)
  1x Cuerno              $40
─────────────────────────────────────
TOTAL                  $235.00
```

### 3.7. Ticket impreso (cocina/barra)

El servicio que arma el texto del ticket que se manda a la impresora térmica está en algún lado del backend (probablemente `Services/ImpresionService.cs` o similar — Claude Code lo localiza).

Modificar el header del ticket de cocina/barra para que diga:

```
   BAR AVENIDA
   ─────────────
      ORDEN #3              ← font 2x size, bold, centrado
   ─────────────
   Mesa M9 · Rosarito
   8/may/2026 20:15
   ─────────────
   2x Corona
   1x Tequila 1800
   ─────────────
   Folio cuenta: #58042       ← chiquito al final
```

(El `Folio cuenta` es el `Cuenta.Folio` interno, sigue ahí pero secundario.)

**Importante:** sólo los **tickets de cocina/barra** (los que recibe el barman). Los tickets de COBRO (los del cliente) siguen llevando el folio de cuenta como ahora — no cambia para el cliente.

---

## 4. Archivos a tocar

### Backend
- `BarAvenida.API/Models/Orden.cs` — agregar `NumeroOrden`
- `BarAvenida.API/Migrations/<timestamp>_OrdenNumeroOrden.cs` — nueva migración
- `BarAvenida.API/Controllers/CuentasController.cs` — calcular `NumeroOrden` en `EnviarOrden`
- `BarAvenida.API/DTOs/OrdenDtos.cs` (o donde estén los DTOs) — agregar campo
- `BarAvenida.API/Services/<archivo de impresión>` — modificar header del ticket de cocina/barra

### Frontend KDS
- `BarAvenida.KDS/src/components/MesaCard.jsx` y `.css` — mostrar `ORDEN #N` grande

### Frontend Tablet
- `BarAvenida.Tablet/src/screens/ResumenCuentaScreen.jsx` (o `CuentaScreen.jsx`) — etiquetas `Orden N`
- Verificar que el dato venga en la respuesta del endpoint

### Frontend Admin
- (Por ahora nada — el Bloque 1 lo usará)

---

## 5. Builds

- `dotnet build` → 0 errors, 0 warnings
- `dotnet ef migrations add OrdenNumeroOrden`
- `dotnet ef database update`
- `npm run build` Tablet, KDS → 0/0
- Deploy con `Scripts\deploy-todo.ps1`

---

## 6. Validación E2E

### Caso A — Orden única
1. Mesera abre Mesa 7 (libre).
2. Agrega 2 cervezas.
3. Presiona ENVIAR.
4. Tablet muestra `Orden 1` en el detalle.
5. KDS recibe la card con `ORDEN #1` grande arriba.
6. Imprime ticket de barra: `ORDEN #1` grande en el header.

### Caso B — Múltiples órdenes (agregados)
1. Tomar Caso A, después de enviar Orden 1.
2. Mesera agrega 1 tequila más → ENVIAR.
3. Tablet muestra `Orden 2 (Agregado)`.
4. KDS recibe nueva card con `ORDEN #2` grande.
5. Ticket impreso de la nueva orden lleva `ORDEN #2`.

### Caso C — Persistencia
1. Cerrar la cuenta del Caso B (cobrar).
2. Abrir una NUEVA cuenta en Mesa 7.
3. Enviar primera orden.
4. Debe ser `ORDEN #1` (NO 3 — el contador es POR CUENTA, no global).

### Caso D — Backfill
1. Verificar que las órdenes históricas tienen `NumeroOrden` poblado correctamente (1, 2, 3 dentro de cada cuenta).
2. SQL de verificación:
   ```sql
   SELECT TOP 20 CuentaId, Id, NumeroOrden, FechaEnvio
   FROM Ordenes
   ORDER BY CuentaId, NumeroOrden;
   ```

---

## 7. Notas finales

- **Conservar archivos JSX/CSS** aunque queden sin uso (regla del proyecto).
- **No instalar librerías nuevas.**
- **Reportar al final:**
  - Lista de archivos modificados
  - Migración aplicada limpio (timestamp)
  - Builds 0/0
  - Resultado de los 4 casos E2E

---

## 8. Comando para Coronado

```
Lee F:\BarAvenida\specs\redesign_b5_folio_orden.md y impleméntalo completo.
Reporta archivos modificados, builds, migración y los 4 casos validados.
```
