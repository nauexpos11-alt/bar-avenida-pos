# SPEC C.2 — Alertas activas en tiempo real

> **Tipo:** Sub-spec implementable de PROMPT C
> **Sesión estimada:** 3h Claude Code
> **Sin migración EF**, sin librerías nuevas
> **Pre-requisito:** spec maestro `c_caja_inteligente.md` aprobado, idealmente C.1 ya implementado

---

## 1. Objetivo

Detección proactiva de situaciones que requieren atención del admin durante un
turno activo, con notificación visual no intrusiva. Tres tipos de alertas:

1. **Cajón con mucho efectivo** (>$5,000 sin retirar) → sugerir retiro
2. **Tiempo sin corte X** (>4h) → sugerir corte parcial
3. **Anomalía detectada** (ej: cobro mayor al ticket promedio del bar × 5) → revisar

## 2. Decisión de arquitectura

**Detección desde el backend, push via SignalR**, NO polling desde el frontend.
Razón: el backend tiene la información autoritativa (fechas reales, totales).
Si el frontend hiciera polling cada 30s, generaría tráfico innecesario y daría
inconsistencias. SignalR ya está montado, lo aprovechamos.

## 3. Backend

### Settings

Reusar la sección `Caja:Umbrales` del `appsettings.json` (ver spec maestro):
```json
"Caja": {
  "Umbrales": {
    "CajonMaximoEfectivo": 5000,
    "HorasSinCorteX": 4
  }
}
```

Agregar a `CajaSettings.cs`:
```csharp
public class CajaSettings
{
    public FondoSugeridoSettings FondoSugerido { get; set; } = new();
    public UmbralesSettings      Umbrales      { get; set; } = new();
}

public class UmbralesSettings
{
    public decimal CajonMaximoEfectivo { get; set; } = 5000;
    public int     HorasSinCorteX      { get; set; } = 4;
}
```

### DTO de evento SignalR

`BarAvenida.API/DTOs/AlertaCajaDto.cs`:
```csharp
namespace BarAvenida.API.DTOs;

public class AlertaCajaDto
{
    public string Tipo            { get; set; } = ""; // "EfectivoExcesivo" | "TiempoSinCorteX" | "Anomalia"
    public string Severidad       { get; set; } = ""; // "Amarilla" | "Roja"
    public string Mensaje         { get; set; } = "";
    public string? AccionSugerida { get; set; }       // "Hacer retiro" | "Iniciar corte X"
    public string? AccionScreen   { get; set; }       // 'caja-retiros' | 'caja-corte-x' | null
    public DateTime FechaDeteccion { get; set; } = DateTime.Now;
    public string Id              { get; set; } = Guid.NewGuid().ToString(); // para deduplicación frontend
}
```

### Service: DetectorAlertasCaja

Crear `BarAvenida.API/Services/DetectorAlertasCaja.cs` como `BackgroundService`:

