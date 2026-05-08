# SPEC C.3 — Cierre asistido + Histórico de Incidentes

> **Estado:** SPEC FINAL (refinado por Cowork con nombres reales del proyecto)
> **Pre-requisito:** C.1 ✅ y C.2 ✅ completos
> **CON migración EF**, sin librerías nuevas
> **Sesión estimada:** 3-4h Claude Code
> **Fecha:** Mayo 7, 2026

---

## 1. Objetivo

Cuando el admin cierra un turno (Corte Z), el sistema:

1. Calcula la **diferencia** = `EfectivoContado - EfectivoEnCaja`
2. Asigna **severidad** según los umbrales de `appsettings.json`:
   - **Verde**: `|diferencia| ≤ 50` — cierre directo
   - **Amarilla**: `50 < |diferencia| ≤ 200` — cierre permitido, justificación opcional
   - **Roja**: `|diferencia| > 200` — bloquea cierre hasta capturar justificación (mín 10 chars)
3. Crea un registro `IncidenteCaja` automáticamente cuando `diferencia ≠ 0`
4. El admin puede consultar el histórico de incidentes desde un nuevo tab dentro de `CortesCajaScreen`

## 2. Decisión arquitectónica

**NO crear endpoint nuevo.** El endpoint `POST /api/Caja/cerrar-turno` ya:
- Recibe `TurnoId, Pin, EfectivoContado, Notas`
- Calcula `Diferencia` y la guarda en `CorteCaja`
- Cierra el turno

Solo necesitamos:
- Agregar campo `Justificacion` (opcional) al `CerrarTurnoDto`
- Validar en el endpoint que si severidad=Roja, justificación sea ≥ 10 chars
- Crear `IncidenteCaja` cuando `Diferencia != 0`
- Modificar el modal frontend para mostrar código de color + textarea condicional

## 3. Backend — cambios

### 3.1 Modelo nuevo: `IncidenteCaja`

`F:\BarAvenida\BarAvenida.API\Models\IncidenteCaja.cs`:
```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BarAvenida.API.Models;

public class IncidenteCaja
{
    public int Id { get; set; }

    public int TurnoId { get; set; }
    public CajaTurno? Turno { get; set; }

    public int? CorteId { get; set; }
    public CorteCaja? Corte { get; set; }

    [Required, MaxLength(20)]
    public string Tipo { get; set; } = ""; // "Sobrante" | "Faltante"

    [Required, MaxLength(20)]
    public string Severidad { get; set; } = ""; // "Verde" | "Amarilla" | "Roja"

    [Column(TypeName = "decimal(10,2)")]
    public decimal Diferencia { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal EfectivoEsperado { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal EfectivoContado { get; set; }

    [MaxLength(500)]
    public string? Justificacion { get; set; }

    public int? AutorizadoPorId { get; set; }
    public Usuario? AutorizadoPor { get; set; }

    public DateTime FechaRegistro { get; set; } = DateTime.Now;
}
```

### 3.2 DbContext

En `F:\BarAvenida\BarAvenida.API\Data\BarAvenidaDbContext.cs` agregar:

```csharp
public DbSet<IncidenteCaja> IncidentesCaja { get; set; }
```

Y dentro de `OnModelCreating`, FKs con `NoAction` (mismo patrón que `SolicitudCancelacion`):

```csharp
modelBuilder.Entity<IncidenteCaja>()
    .HasOne(i => i.Turno).WithMany().HasForeignKey(i => i.TurnoId)
    .OnDelete(DeleteBehavior.NoAction);

modelBuilder.Entity<IncidenteCaja>()
    .HasOne(i => i.Corte).WithMany().HasForeignKey(i => i.CorteId)
    .OnDelete(DeleteBehavior.NoAction);

modelBuilder.Entity<IncidenteCaja>()
    .HasOne(i => i.AutorizadoPor).WithMany().HasForeignKey(i => i.AutorizadoPorId)
    .OnDelete(DeleteBehavior.NoAction);
```

### 3.3 Migración

```powershell
taskkill /F /IM BarAvenida.API.exe /T
cd F:\BarAvenida\BarAvenida.API
dotnet ef migrations add IncidentesCaja
dotnet ef database update
```

Verificar que la migración solo agrega la tabla `IncidentesCaja` (no toca otras).

### 3.4 DTOs nuevos

Agregar al final de `F:\BarAvenida\BarAvenida.API\DTOs\CajaDtos.cs`:

