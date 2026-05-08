# SPEC D — Dashboard Vivo (KPIs en tiempo real)

> **Estado:** SPEC FINAL — listo para Claude Code
> **Fecha:** Mayo 7, 2026
> **Autor:** Cowork
> **CON backend nuevo, sin migración EF, sin librerías nuevas (recharts ya disponible)**
> **Sesión estimada:** 3-4h Claude Code

---

## 1. Objetivo

El `DashboardScreen` actual tiene KPIs operacionales (mesas + cuentas abiertas
+ COBRAR). Es la pantalla de operación diaria del admin. Está bien y NO se
toca.

Crear una **pantalla nueva** `DashboardLiveScreen` (separada) enfocada en
**métricas analíticas en tiempo real**:
- KPIs principales con **comparativa vs ayer** (delta % con flecha verde/roja)
- **Gráfica de ventas por hora** (LineChart con recharts)
- **Top 5 productos del día** (BarChart horizontal)
- **Top mesera del día**
- **Hora pico** (cuál hora del día tuvo más ventas hasta ahora)

Auto-refresh cada 30 segundos + push via SignalR cuando se cobra cuenta nueva.

## 2. Decisión arquitectónica

**Pantalla nueva, NO refactor del DashboardScreen actual.** Razones:
- DashboardScreen es operacional (cobrar cuentas, gestionar mesas)
- DashboardLive es analítico (entender el bar de un vistazo)
- Conservar = regla de oro
- El admin puede tener AMBAS pantallas en pestañas distintas y navegar entre ellas

Acceso desde nuevo item en menú **REPORTES**: "📊 Dashboard vivo".

## 3. Backend — endpoint nuevo

### 3.1 DTO

`F:\BarAvenida\BarAvenida.API\DTOs\DashboardLiveDto.cs`:

```csharp
namespace BarAvenida.API.DTOs;

public class DashboardLiveDto
{
    public KpiConDeltaDto VentasHoy        { get; set; } = new();
    public KpiConDeltaDto Cuentas          { get; set; } = new();
    public KpiConDeltaDto TicketPromedio   { get; set; } = new();
    public int TotalProductosVendidos      { get; set; }
    public List<VentaPorHoraDto> VentasPorHora { get; set; } = new();
    public List<TopProductoDto> TopProductos { get; set; } = new();
    public string? MeseraTopNombre         { get; set; }
    public decimal MeseraTopVentas         { get; set; }
    public int? HoraPico                   { get; set; } // 0-23
    public decimal HoraPicoVentas          { get; set; }
    public DateTime FechaCalculo           { get; set; } = DateTime.Now;
}

public class KpiConDeltaDto
{
    public decimal Hoy   { get; set; }
    public decimal Ayer  { get; set; }
    public decimal Delta { get; set; } // porcentaje, ej: 12.5 = +12.5%
}

public class VentaPorHoraDto
{
    public int Hora        { get; set; }   // 0-23
    public decimal Ventas  { get; set; }
    public int Cuentas     { get; set; }
}

public class TopProductoDto
{
    public int    ProductoId { get; set; }
    public string Nombre     { get; set; } = "";
    public int    Cantidad   { get; set; }
    public decimal Total     { get; set; }
}
```

### 3.2 Endpoint

Crear `F:\BarAvenida\BarAvenida.API\Controllers\DashboardLiveController.cs`:

```csharp
using BarAvenida.API.Data;
using BarAvenida.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BarAvenida.API.Controllers;

[ApiController]
[Route("api/admin/dashboard")]
[Authorize(Roles = "Admin")]
public class DashboardLiveController : ControllerBase
{
    private readonly BarAvenidaDbContext _db;

    public DashboardLiveController(BarAvenidaDbContext db) => _db = db;

    [HttpGet("live")]
    public async Task<IActionResult> Live()
    {
        var ahora = DateTime.Now;
        var hoyDesde   = ahora.Date;
        var hoyHasta   = hoyDesde.AddDays(1);
        var ayerDesde  = hoyDesde.AddDays(-1);
        var ayerHasta  = hoyDesde;

        // 1. Cuentas cobradas hoy y ayer
        var cuentasHoy = await _db.Cuentas
            .Where(c => c.Estado == "Cobrada"
                     && c.FechaCierre != null
                     && c.FechaCierre >= hoyDesde
                     && c.FechaCierre <  hoyHasta)
            .Select(c => new { c.Id, c.Total, c.MeseraId, c.FechaCierre, c.Ordenes })
            .ToListAsync();

        var cuentasAyer = await _db.Cuentas
            .Where(c => c.Estado == "Cobrada"
                     && c.FechaCierre != null
                     && c.FechaCierre >= ayerDesde
                     && c.FechaCierre <  ayerHasta)
            .Select(c => new { c.Id, c.Total })
            .ToListAsync();

        decimal ventasHoy   = cuentasHoy.Sum(c => c.Total);
        decimal ventasAyer  = cuentasAyer.Sum(c => c.Total);
        int countHoy        = cuentasHoy.Count;
        int countAyer       = cuentasAyer.Count;
        decimal ticketHoy   = countHoy  > 0 ? ventasHoy  / countHoy  : 0;
        decimal ticketAyer  = countAyer > 0 ? ventasAyer / countAyer : 0;

        decimal Delta(decimal hoy, decimal ayer) {
            if (ayer == 0) return hoy > 0 ? 100m : 0m;
            return Math.Round(((hoy - ayer) / ayer) * 100m, 1);
        }

        // 2. Ventas por hora (solo hoy, 0-23)
        var ventasPorHora = Enumerable.Range(0, 24).Select(h => new VentaPorHoraDto {
            Hora    = h,
            Ventas  = 0,
            Cuentas = 0,
        }).ToList();

        foreach (var c in cuentasHoy)
        {
            var hora = c.FechaCierre!.Value.Hour;
            var slot = ventasPorHora[hora];
            slot.Ventas  += c.Total;
            slot.Cuentas += 1;
        }

        // 3. Top productos del día (de OrdenDetalle de cuentas cobradas hoy)
        var cuentasIds = cuentasHoy.Select(c => c.Id).ToList();
        var detallesHoy = await _db.OrdenDetalles
            .Include(d => d.Producto)
            .Include(d => d.Orden)
            .Where(d => d.Orden != null
                     && cuentasIds.Contains(d.Orden.CuentaId))
            .ToListAsync();

        var topProductos = detallesHoy
            .GroupBy(d => new { d.ProductoId, Nombre = d.Producto != null ? d.Producto.Nombre : "?" })
            .Select(g => new TopProductoDto {
                ProductoId = g.Key.ProductoId,
                Nombre     = g.Key.Nombre,
                Cantidad   = g.Sum(x => x.Cantidad),
                Total      = g.Sum(x => x.Cantidad * x.PrecioUnitario),
            })
            .OrderByDescending(p => p.Cantidad)
            .Take(5)
            .ToList();

        int totalProductosVendidos = detallesHoy.Sum(d => d.Cantidad);

        // 4. Mesera top del día
        var ventasPorMesera = cuentasHoy
            .GroupBy(c => c.MeseraId)
            .Select(g => new { MeseraId = g.Key, Total = g.Sum(c => c.Total) })
            .OrderByDescending(x => x.Total)
            .FirstOrDefault();

        string? meseraTopNombre = null;
        decimal meseraTopVentas = 0;
        if (ventasPorMesera != null)
        {
            var mesera = await _db.Usuarios.FindAsync(ventasPorMesera.MeseraId);
            meseraTopNombre = mesera?.Nombre;
            meseraTopVentas = ventasPorMesera.Total;
        }

        // 5. Hora pico
        var horaPico = ventasPorHora.OrderByDescending(h => h.Ventas).FirstOrDefault();

        return Ok(new DashboardLiveDto {
            VentasHoy = new KpiConDeltaDto {
                Hoy   = ventasHoy,
                Ayer  = ventasAyer,
                Delta = Delta(ventasHoy, ventasAyer),
            },
            Cuentas = new KpiConDeltaDto {
                Hoy   = countHoy,
                Ayer  = countAyer,
                Delta = Delta(countHoy, countAyer),
            },
            TicketPromedio = new KpiConDeltaDto {
                Hoy   = ticketHoy,
                Ayer  = ticketAyer,
                Delta = Delta(ticketHoy, ticketAyer),
            },
            TotalProductosVendidos = totalProductosVendidos,
            VentasPorHora          = ventasPorHora,
            TopProductos           = topProductos,
            MeseraTopNombre        = meseraTopNombre,
            MeseraTopVentas        = meseraTopVentas,
            HoraPico               = horaPico?.Hora,
            HoraPicoVentas         = horaPico?.Ventas ?? 0,
        });
    }
}
```