```csharp
using BarAvenida.API.Data;
using BarAvenida.API.DTOs;
using BarAvenida.API.Hubs;
using BarAvenida.API.Settings;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BarAvenida.API.Services;

public class DetectorAlertasCaja : BackgroundService
{
    private readonly IServiceProvider     _sp;
    private readonly IHubContext<BarHub>  _hub;
    private readonly UmbralesSettings     _umbrales;
    private readonly TimeSpan             _intervalo = TimeSpan.FromMinutes(1);
    private readonly HashSet<string>      _alertasYaEmitidas = new();

    public DetectorAlertasCaja(
        IServiceProvider sp,
        IHubContext<BarHub> hub,
        IOptions<CajaSettings> opts)
    {
        _sp       = sp;
        _hub      = hub;
        _umbrales = opts.Value.Umbrales;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested) {
            try { await DetectarAsync(); }
            catch (Exception ex) {
                Console.WriteLine($"[DetectorAlertasCaja] Error: {ex.Message}");
            }
            await Task.Delay(_intervalo, stoppingToken);
        }
    }

    private async Task DetectarAsync()
    {
        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BarAvenidaDbContext>();

        // 1. Turno activo
        var turno = await db.Turnos
            .Where(t => t.FechaCierre == null)
            .OrderByDescending(t => t.FechaApertura)
            .FirstOrDefaultAsync();

        if (turno == null) {
            _alertasYaEmitidas.Clear(); // limpiar si no hay turno
            return;
        }

        // 2. Calcular efectivo en cajón (fondo + ventas efectivo - retiros)
        var ventasEfectivo = await db.Cobros
            .Where(c => c.TurnoId == turno.Id && c.MetodoPago == "Efectivo")
            .SumAsync(c => (decimal?)c.MontoEfectivo) ?? 0;

        var retiros = await db.Retiros
            .Where(r => r.TurnoId == turno.Id)
            .SumAsync(r => (decimal?)r.Monto) ?? 0;

        var efectivoEnCajon = turno.FondoInicial + ventasEfectivo - retiros;

        // 3. Detectar EfectivoExcesivo
        if (efectivoEnCajon > _umbrales.CajonMaximoEfectivo) {
            var key = $"efectivo-{turno.Id}";
            if (!_alertasYaEmitidas.Contains(key)) {
                await EmitirAlerta(new AlertaCajaDto {
                    Tipo            = "EfectivoExcesivo",
                    Severidad       = "Amarilla",
                    Mensaje         = $"Cajón con ${efectivoEnCajon:N0} en efectivo. " +
                                      $"Umbral: ${_umbrales.CajonMaximoEfectivo:N0}",
                    AccionSugerida  = "Hacer retiro",
                    AccionScreen    = "caja-retiros",
                });
                _alertasYaEmitidas.Add(key);
            }
        } else {
            _alertasYaEmitidas.Remove($"efectivo-{turno.Id}");
        }

        // 4. Detectar TiempoSinCorteX
        var ultimoCorteX = await db.Cortes
            .Where(c => c.TurnoId == turno.Id && c.Tipo == "X")
            .OrderByDescending(c => c.FechaRegistro)
            .FirstOrDefaultAsync();

        var horasDesdeUltimoCorte = ultimoCorteX != null
            ? (DateTime.Now - ultimoCorteX.FechaRegistro).TotalHours
            : (DateTime.Now - turno.FechaApertura).TotalHours;

        if (horasDesdeUltimoCorte > _umbrales.HorasSinCorteX) {
            var key = $"corte-{turno.Id}-{(int)horasDesdeUltimoCorte}";
            if (!_alertasYaEmitidas.Any(k => k.StartsWith($"corte-{turno.Id}"))) {
                await EmitirAlerta(new AlertaCajaDto {
                    Tipo            = "TiempoSinCorteX",
                    Severidad       = "Amarilla",
                    Mensaje         = $"{(int)horasDesdeUltimoCorte}h sin Corte X. " +
                                      $"Recomendado cada {_umbrales.HorasSinCorteX}h.",
                    AccionSugerida  = "Iniciar corte X",
                    AccionScreen    = "caja-corte-x",
                });
                _alertasYaEmitidas.Add(key);
            }
        }
    }

    private async Task EmitirAlerta(AlertaCajaDto alerta)
    {
        await _hub.Clients.Group("Admin").SendAsync("AlertaCaja", alerta);
    }
}
```

Registrar en `Program.cs`:
```csharp
builder.Services.AddHostedService<DetectorAlertasCaja>();
```

### Endpoint para descartar alertas

Agregar a `CajaController.cs`:
```csharp
// POST /api/Caja/alertas/descartar/{id}
// Notifica al detector que esta alerta ya fue vista (frontend la maneja en memoria)
[HttpPost("alertas/descartar")]
public IActionResult DescartarAlerta() => Ok();
```

(Por simplicidad, la persistencia de "ya vista" la maneja el frontend en memoria. Si se recarga, las alertas vuelven a aparecer; eso es OK porque la situación que las disparó probablemente sigue.)

## 4. Frontend (Admin)

### TopMenuBar.jsx

Agregar estado:
```javascript
const [alertas, setAlertas] = useState([])
const [drawerOpen, setDrawerOpen] = useState(false)
```

En el useEffect de SignalR (ya existe del badge B3):
```javascript
conn.on('AlertaCaja', (alerta) => {
  setAlertas(prev => {
    if (prev.some(a => a.id === alerta.id)) return prev
    return [alerta, ...prev]
  })
})
```

Agregar botón con badge amarillo a la derecha de VENTAS (o donde quepa visualmente):
```jsx
{alertas.length > 0 && (
  <button
    className="tmb-alerta-btn"
    onClick={() => setDrawerOpen(true)}
    title={`${alertas.length} alerta${alertas.length !== 1 ? 's' : ''} de caja`}
  >
    ⚠
    <span className="tmb-alerta-badge">{alertas.length}</span>
  </button>
)}
```