```csharp
// ── Incidentes (PROMPT C.3) ───────────────────────────────────────────────

public class IncidenteResumenDto
{
    public int     Id                 { get; set; }
    public int     TurnoId            { get; set; }
    public int?    CorteId            { get; set; }
    public string  Tipo               { get; set; } = "";
    public string  Severidad          { get; set; } = "";
    public decimal Diferencia         { get; set; }
    public decimal EfectivoEsperado   { get; set; }
    public decimal EfectivoContado    { get; set; }
    public string? Justificacion      { get; set; }
    public string? AutorizadoPorNombre{ get; set; }
    public DateTime FechaRegistro     { get; set; }
}

public class IncidentesPaginadoDto
{
    public int Total                       { get; set; }
    public int Page                        { get; set; }
    public int PageSize                    { get; set; }
    public List<IncidenteResumenDto> Items { get; set; } = new();
}
```

### 3.5 Modificar `CerrarTurnoDto`

En `F:\BarAvenida\BarAvenida.API\DTOs\CajaDtos.cs`, agregar campo opcional:

```csharp
public class CerrarTurnoDto
{
    public int TurnoId { get; set; }
    [Required]
    public string Pin { get; set; } = "";
    public decimal EfectivoContado { get; set; }
    public string? Notas { get; set; }

    // PROMPT C.3 — Justificación obligatoria si severidad = Roja
    public string? Justificacion { get; set; }
}
```

### 3.6 Modificar endpoint `POST /api/Caja/cerrar-turno`

En `F:\BarAvenida\BarAvenida.API\Controllers\CajaController.cs`, dentro de `CerrarTurno`:

**ANTES** de guardar el corte (después de calcular `corteDto.Diferencia`), agregar validación de justificación obligatoria:

```csharp
// PROMPT C.3 — Severidad y validación de justificación
var umbrales = HttpContext.RequestServices
    .GetRequiredService<IOptions<CajaSettings>>().Value.Umbrales;
var absDif = Math.Abs(corteDto.Diferencia ?? 0);

string severidad;
if (absDif <= umbrales.DiferenciaVerde)         severidad = "Verde";
else if (absDif <= umbrales.DiferenciaAmarilla) severidad = "Amarilla";
else                                            severidad = "Roja";

if (severidad == "Roja" &&
    (string.IsNullOrWhiteSpace(dto.Justificacion) || dto.Justificacion.Trim().Length < 10))
{
    return BadRequest(new {
        mensaje  = "La diferencia rebasa el umbral; justificación obligatoria (mín 10 caracteres).",
        severidad,
        diferencia = corteDto.Diferencia,
    });
}
```

**DESPUÉS** de `await _db.SaveChangesAsync();` (cuando ya tienes `corteBd.Id`), agregar la creación del incidente:

```csharp
// PROMPT C.3 — Crear IncidenteCaja si hay diferencia
if (corteDto.Diferencia.HasValue && corteDto.Diferencia.Value != 0)
{
    var incidente = new IncidenteCaja
    {
        TurnoId          = turno.Id,
        CorteId          = corteBd.Id,
        Tipo             = corteDto.Diferencia.Value > 0 ? "Sobrante" : "Faltante",
        Severidad        = severidad,
        Diferencia       = corteDto.Diferencia.Value,
        EfectivoEsperado = corteDto.EfectivoEnCaja,
        EfectivoContado  = dto.EfectivoContado,
        Justificacion    = string.IsNullOrWhiteSpace(dto.Justificacion)
                              ? null
                              : dto.Justificacion.Trim(),
        AutorizadoPorId  = usuario.Id,
        FechaRegistro    = DateTime.Now,
    };
    _db.IncidentesCaja.Add(incidente);
    await _db.SaveChangesAsync();
}
```

Inyectar `IOptions<CajaSettings>` ya está disponible (lo usa `sugerencia-fondo`). Si fuera necesario, agregar al constructor del controller.

Inyección — agregar también al inicio del archivo:
```csharp
using Microsoft.Extensions.Options;
using BarAvenida.API.Settings;
```
(probablemente ya están).

### 3.7 Endpoint nuevo: `GET /api/Caja/incidentes`

Agregar al final del controller:

```csharp
// ── GET /api/Caja/incidentes (PROMPT C.3) ────────────────────────────────
[HttpGet("incidentes")]
public async Task<IActionResult> GetIncidentes(
    [FromQuery] DateTime? desde,
    [FromQuery] DateTime? hasta,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 50)
{
    if (page < 1)     page = 1;
    if (pageSize < 1) pageSize = 50;
    if (pageSize > 200) pageSize = 200;

    var q = _db.IncidentesCaja
        .Include(i => i.AutorizadoPor)
        .AsQueryable();

    if (desde.HasValue) q = q.Where(i => i.FechaRegistro >= desde.Value);
    if (hasta.HasValue) q = q.Where(i => i.FechaRegistro <= hasta.Value);

    var total = await q.CountAsync();
    var items = await q
        .OrderByDescending(i => i.FechaRegistro)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(i => new IncidenteResumenDto {
            Id                  = i.Id,
            TurnoId             = i.TurnoId,
            CorteId             = i.CorteId,
            Tipo                = i.Tipo,
            Severidad           = i.Severidad,
            Diferencia          = i.Diferencia,
            EfectivoEsperado    = i.EfectivoEsperado,
            EfectivoContado     = i.EfectivoContado,
            Justificacion       = i.Justificacion,
            AutorizadoPorNombre = i.AutorizadoPor != null ? i.AutorizadoPor.Nombre : null,
            FechaRegistro       = i.FechaRegistro,
        })
        .ToListAsync();

    return Ok(new IncidentesPaginadoDto {
        Total    = total,
        Page     = page,
        PageSize = pageSize,
        Items    = items,
    });
}
```

## 4. Frontend — cambios

### 4.1 `api.js`

Agregar dentro del objeto `api` exportado en `F:\BarAvenida\BarAvenida.Admin\src\api.js`:

```javascript
adminGetIncidentes: (t, { desde, hasta, page = 1, pageSize = 50 } = {}) => {
  const p = new URLSearchParams()
  if (desde) p.set('desde', desde)
  if (hasta) p.set('hasta', hasta)
  p.set('page',     page)
  p.set('pageSize', pageSize)
  return req(`/api/Caja/incidentes?${p}`, {}, t)
},
```

Modificar el método `adminCerrarTurno` (si ya existe) para que pase `justificacion` opcional.

### 4.2 Modificar modal de "Cerrar Turno" en `TurnoCajaScreen.jsx`

Archivo: `F:\BarAvenida\BarAvenida.Admin\src\screens\TurnoCajaScreen.jsx`

Cambios:

1. **Agregar campo `justificacion` al estado `form`:**
   ```javascript
   const VACIO = { pin: '', notas: '', monto: '', justificacion: '' }
   ```

2. **Calcular severidad en cliente (cosmético):** debajo del cálculo existente de `diferencia`:
   ```javascript
   const absDif = Math.abs(diferencia)
   const severidad =
     absDif <= 50  ? 'verde'    :
     absDif <= 200 ? 'amarilla' :
                     'roja'
   ```

3. **Reemplazar el div actual de "Diferencia: …"** por uno con código de color y mensaje explicativo:
   ```jsx
   {form.monto !== '' && corteX && (
     <div className={`tc-cierre-banner tc-cierre-${severidad}`}>
       <div className="tc-cierre-row">
         <span className="tc-cierre-lbl">Diferencia</span>
         <span className="tc-cierre-monto">
           {difSign}{fmt(diferencia)}
         </span>
       </div>
       <div className="tc-cierre-msg">
         {severidad === 'verde'    && '✅ Dentro del rango aceptable. Cierre directo.'}
         {severidad === 'amarilla' && '⚠ Diferencia moderada. Justificación opcional pero recomendada.'}
         {severidad === 'roja'     && '🚨 Diferencia significativa. Justificación obligatoria.'}
       </div>
     </div>
   )}
   ```

4. **Mostrar textarea de justificación** condicional (visible si severidad ≠ verde):
   ```jsx
   {form.monto !== '' && corteX && severidad !== 'verde' && (
     <>
       <label className="tc-lbl">
         Justificación {severidad === 'roja' && <span style={{ color: '#ef4444' }}>*</span>}
       </label>
       <textarea
         className="tc-input tc-textarea"
         placeholder="Ej: Sobrante por cambio guardado, faltante por descuento autorizado..."
         maxLength={500}
         value={form.justificacion}
         onChange={e => campo('justificacion', e.target.value)}
       />
     </>
   )}
   ```

5. **Modificar `handleCerrarTurno`** para enviar `justificacion` y manejar 400 con mensaje claro:
   ```javascript
   const handleCerrarTurno = async () => {
     if (!form.pin) { toast('Ingresa tu PIN', 'error'); return }
     if (severidad === 'roja' && form.justificacion.trim().length < 10) {
       toast('Justificación obligatoria (mín 10 caracteres)', 'error')
       return
     }
     setCargando(true)
     try {
       await api.adminCerrarTurno(auth.token, {
         turnoId:         turno.id,
         pin:             form.pin,
         efectivoContado: parseFloat(form.monto) || 0,
         notas:           form.notas || null,
         justificacion:   form.justificacion?.trim() || null,
       })
       setTurno(null)
       setCorteX(null)
       setModalCerrar(false)
       toast(severidad === 'verde'
         ? 'Turno cerrado correctamente'
         : 'Turno cerrado. Incidente registrado en histórico.')
     } catch (e) {
       toast(e.message || 'Error al cerrar turno', 'error')
     } finally {
       setCargando(false)
     }
   }
   ```

