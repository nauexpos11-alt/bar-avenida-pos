# SPEC — Bloque 1: Centro de Operación (vista unificada de cuentas)

> **Maestro:** `specs/redesign_master.md`
> **Esfuerzo:** ~90 min
> **Impacto:** ALTO
> **Para:** Claude Code en F:\BarAvenida
> **Depende de:** Bloque 5 (`NumeroOrden` ya en backend)

---

## 1. Origen

Coronado mandó captura del "COMEDOR" de Soft Restaurant 8.1.0. Es la pantalla donde el admin ve TODAS las cuentas activas en una sola vista, con detalle completo de cada una (mesa, mesera, productos, total, comandas).

Hoy en Bar Avenida POS hay 3 pantallas separadas:
- **Mesas** (grid de mesas con color)
- **Cuentas por cobrar** (lista de cuentas listas para cobrar)
- **Solicitudes pendientes** (cancelaciones)

El admin tiene que saltar entre las 3 para tener picture completo. **Este spec las unifica** en un "Centro de Operación".

---

## 2. Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CENTRO DE OPERACIÓN                                          [+ NUEVA BARRA]│
│ 16 cuentas activas · $12,847 en mesas · 3 solicitudes · 2 alertas           │
├──────────────────┬──────────────────────────────────────────────────────────┤
│ FILTROS          │  CUENTA SELECCIONADA: M9 / Mesa 9                        │
│  ☑ Mesas (10)    │  ─────────────────────────────────────────────────       │
│  ☑ Barra  (3)    │  Mesera: Rosarito · Folio #58042                         │
│  ☑ Cobrar (2)    │  Abierta: 19:15 (1h 22m)                                 │
│  ☑ Solicitud(1)  │  Personas: 4 · Área: Comedor                             │
│                  │                                                            │
│ ORDENAR POR      │  ┌── PRODUCTOS POR ORDEN ─────────────────────────┐    │
│  ⦿ Tiempo abrtA  │  │ ▾ Orden #1 · 19:16                            │    │
│  ⊙ Mesa          │  │   2x Corona               $80                  │    │
│  ⊙ Total         │  │   1x Tequila 1800         $75                  │    │
│                  │  │ ▾ Orden #2 · 19:42  (Agregado)                 │    │
│ CUENTAS (16)     │  │   3x Hielo                $0                   │    │
│ ──────────────   │  │ ▾ Orden #3 · 20:15  (Agregado)                 │    │
│ ▶ M9 Rosarito    │  │   1x Cuerno              $40                   │    │
│   $235  1h22m    │  └─────────────────────────────────────────────────┘    │
│ ──────────────   │                                                            │
│   M5 Coronado    │  Subtotal:    $195.00                                     │
│   $40   20m      │  Descuento:   $  0.00                                     │
│ ──────────────   │  TOTAL:       $195.00                                     │
│   M2 Bubu        │                                                            │
│   $597  3h05m    │  ┌──────┬──────┬──────┬──────┬──────┐                    │
│ ──────────────   │  │ 💵   │ ➕   │ ✏️   │ 🚪   │ 🖨   │                    │
│   BARRA#3 ★      │  │COBRAR│PROD. │EDITAR│MOVER │TICKET│                    │
│   $128  3m       │  │       │      │ MESA │ ÁREA │      │                    │
│ ──────────────   │  └──────┴──────┴──────┴──────┴──────┘                    │
│   ...            │                                                            │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

**Cards de cuentas (panel izquierdo) con colores:**
- 🟡 **Mesa abierta normal** — fondo gris oscuro, borde dorado en hover
- 🟠 **Por cobrar** — fondo naranja tenue, badge "💵 COBRANDO"
- 🟣 **Con solicitud** — fondo morado tenue, badge "🔔 SOLICITUD"
- 🍺 **Barra (★)** — estrella en esquina indicando que es BARRA (sin mesa numerada)

**Panel derecho (detalle):**
- Header con info de la cuenta (mesa, mesera, folio, tiempo)
- Productos agrupados por **Orden #N** (collapsable, default abierto)
- Cada agrupación tiene timestamp y badge "(Agregado)" si no es la primera
- Totales abajo
- 5 botones grandes de acción