### Componente nuevo: AlertasDrawer.jsx

`BarAvenida.Admin/src/components/AlertasDrawer.jsx` — drawer lateral derecho:

```jsx
export default function AlertasDrawer({ alertas, onClose, onIrPantalla, onDescartar }) {
  return (
    <div className="ad-overlay" onClick={onClose}>
      <aside className="ad-drawer" onClick={e => e.stopPropagation()}>
        <header className="ad-header">
          <h2>⚠ ALERTAS DE CAJA</h2>
          <button className="ad-close" onClick={onClose}>✕</button>
        </header>
        <div className="ad-body">
          {alertas.length === 0 ? (
            <div className="ad-vacio">✅ Sin alertas activas</div>
          ) : alertas.map(a => (
            <div key={a.id} className={`ad-card ad-${a.severidad.toLowerCase()}`}>
              <div className="ad-tipo">{tituloTipo(a.tipo)}</div>
              <div className="ad-msg">{a.mensaje}</div>
              <div className="ad-acciones">
                <button className="ad-btn-descartar" onClick={() => onDescartar(a.id)}>
                  Descartar
                </button>
                {a.accionScreen && (
                  <button
                    className="ad-btn-accion"
                    onClick={() => { onIrPantalla(a.accionScreen); onClose() }}
                  >
                    {a.accionSugerida} →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

function tituloTipo(t) {
  switch(t) {
    case 'EfectivoExcesivo':  return '💵 Efectivo en cajón'
    case 'TiempoSinCorteX':   return '⏱ Tiempo sin corte'
    case 'Anomalia':          return '🔍 Anomalía detectada'
    default:                  return '⚠ Alerta'
  }
}
```

### CSS

`AlertasDrawer.css`:
- Drawer: posición fija, derecha, ancho 380px, fondo `#0a0a0a`, borde izq dorado `#a0820d`
- Card amarilla: borde `#fbbf24`, gradient suave amarillo-negro
- Card roja: borde `#dc2626`, gradient rojo-negro
- Botones: dorado (acción) y gris (descartar), 40px alto

## 5. Criterios de aceptación

- [ ] `DetectorAlertasCaja` corre cada minuto sin errores en logs.
- [ ] Cuando efectivo en cajón rebasa $5,000, llega evento SignalR al admin.
- [ ] Después de 4h sin Corte X, llega evento SignalR.
- [ ] Badge amarillo aparece en TopMenuBar con contador correcto.
- [ ] Click en badge abre drawer lateral con cards.
- [ ] Botón "Hacer retiro" navega a `caja-retiros`.
- [ ] Botón "Iniciar corte X" navega a `caja-corte-x`.
- [ ] Click en "Descartar" remueve alerta del estado (frontend in-memory).
- [ ] Las alertas NO se duplican (deduplicación por `id`).
- [ ] Build Admin + Backend en **0/0**.

## 6. Pruebas manuales

1. **Efectivo:** Abrir turno con fondo $1,000 → cobrar $4,500 en efectivo a varias cuentas → esperar 1 min → verificar alerta.
2. **Corte X:** Abrir turno → esperar 4h (o cambiar `HorasSinCorteX=0` temporalmente para test) → verificar alerta.
3. **Drawer:** Click en badge → ver cards → click "Hacer retiro" → debe navegar a `RetirosCajaScreen`.

## 7. Archivos modificados

| Archivo | Acción | Líneas aprox |
|---|---|---|
| `appsettings.json` | Modificar (sección Umbrales) | +5 |
| `Settings/CajaSettings.cs` | Modificar (clase Umbrales) | +6 |
| `DTOs/AlertaCajaDto.cs` | NUEVO | ~15 |
| `Services/DetectorAlertasCaja.cs` | NUEVO | ~120 |
| `Controllers/CajaController.cs` | Modificar (endpoint descartar) | +5 |
| `Program.cs` | Modificar (1 línea) | +1 |
| `BarAvenida.Admin/src/components/TopMenuBar.jsx` | Modificar | +30 |
| `BarAvenida.Admin/src/components/TopMenuBar.css` | Modificar | +20 |
| `BarAvenida.Admin/src/components/AlertasDrawer.jsx` | NUEVO | ~80 |
| `BarAvenida.Admin/src/components/AlertasDrawer.css` | NUEVO | ~120 |

**Total: ~400 líneas, 4 archivos nuevos.**