6. **Deshabilitar el botón "Cerrar Turno" del modal** cuando severidad=roja y justificación insuficiente. El componente `Modal` recibe `onAccion` y `accionLabel`. Usar prop nueva `accionDeshabilitada`:

   Si `Modal.jsx` ya soporta deshabilitar el botón de acción (revisar), úsalo. Si no, agregar la prop.

### 4.3 CSS del modal en `TurnoCajaScreen.css`

Agregar al final:

```css
/* ═══════════════════════════════════════
   PROMPT C.3 — Cierre asistido (banner severidad)
   ═══════════════════════════════════════ */
.tc-cierre-banner {
  border: 1px solid;
  border-radius: 6px;
  padding: 10px 14px;
  margin: 4px 0 8px;
}
.tc-cierre-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.tc-cierre-lbl {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}
.tc-cierre-monto {
  font-size: 1.2rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}
.tc-cierre-msg {
  font-size: 0.78rem;
  margin-top: 4px;
}

.tc-cierre-verde    {
  border-color: #16a34a;
  background: #0a3a2a;
  color: #6ee7b7;
}
.tc-cierre-amarilla {
  border-color: #fbbf24;
  background: #1a1500;
  color: #fbbf24;
}
.tc-cierre-roja     {
  border-color: #dc2626;
  background: #2a0808;
  color: #fca5a5;
  animation: tcCierrePulse 1.6s ease-in-out infinite;
}

@keyframes tcCierrePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.45); }
  50%      { box-shadow: 0 0 0 4px rgba(220, 38, 38, 0); }
}
```

### 4.4 Tab nuevo "Incidentes" en `CortesCajaScreen.jsx`

Archivo: `F:\BarAvenida\BarAvenida.Admin\src\screens\CortesCajaScreen.jsx`

Cambios:

1. Agregar `'incidentes'` a la lista de tabs válidos (probablemente está como prop `tab` con valores `'x'|'z'|'historico'`).
2. Si `tab === 'incidentes'`, render una nueva sección `<IncidentesTab>` con:
   - Selector de rango: últimos 7 / 30 días / personalizado (date pickers)
   - Tabla: Fecha, Turno, Corte, Tipo (Sobrante/Faltante), Severidad (badge), Diferencia, Esperado, Contado, Justificación (truncada+tooltip), Autorizado por
   - Paginación inferior (botones « ‹ N de M › »)
   - Estado vacío "Sin incidentes en el rango seleccionado ✅"
3. Implementar el componente `IncidentesTab` dentro del mismo archivo (o nuevo si conviene).
4. Llamar `api.adminGetIncidentes(auth.token, { desde, hasta, page, pageSize: 50 })` y manejar paginación.

Estilo: usar mismas clases de la pantalla actual (`.cc-tabla`, etc.) o agregar específicas con prefijo `.cci-` para "Cortes Caja Incidentes".

Badges de severidad:
- Verde: fondo `#0a3a2a`, color `#6ee7b7`
- Amarilla: fondo `#1a1500`, color `#fbbf24`
- Roja: fondo `#2a0808`, color `#fca5a5`

### 4.5 Item en TopMenuBar

En `F:\BarAvenida\BarAvenida.Admin\src\components\TopMenuBar.jsx`, dentro del menú **CAJA** agregar (al final de la lista, antes del último item placeholder):

```javascript
{ label: 'Histórico de incidentes', screen: 'caja-incidentes' },
```

### 4.6 Ruta en `App.jsx`

En `F:\BarAvenida\BarAvenida.Admin\src\App.jsx`, agregar case nuevo:

```jsx
case 'caja-incidentes':
  return <CortesCajaScreen
            key="incidentes"
            auth={auth}
            tab="incidentes"
            onVolver={() => irPantalla('dashboard', 'Dashboard')} />
```

## 5. Criterios de aceptación

### Backend
- [ ] Migración `IncidentesCaja` aplicada limpio (`dotnet ef database update` sin errores).
- [ ] Tabla nueva `IncidentesCaja` con FKs `OnDelete(NoAction)`.
- [ ] `cerrar-turno` calcula severidad y la usa para validar justificación.
- [ ] Si severidad=Roja y `justificacion` < 10 chars → HTTP 400 con `mensaje, severidad, diferencia`.
- [ ] Si `Diferencia != 0` → se crea registro en `IncidentesCaja`.
- [ ] `GET /api/Caja/incidentes?desde&hasta&page&pageSize` funciona con paginación.
- [ ] **Build backend en 0/0** (con `Remove-Item bin, obj` previo si hace falta).