## 4. Frontend Admin

### 4.1 `api.js`

Agregar:
```javascript
adminGetDashboardLive: (t) => req('/api/admin/dashboard/live', {}, t),
```

### 4.2 Pantalla nueva: `DashboardLiveScreen.jsx`

`F:\BarAvenida\BarAvenida.Admin\src\screens\DashboardLiveScreen.jsx`:

Layout (responsive grid):

```
┌─────────────────────────────────────────────────────────┐
│ ◀ VOLVER  📊 DASHBOARD VIVO  · Última actualización: 04:32  ↻
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  │ Ventas  │ │ Cuentas │ │ Ticket  │ │Productos│
│  │ HOY     │ │ HOY     │ │ Promedio│ │vendidos │
│  │ $1,250  │ │   8     │ │  $156   │ │   23    │
│  │ ▲+12.5% │ │ ▲+33%   │ │ ▼-5%    │ │  hoy    │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐ ┌──────────────────────┐  │
│  │  📈 VENTAS POR HORA      │ │  🏆 TOP 5 PRODUCTOS  │  │
│  │                          │ │  ━━━━━━━━━━━━━ Corona│  │
│  │  [LineChart 24h]         │ │  ━━━━━━━━━━ Tequila  │  │
│  │                          │ │  ━━━━━━━━ Indio       │  │
│  │                          │ │  ━━━━━ Cacahuates    │  │
│  │                          │ │  ━━ Limón            │  │
│  └──────────────────────────┘ └──────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  🥇 Mesera top: ABBY GZZ    ⏰ Hora pico: 9pm ($420)    │
└─────────────────────────────────────────────────────────┘
```

Pseudocódigo del componente:

```javascript
import { useState, useEffect, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'
import { api, API_URL } from '../api'
import './DashboardLiveScreen.css'

const fmt    = (n) => `$${Number(n ?? 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
const fmtDec = (n) => `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function DashboardLiveScreen({ auth, onVolver }) {
  const [data, setData]       = useState(null)
  const [error, setError]     = useState(null)
  const [updating, setUpdating] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const connRef = useRef(null)

  const cargar = useCallback(async () => {
    setUpdating(true)
    try {
      const d = await api.adminGetDashboardLive(auth.token)
      setData(d)
      setLastUpdate(new Date())
      setError(null)
    } catch (e) {
      setError(e.message || 'Error al cargar dashboard')
    } finally {
      setUpdating(false)
    }
  }, [auth.token])

  useEffect(() => { cargar() }, [cargar])

  // Auto-refresh cada 30s
  useEffect(() => {
    const id = setInterval(cargar, 30_000)
    return () => clearInterval(id)
  }, [cargar])

  // SignalR: refrescar cuando se cobra una cuenta
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/barhub`, { accessTokenFactory: () => auth.token })
      .withAutomaticReconnect([0, 2000, 5000, 15000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('CuentaCobrada', () => cargar())

    conn.start()
      .then(() => conn.invoke('UnirseAGrupo', 'Admin').catch(() => {}))
      .catch(e => console.warn('SignalR DashLive:', e.message))

    connRef.current = conn
    return () => conn.stop()
  }, [auth.token, cargar])

  if (!data && !error) {
    return <div className="dl-loading">Cargando dashboard…</div>
  }

  return (
    <div className="dl-root">

      <header className="dl-header">
        <button className="dl-volver" onClick={onVolver}>◀ VOLVER</button>
        <h1 className="dl-titulo">📊 DASHBOARD VIVO</h1>
        <div className="dl-update">
          {lastUpdate && (
            <span className="dl-update-time">
              Última: {lastUpdate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            className={`dl-refresh ${updating ? 'spinning' : ''}`}
            onClick={cargar}
            disabled={updating}
            title="Refrescar"
          >↻</button>
        </div>
      </header>

      {error && <div className="dl-error">⚠ {error}</div>}

      {data && (
        <>
          {/* KPIs con delta */}
          <section className="dl-kpis">
            <KpiCard
              label="VENTAS HOY"
              valueRaw={data.ventasHoy.hoy}
              valueFmt={fmt}
              delta={data.ventasHoy.delta}
              icon="💰"
              color="gold"
            />
            <KpiCard
              label="CUENTAS HOY"
              valueRaw={data.cuentas.hoy}
              valueFmt={(n) => Math.round(n)}
              delta={data.cuentas.delta}
              icon="🍺"
              color="red"
            />
            <KpiCard
              label="TICKET PROMEDIO"
              valueRaw={data.ticketPromedio.hoy}
              valueFmt={fmt}
              delta={data.ticketPromedio.delta}
              icon="🎯"
              color="blue"
            />
            <div className="dl-kpi dl-kpi-green">
              <span className="dl-kpi-icon">📦</span>
              <span className="dl-kpi-value">{data.totalProductosVendidos}</span>
              <span className="dl-kpi-label">PRODUCTOS HOY</span>
            </div>
          </section>

          {/* Gráficas */}
          <section className="dl-charts">
            <div className="dl-chart-box">
              <h3 className="dl-chart-titulo">📈 VENTAS POR HORA</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.ventasPorHora}>
                  <XAxis
                    dataKey="hora"
                    stroke="#666"
                    tickFormatter={(h) => `${h}h`}
                  />
                  <YAxis stroke="#666" tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ background: '#0a0a0a', border: '1px solid #f0c842' }}
                    formatter={(v) => fmtDec(v)}
                    labelFormatter={(h) => `${h}:00`}
                  />
                  <Line
                    type="monotone"
                    dataKey="ventas"
                    stroke="#f0c842"
                    strokeWidth={2}
                    dot={{ fill: '#f0c842', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="dl-chart-box">
              <h3 className="dl-chart-titulo">🏆 TOP 5 PRODUCTOS</h3>
              {data.topProductos.length === 0 ? (
                <div className="dl-chart-vacio">Sin ventas hoy</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={data.topProductos}
                    layout="vertical"
                    margin={{ top: 5, right: 10, left: 80, bottom: 5 }}
                  >
                    <XAxis type="number" stroke="#666" />
                    <YAxis type="category" dataKey="nombre" stroke="#ddd" width={100} />
                    <Tooltip
                      contentStyle={{ background: '#0a0a0a', border: '1px solid #f0c842' }}
                      formatter={(v, k) => k === 'cantidad' ? `${v} pzs` : fmt(v)}
                    />
                    <Bar dataKey="cantidad" fill="#f0c842">
                      {data.topProductos.map((_, i) => (
                        <Cell key={i} fill={['#f0c842','#d4a017','#a0820d','#7a6109','#544209'][i] || '#f0c842'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* Footer info */}
          <section className="dl-footer">
            <div className="dl-foot-item">
              <span className="dl-foot-icon">🥇</span>
              <div>
                <span className="dl-foot-label">MESERA TOP</span>
                <span className="dl-foot-val">
                  {data.meseraTopNombre ?? '—'}
                  {data.meseraTopVentas > 0 && ` · ${fmt(data.meseraTopVentas)}`}
                </span>
              </div>
            </div>
            <div className="dl-foot-item">
              <span className="dl-foot-icon">⏰</span>
              <div>
                <span className="dl-foot-label">HORA PICO</span>
                <span className="dl-foot-val">
                  {data.horaPico !== null && data.horaPico !== undefined
                    ? `${data.horaPico}:00 · ${fmt(data.horaPicoVentas)}`
                    : '—'}
                </span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function KpiCard({ label, valueRaw, valueFmt, delta, icon, color }) {
  const flecha = delta > 0 ? '▲' : delta < 0 ? '▼' : '▬'
  const deltaClass = delta > 0 ? 'kpi-delta-up' : delta < 0 ? 'kpi-delta-down' : 'kpi-delta-flat'
  return (
    <div className={`dl-kpi dl-kpi-${color}`}>
      <span className="dl-kpi-icon">{icon}</span>
      <span className="dl-kpi-value">{valueFmt(valueRaw)}</span>
      <span className="dl-kpi-label">{label}</span>
      <span className={`dl-kpi-delta ${deltaClass}`}>
        {flecha} {Math.abs(delta).toFixed(1)}%
      </span>
    </div>
  )
}
```

### 4.3 CSS

`F:\BarAvenida\BarAvenida.Admin\src\screens\DashboardLiveScreen.css`:

Tema dorado/negro consistente. Estructura:
- `.dl-root` — flex column, fondo #0a0a0a
- `.dl-header` — top bar con VOLVER + título + reloj + refresh
- `.dl-kpis` — grid 4 columnas
- `.dl-kpi` — card con gradient sutil, hover effect
- `.dl-kpi-delta` — pill con flecha:
  - `.kpi-delta-up` verde
  - `.kpi-delta-down` rojo
  - `.kpi-delta-flat` gris
- `.dl-charts` — grid 2 columnas
- `.dl-chart-box` — fondo #111, borde dorado, padding
- `.dl-footer` — flex row con 2 items grandes

(Detalles de colores los puedes inferir del DashboardScreen actual; usa las mismas variables de gold/red/blue/green.)

### 4.4 Item en TopMenuBar

En menú **REPORTES**, agregar al inicio:

```javascript
{ label: '📊 Dashboard vivo',  screen: 'rep-dashboard-live' },
```

### 4.5 Ruta en App.jsx

```jsx
case 'rep-dashboard-live':
  return <DashboardLiveScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
```

(Y el import correspondiente.)

## 5. Criterios de aceptación

### Backend
- [ ] `GET /api/admin/dashboard/live` retorna `DashboardLiveDto` completo.
- [ ] Cálculo de delta correcto (positivo, negativo, cero division handled).
- [ ] Top productos ordenado por cantidad descendente, máximo 5.
- [ ] Ventas por hora con 24 buckets (0-23, ceros si no hubo ventas).
- [ ] Mesera top calculada correctamente.
- [ ] **Build backend en 0/0**.

### Frontend
- [ ] Pantalla `DashboardLiveScreen` accesible desde Reportes → "📊 Dashboard vivo".
- [ ] 4 KPI cards con delta % + flecha verde/roja.
- [ ] LineChart de ventas por hora con tooltip.
- [ ] BarChart horizontal de top 5 productos.
- [ ] Footer con mesera top + hora pico.
- [ ] Botón refresh manual + auto-refresh 30s.
- [ ] SignalR `CuentaCobrada` dispara recarga inmediata.
- [ ] **Build admin en 0/0**.

## 6. Pruebas manuales

1. Ir a Reportes → Dashboard vivo.
2. Ver KPIs, gráficas, footer.
3. Si no hay ventas hoy: KPIs en 0, deltas en 0%, gráficas vacías con mensaje.
4. Cobrar una cuenta nueva (desde DashboardScreen): el dashboard live debe actualizar en <2s vía SignalR.

## 7. Reglas de oro

- **NO** instalar librerías nuevas (recharts ya está).
- **NO** ejecutar dotnet run / npm run dev.
- **NO** modificar `DashboardScreen.jsx` actual (regla de oro: conservar).
- Builds finales en **0/0**.
- Reportar archivos modificados, builds, decisiones.

## 8. Archivos esperados

| Archivo | Acción | Aprox |
|---|---|---|
| `Controllers/DashboardLiveController.cs` | NUEVO | ~140 líneas |
| `DTOs/DashboardLiveDto.cs` | NUEVO | ~45 |
| `BarAvenida.Admin/src/api.js` | Modificar | +1 |
| `BarAvenida.Admin/src/screens/DashboardLiveScreen.jsx` | NUEVO | ~250 |
| `BarAvenida.Admin/src/screens/DashboardLiveScreen.css` | NUEVO | ~200 |
| `BarAvenida.Admin/src/components/TopMenuBar.jsx` | Modificar (+1 item) | +1 |
| `BarAvenida.Admin/src/App.jsx` | Modificar (+1 case + import) | +3 |

**Total: ~640 líneas, 4 archivos nuevos, sin migración EF, sin librerías nuevas.**
