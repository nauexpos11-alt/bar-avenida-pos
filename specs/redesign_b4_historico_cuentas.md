# SPEC — Bloque 4: Histórico de Cuentas con detalle

> **Maestro:** `specs/redesign_master.md`
> **Esfuerzo:** ~60 min
> **Impacto:** MEDIO
> **Para:** Claude Code en F:\BarAvenida

---

## 1. Origen

Soft Restaurant tiene "Consulta de cuentas" con:
- Filtros: Archivo (TURNO ACTUAL), Servicio, Series, Estación
- Tabla: Folio cuenta, Folio nota, Fecha, Cuenta/Mesa, Cancel, Fact, E
- Panel detalle con productos
- Acciones: REABRIR CUENTA, TARJETA PTOS, CANCELAR FOLIO, FORMA DE PAGO, REIMPRIMIR

Bar Avenida tiene `ConsultaCuentasScreen.jsx` que es básico. Este bloque lo lleva al siguiente nivel.

---

## 2. Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ HISTÓRICO DE CUENTAS                                                         │
│ Filtros: [Turno actual ▼] [Servicio: Todos ▼] [Mesera: Todas ▼]              │
│          [Fecha: Hoy ▼] [Estado: Todos ▼] [🔍 #folio] [✕ Limpiar]            │
├──────────────────────────────────┬──────────────────────────────────────────┤
│ Folio  Mesa     Mesera   Total   │  FOLIO #58042 — Mesa M9                  │
│ ──────────────────────────────   │  ─────────────────────────────────────   │
│ ▶58042 M9       Rosarito $246    │  Estado:    ✓ Cobrada                     │
│  58041 M6       ABBY     $187    │  Mesera:    Rosarito                     │
│  58040 M1       ABBY     $84  ✕  │  Apertura:  8/may 19:15                  │
│  58039 BARRA#2  Coronado $128    │  Cierre:    8/may 20:42 (1h 27m)         │
│  58038 M2       Rosarito $597    │  Forma pago: Tarjeta + 5% comisión       │
│  58037 M15      Bubu     $310    │  Cobrado por: Coronado                   │
│  ...                             │                                           │
│                                  │  PRODUCTOS POR ORDEN                     │
│                                  │  ┌──────────────────────────────────┐   │
│ Mostrando 56 de 142              │  │ Orden #1 · 19:16                 │   │
│ [Ver más ▼]                      │  │   2x Corona            $80       │   │
│                                  │  │   1x Tequila 1800      $75       │   │
│ TOTALES VISIBLES                 │  │ Orden #2 · 19:42 (Agregado)      │   │
│ Bruto:   $11,840                 │  │   3x Hielo             $0        │   │
│ Pagado:  $11,400                 │  │ Orden #3 · 20:15 (Agregado)      │   │
│ Cancelado:  $440                 │  │   1x Cuerno           $40        │   │
│                                  │  └──────────────────────────────────┘   │
│                                  │                                           │
│                                  │  Subtotal:    $195.00                    │
│                                  │  Comisión 5%:  $11.75                    │
│                                  │  TOTAL:       $246.75                    │
│                                  │                                           │
│                                  │  ┌──────┬──────┬──────┬──────┐           │
│                                  │  │ 🖨   │ ✕    │ 📄   │ 🔓   │           │
│                                  │  │REIMP │CANC  │FACT  │REABR │           │
│                                  │  │TICKET│FOLIO │      │      │           │
│                                  │  └──────┴──────┴──────┴──────┘           │
└──────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 3. Filtros

| Filtro | Valores | Default |
|---|---|---|
| Turno | "Turno actual" / "Todos" / cada turno cerrado por fecha-hora | Turno actual |
| Servicio | "Todos" / "Mesa" / "Barra" | Todos |
| Mesera | "Todas" / cada mesera del catálogo | Todas |
| Fecha | "Hoy" / "Ayer" / "Esta semana" / "Custom" (date range) | Hoy |
| Estado | "Todos" / "Cobrada" / "Cancelada" / "Abierta" | Cobrada |
| #Folio | búsqueda exacta por folio | (vacío) |

Persistencia en `localStorage` con keys `ba_historico_filtros`.

---

## 4. Tabla izquierda

- Columnas: Folio, Mesa/BARRA#, Mesera, Total
- Iconos al final: `✕` si cancelada, `📄` si facturada
- Borde izquierdo:
  - Verde: cobrada
  - Rojo: cancelada
  - Dorado: abierta (poco común en histórico, salvo filtro "Abierta")
- Click → carga detalle en panel derecho
- La seleccionada con flecha `▶` y borde dorado pleno
- Paginación: cargar 50 inicial, botón "Ver más" → +50

### Totales visibles
Caja al pie del panel izquierdo con:
- `Bruto: $<x>` (suma de totales de cuentas en el filtro, antes de cancelaciones)
- `Pagado: $<x>` (solo Cobradas)
- `Cancelado: $<x>` (solo Canceladas)

---

## 5. Panel derecho (detalle)

### Header
- `FOLIO #<n> — <Mesa>` grande
- Estado con badge (Cobrada verde, Cancelada rojo, Abierta dorado)
- Mesera, apertura, cierre con duración
- Forma de pago (con comisión si tarjeta)
- Cobrado por (admin que ejecutó cobro)

### Productos por orden
Igual que en Bloque 1 (agrupados por `NumeroOrden`).

### Totales
- Subtotal
- Descuento (si > 0)
- Comisión tarjeta (si aplica)
- Total

### Acciones (4 botones)

| Botón | Color | Acción | Cuándo activo |
|---|---|---|---|
| **🖨 REIMPRIMIR TICKET** | Gris | Reimprime ticket de cuenta del cliente | Siempre |
| **✕ CANCELAR FOLIO** | Rojo | Modal con motivo + confirmación → `POST /api/Cuentas/{id}/cancelar-cobrada` (NUEVO endpoint) | Solo si Cobrada y dentro del turno actual |
| **📄 FACTURAR** | Azul | Abre flujo de facturación (placeholder por ahora) | Solo si Cobrada y no facturada |
| **🔓 REABRIR** | Naranja | Modal confirm + revierte cuenta a Abierta para corregir | Solo si Cobrada hace < 30 min y dentro del turno actual |

---

## 6. Endpoints

### Existentes (verificar formato)
- `GET /api/Cuentas?desde&hasta&estado&folio` — ya existe `ListarCuentas`
- `GET /api/Cuentas/{id}` — detalle

### Nuevos (si no existen)

```csharp
// Cancelar una cuenta YA cobrada (motivo: error de cobro, devolución, etc)
[HttpPost("{id}/cancelar-cobrada")]
[Authorize]
public async Task<IActionResult> CancelarCobrada(int id, [FromBody] CancelarCobradaDto dto)
{
    if (dto.Motivo?.Length < 10)
        return BadRequest(new { mensaje = "Motivo de mín 10 caracteres" });

    var cuenta = await _context.Cuentas.FindAsync(id);
    if (cuenta == null) return NotFound();
    if (cuenta.Estado != "Cobrada")
        return BadRequest(new { mensaje = "Solo cuentas cobradas se pueden cancelar aquí" });

    cuenta.Estado = "Cancelada";
    cuenta.MotivoCancelacion = dto.Motivo;
    cuenta.FechaCancelacion = DateTime.Now;
    await _context.SaveChangesAsync();
    await _hub.Clients.Group("Admin").SendAsync("CuentaCancelada", id);
    return Ok();
}

// Reabrir una cuenta cobrada hace poco (devuelve a Abierta para corregir)
[HttpPost("{id}/reabrir")]
[Authorize]
public async Task<IActionResult> ReabrirCuenta(int id)
{
    var cuenta = await _context.Cuentas.FindAsync(id);
    if (cuenta == null) return NotFound();
    if (cuenta.Estado != "Cobrada")
        return BadRequest(new { mensaje = "Solo cuentas cobradas se reabren" });
    if ((DateTime.Now - cuenta.FechaCobro).TotalMinutes > 30)
        return BadRequest(new { mensaje = "Pasaron más de 30 min, ya no se puede reabrir" });

    cuenta.Estado = "Abierta";
    cuenta.FechaCobro = null;
    cuenta.MetodoPago = null;
    cuenta.MontoEfectivo = 0;
    cuenta.MontoTarjeta = 0;
    cuenta.Cambio = 0;
    cuenta.ComisionTarjeta = 0;
    await _context.SaveChangesAsync();
    await _hub.Clients.Group("Admin").SendAsync("CuentaActualizada", id);
    return Ok();
}
```

### Nuevos campos en `Cuenta` (si no existen)
- `MotivoCancelacion` (string?)
- `FechaCancelacion` (DateTime?)

Si no existen, crear migración `MotivoCancelacionEnCuenta`.

---

## 7. Frontend

### Modificar (no crear de cero)
- `BarAvenida.Admin/src/screens/ConsultaCuentasScreen.jsx` — refactor completo siguiendo este spec
- `BarAvenida.Admin/src/screens/ConsultaCuentasScreen.css`

### Crear
- `BarAvenida.Admin/src/components/CancelarCobradaModal.jsx`
- `BarAvenida.Admin/src/components/ReabrirCuentaModal.jsx`

### Modificar
- `BarAvenida.Admin/src/api.js` — agregar:
  - `getCuentasFiltradas(token, filtros)` — wrapper sobre `GET /api/Cuentas` con filtros completos
  - `cancelarCobrada(token, id, motivo)`
  - `reabrirCuenta(token, id)`

---

## 8. Builds y validación

- `dotnet build` → 0/0
- `dotnet ef migrations add MotivoCancelacionEnCuenta` (si aplica)
- `dotnet ef database update`
- `npm run build` Admin → 0/0
- Deploy con `Scripts\deploy-todo.ps1`

### Caso A — Filtrado
1. Login → REPORTES → Histórico (o Consultas → Histórico).
2. Filtro "Hoy" + "Cobrada" → muestra cuentas cobradas hoy.
3. Cambiar a "Cancelada" → muestra solo canceladas.
4. Buscar `#58042` → muestra solo esa.

### Caso B — Detalle
1. Click en una cuenta → panel derecho carga.
2. Ver órdenes agrupadas por `NumeroOrden`.
3. Verificar totales correctos.

### Caso C — Reimprimir ticket
1. Click `🖨 REIMPRIMIR TICKET` en una cuenta cobrada.
2. Impresora térmica imprime el ticket original.

### Caso D — Cancelar folio
1. Cuenta cobrada hace 5 min (dentro de turno).
2. Click `✕ CANCELAR FOLIO` → modal motivo "Error de cobro" → confirma.
3. Cuenta pasa a Cancelada con motivo guardado.
4. Refresca lista, fila pasa a borde rojo.

### Caso E — Reabrir
1. Cuenta cobrada hace 10 min.
2. Click `🔓 REABRIR` → modal confirm.
3. Cuenta vuelve a Abierta, aparece de nuevo en Centro de Operación.

### Caso F — No reabrir vieja
1. Cuenta cobrada hace 45 min.
2. Click `🔓 REABRIR` → backend devuelve 400 "Pasaron más de 30 min".
3. Toast rojo en frontend.

---

## 9. Comando para Coronado

```
Lee F:\BarAvenida\specs\redesign_b4_historico_cuentas.md y impleméntalo completo.
Reporta archivos modificados, builds, migraciones y los 6 casos validados.
```