### Frontend
- [ ] Modal "Cerrar Turno" muestra banner verde/amarillo/rojo según severidad.
- [ ] Severidad roja muestra textarea OBLIGATORIO con asterisco.
- [ ] Botón "Cerrar Turno" del modal deshabilitado si rojo y justificación insuficiente.
- [ ] Al cerrar con éxito, toast adecuado (verde: "correctamente"; amarillo/rojo: "Incidente registrado").
- [ ] Tab "Incidentes" accesible desde `Caja → Histórico de incidentes`.
- [ ] Tabla muestra los 9 campos correctos con paginación.
- [ ] Filtro de fecha funciona.
- [ ] **Build admin en 0/0**.

## 6. Pruebas manuales (después de implementar)

1. **Cierre VERDE:** abrir turno con $1,000 → cobrar $500 efectivo → contar exactamente $1,490 → diferencia $-10 → banner verde → cerrar sin justificación. Resultado: turno cerrado, incidente creado tipo "Faltante" severidad "Verde".

2. **Cierre AMARILLO:** abrir turno con $1,000 → contar $920 → diferencia $-80 → banner amarillo → cerrar (con o sin justificación). Resultado: turno cerrado, incidente creado severidad "Amarilla".

3. **Cierre ROJO sin justificación:** abrir turno con $1,000 → contar $700 → diferencia $-300 → banner rojo pulsante → botón "Cerrar Turno" deshabilitado → escribir 5 caracteres → sigue deshabilitado → escribir "perdido en cambio mal hecho" (>10 chars) → habilitado → cerrar. Resultado: turno cerrado, incidente con justificación.

4. **Cierre ROJO bypass:** intentar via Swagger/Postman llamar `cerrar-turno` con diferencia >$200 sin justificación → HTTP 400.

5. **Tab Incidentes:** entrar → ver los 3 incidentes creados → filtrar "Últimos 7 días" → ver paginación.

## 7. Reglas de oro

- **NO** instalar librerías nuevas (React 19, .NET 8 ya tienen todo).
- **NO** ejecutar `dotnet run` ni `npm run dev` desde Claude Code — solo `dotnet build`, `npm run build`, y `dotnet ef migrations add` / `database update`.
- Antes de modificar el backend: `taskkill /F /IM BarAvenida.API.exe /T`.
- Si el build de backend truena con `MSB4018` JsonException 0x00 → `Remove-Item -Recurse -Force bin, obj` y volver a buildear (cache corrupto del SDK 10.x).
- Builds finales en **0 errors, 0 warnings**.
- Conservar archivos JSX/CSS aunque queden sin uso.
- Cuando termines, reportar a Coronado:
  - Lista de archivos modificados/creados
  - Resultado de los builds (backend + admin)
  - Resultado de la migración EF
  - Cualquier decisión de diseño que tomaste (ej: si `Modal.jsx` ya soportaba deshabilitar botón o tuviste que extenderlo).

## 8. Archivos esperados (resumen)

| Archivo | Acción | Aprox |
|---|---|---|
| `Models/IncidenteCaja.cs` | NUEVO | ~30 líneas |
| `Data/BarAvenidaDbContext.cs` | Modificar | +20 líneas |
| `Migrations/*_IncidentesCaja.{cs,Designer.cs}` | NUEVOS auto-generados | ~50 |
| `DTOs/CajaDtos.cs` | Modificar (+2 DTOs nuevos +1 campo) | +35 |
| `Controllers/CajaController.cs` | Modificar (lógica severidad + endpoint nuevo) | +80 |
| `BarAvenida.Admin/src/api.js` | Modificar (1 método) | +10 |
| `BarAvenida.Admin/src/screens/TurnoCajaScreen.jsx` | Modificar | +50 |
| `BarAvenida.Admin/src/screens/TurnoCajaScreen.css` | Modificar | +50 |
| `BarAvenida.Admin/src/screens/CortesCajaScreen.jsx` | Modificar (tab nuevo) | +120 |
| `BarAvenida.Admin/src/screens/CortesCajaScreen.css` | Modificar | +50 |
| `BarAvenida.Admin/src/components/TopMenuBar.jsx` | Modificar (1 item) | +1 |
| `BarAvenida.Admin/src/App.jsx` | Modificar (1 case) | +3 |

**Total esperado: ~500 líneas, 1 modelo nuevo, 1 migración, 0 librerías nuevas.**