---

## 3. Comportamiento detallado

### 3.1. Header
- Título grande
- Línea de stats:
  - `<N> cuentas activas` (mesas + barra)
  - `$<X> en mesas` (suma de totales de cuentas no cobradas)
  - `<N> solicitudes` (badge rojo si > 0)
  - `<N> alertas` (badge amarillo si > 0)
- Botón `+ NUEVA BARRA` arriba derecha (mismo que B2: `POST /api/Cuentas/abrir-rapido`)

### 3.2. Filtros (panel izquierdo arriba)
- Checkboxes para mostrar/esconder tipos de cuenta
- Cada checkbox tiene contador `(N)` en paréntesis
- Por defecto todos activos
- Persistencia en `localStorage` con key `ba_centro_filtros`

### 3.3. Ordenar por
- Radio buttons: `Tiempo abierta` (default) | `Mesa` (numérico) | `Total` (descendente)
- Persistencia en `localStorage` con key `ba_centro_orden`

### 3.4. Lista de cuentas (cards)
- Card con: título (M9 / BARRA#3), mesera, monto, tiempo abierta
- Borde izquierdo de color según estado (verde/naranja/morado/dorado)
- Click → cambia panel derecho a esa cuenta
- La seleccionada con borde dorado pleno + flecha `▶`
- Auto-refresh con SignalR cada vez que algo cambia

### 3.5. Panel derecho — header
- `CUENTA SELECCIONADA: <M9 / BARRA#3>` grande
- Línea: `Mesera: <nombre> · Folio #<folio> · Abierta: <hora> (<duración>)`
- Línea: `Personas: <N> · Área: <nombre>` (si tiene)
- Si la cuenta tiene solicitud pendiente, banner morado: `🔔 SOLICITUD: <motivo> · [APROBAR] [RECHAZAR]`

### 3.6. Productos por orden
- Agrupar `OrdenDetalle`s por `NumeroOrden` (campo nuevo del Bloque 5)
- Cada grupo:
  - Header: `▾ Orden #<n> · <hora>` (clickeable para colapsar/expandir)
  - Si `EsAgregado`, agregar `(Agregado)` después
  - Lista de líneas: `<cantidad>x <nombre>           $<subtotal>`
- Si la orden tiene `Estado="Cancelado"`, tachar el grupo con `~~Orden #N CANCELADA~~` y mostrarlo en gris
- Si la orden tiene `Estado="Listo"` (KDS marcó listo), badge verde `✓ Listo` al lado

### 3.7. Totales (abajo del listado)
- `Subtotal:    $<x>`
- `Descuento:   $<x>` (si > 0)
- `TOTAL:       $<x>` grande dorado

### 3.8. Botones de acción (5)

| Botón | Color | Acción |
|---|---|---|
| **💵 COBRAR** | Verde | Abre `CobrarCuentaModal` ya existente. Solo si `Estado === "Abierta"` o `"PorCobrar"` |
| **➕ PROD.** | Dorado | Navega a Servicio Rápido v2 (B2) con esta cuenta pre-seleccionada |
| **✏️ EDITAR MESA** | Gris | Modal para editar `NombreCliente`, `NumeroPersonas`, `Area`, `Alias` |
| **🚪 MOVER ÁREA** | Gris | Modal para mover la cuenta a otra área (ej: "Mesa 9 → Privado") |
| **🖨 TICKET** | Gris | Reimprime el ticket de cuenta sin cobrar (solo info) |

**Botones inactivos** (cobrada/cancelada): solo `🖨 TICKET` activo, los demás disabled grises.

### 3.9. Solicitudes inline
Si la cuenta seleccionada tiene `SolicitudCancelacion` con `Estado="Pendiente"`:
- Banner morado bajo el header: `🔔 SOLICITUD: <motivo> por <mesera> hace <Xm>`
- Botones inline: `[APROBAR]` `[RECHAZAR]`
- Al aprobar/rechazar, llama al endpoint correspondiente y refresca

---

## 4. Endpoints (todos existentes)

- `GET /api/Cuentas/abiertas` — lista de cuentas activas (incluye `MesaId=null` y otras)
- `GET /api/Cuentas/{id}` — detalle de una cuenta con órdenes
- `GET /api/SolicitudesCancelacion/pendientes` — solicitudes pendientes
- `POST /api/Cuentas/abrir-rapido` — nueva BARRA
- `POST /api/Cuentas/{id}/cobrar` — cobrar
- `POST /api/SolicitudesCancelacion/{id}/aprobar` — aprobar solicitud
- `POST /api/SolicitudesCancelacion/{id}/rechazar` — rechazar
- `POST /api/Cuentas/{id}/editar-info` — **NUEVO** — actualiza `NombreCliente`, `NumeroPersonas`, `Area`, `Alias` (verificar si ya existe; si no, crearlo)
- `POST /api/Cuentas/{id}/mover-area` — **NUEVO** — actualiza solo `Area` con auditoría

### 4.1. Si los endpoints "editar-info" y "mover-area" no existen
Crearlos así:

```csharp
// CuentasController.cs

public record EditarInfoCuentaDto(
    string? NombreCliente,
    int?    NumeroPersonas,
    string? Area
);

[HttpPost("{id}/editar-info")]
[Authorize]
public async Task<IActionResult> EditarInfo(int id, [FromBody] EditarInfoCuentaDto dto)
{
    var cuenta = await _context.Cuentas.FindAsync(id);
    if (cuenta == null) return NotFound();
    if (cuenta.Estado != "Abierta") return BadRequest(new { mensaje = "Cuenta no abierta" });

    if (dto.NombreCliente != null) cuenta.NombreCliente = dto.NombreCliente.Trim();
    if (dto.NumeroPersonas.HasValue) cuenta.NumeroPersonas = dto.NumeroPersonas.Value;
    if (dto.Area != null) cuenta.Area = dto.Area.Trim();

    await _context.SaveChangesAsync();
    await _hub.Clients.Group("Admin").SendAsync("CuentaActualizada", cuenta.Id);
    return Ok(cuenta);
}

public record MoverAreaDto(string AreaNueva);

[HttpPost("{id}/mover-area")]
[Authorize]
public async Task<IActionResult> MoverArea(int id, [FromBody] MoverAreaDto dto)
{
    var cuenta = await _context.Cuentas.FindAsync(id);
    if (cuenta == null) return NotFound();
    if (string.IsNullOrWhiteSpace(dto.AreaNueva))
        return BadRequest(new { mensaje = "Area inválida" });

    var areaAnterior = cuenta.Area;
    cuenta.Area = dto.AreaNueva.Trim();
    await _context.SaveChangesAsync();
    await _hub.Clients.Group("Admin").SendAsync("CuentaActualizada", cuenta.Id);
    // Opcional: log en una tabla de auditoría
    return Ok(new { areaAnterior, areaNueva = cuenta.Area });
}
```

---

## 5. SignalR

En `CentroOperacionScreen.jsx`:
- Conectar a `/barhub`, unirse a grupo `Admin`
- Escuchar todos estos eventos y recargar lista:
  - `CuentaAbierta`
  - `CuentaPorCobrar`
  - `CuentaCobrada`
  - `CuentaCancelada`
  - `CuentaActualizada`
  - `OrdenAgregada`
  - `OrdenLista`
  - `SolicitudCancelacion`
  - `SolicitudResuelta`
- Si la cuenta cobrada/cancelada era la seleccionada, deselecciona y limpia panel derecho

---

## 6. Archivos a crear / modificar

### Crear
- `BarAvenida.Admin/src/screens/CentroOperacionScreen.jsx` (~450 líneas)
- `BarAvenida.Admin/src/screens/CentroOperacionScreen.css` (~280 líneas)
- `BarAvenida.Admin/src/components/CuentaCard.jsx` (~80 líneas) — card reusable
- `BarAvenida.Admin/src/components/EditarInfoCuentaModal.jsx` (~120 líneas)
- `BarAvenida.Admin/src/components/MoverAreaModal.jsx` (~100 líneas)

### Modificar
- `BarAvenida.Admin/src/components/TopMenuBar.jsx` — agregar item:
  ```js
  { id: 'pos-centro', label: '🎯 Centro de Operación', screen: 'pos-centro' },
  ```
  Justo arriba de `pos-mesas` en sección `pos`. Pantalla por defecto al login.
- `BarAvenida.Admin/src/App.jsx`:
  - Cambiar default `pantallaActual` a `'pos-centro'`
  - Agregar `case 'pos-centro'` con import + componente
- `BarAvenida.Admin/src/api.js` — agregar:
  - `getCuentasAbiertasFull(token)` — ya existe `getCuentasAbiertas`, verificar formato
  - `editarInfoCuenta(token, id, body)`
  - `moverAreaCuenta(token, id, areaNueva)`

### Backend (si los endpoints no existen)
- `BarAvenida.API/Controllers/CuentasController.cs` — agregar `EditarInfo` y `MoverArea` (sección 4.1)
- `BarAvenida.API/DTOs/CuentaDtos.cs` — agregar `EditarInfoCuentaDto`, `MoverAreaDto`

---

## 7. Builds

- `dotnet build` → 0/0
- `npm run build` Admin → 0/0
- Deploy con `Scripts\deploy-todo.ps1`

---

## 8. Validación E2E

### Caso A — Vista panorámica
1. Login ADMIN/1234.
2. Centro de Operación cargado por default.
3. Header muestra `<N> cuentas activas · $<X> en mesas`.
4. Lista izquierda muestra todas las cuentas abiertas con info correcta.

### Caso B — Filtrado
1. Tener 5 mesas + 2 barras + 1 por cobrar abiertas.
2. Desmarcar `☑ Mesas` → lista muestra solo barras + por cobrar (3).
3. Desmarcar `☑ Barra` → lista muestra solo por cobrar (1).
4. Re-marcar todos → vuelve a 8.

### Caso C — Cobro inline
1. Seleccionar M5 con $40.
2. Click `💵 COBRAR` → modal CobrarCuentaModal.
3. Efectivo $50 → cobra → cambio $10.
4. Cuenta sale de la lista, panel derecho se limpia.

### Caso D — Editar info
1. Seleccionar M9.
2. Click `✏️ EDITAR MESA` → modal con `NombreCliente`, `NumeroPersonas`, `Area`.
3. Cambiar nombre a "Mesa Roja 3" → guardar.
4. Card en lista actualiza el alias.

### Caso E — Solicitud inline
1. Tener una mesa con solicitud de cancelación pendiente (la card debería tener fondo morado).
2. Seleccionarla → banner morado en panel derecho con motivo.
3. Click `[APROBAR]` → cancela según el alcance (productos/cuenta), banner desaparece.
4. Si era cancelar cuenta entera, sale de la lista.

### Caso F — SignalR realtime
1. Centro de Operación abierto en admin.
2. Mesera (tablet, otra ventana) abre M3 → admin ve aparecer la card sin F5.
3. Mesera agrega productos → si M3 está seleccionada en admin, panel derecho refresca.
4. Mesera presiona "💵 SOLICITAR COBRO" → card en admin cambia a fondo naranja con badge "💵 COBRANDO".

---

## 9. Notas finales

- **No instalar librerías nuevas.**
- **Conservar archivos JSX/CSS** aunque queden sin uso.
- Tema dorado #f0c842 + negro #0a0a0a + Inter.
- **Reportar al final:** archivos modificados, builds 0/0, los 6 casos E2E PASS/FAIL.
- Después de este bloque, el `DashboardScreen.jsx` actual queda accesible vía sub-tab "Mesas" (para vista grid pelado), pero el flujo principal del admin entra por Centro de Operación.

---

## 10. Comando para Coronado

```
Lee F:\BarAvenida\specs\redesign_b1_centro_operacion.md y impleméntalo completo.
Reporta archivos modificados, builds y los 6 casos validados al terminar.
```
