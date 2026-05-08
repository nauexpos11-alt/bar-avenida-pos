# SPEC E — Reportes interpretativos (Informe del día)

> **Estado:** SPEC FINAL — listo para Claude Code
> **Fecha:** Mayo 7, 2026
> **Autor:** Cowork
> **CON backend nuevo, sin migración EF, sin librerías nuevas**
> **Sesión estimada:** 2.5-3h Claude Code

---

## 1. Objetivo

Pantalla "Informe del día" que el admin abre al cierre (o en cualquier momento) y
ve un reporte **en lenguaje natural** con:

1. **Resumen ejecutivo** — narrativa corta del día
2. **Highlights** — top producto, top mesera, hora pico
3. **Comparativas** — vs ayer y vs misma fecha semana pasada
4. **Anomalías** — incidentes de caja, cancelaciones, mesas inactivas largas
5. **Recomendaciones automáticas** — heurísticas simples sobre data del bar

NO es IA. Son **reglas de negocio** aplicadas a la data. El texto se genera con
plantillas + interpolación de números reales.

## 2. Decisiones tomadas

1. **Pantalla nueva separada**, accesible desde menú REPORTES → "📋 Informe del día".
2. **Endpoint único `GET /api/admin/reportes/informe-dia`** que retorna toda la data + textos pre-generados desde el backend (más fácil de probar, frontend solo renderiza).
3. **Selector de fecha** — admin puede ver el informe de hoy o cualquier día pasado (default: hoy).
4. **Reglas de recomendaciones** (configurables en `appsettings.json` sección `Reportes:Heuristicas`):
   - Producto sin ventas en últimos N días (default 7) → "Considera descontinuar"
   - Mesera con ventas X% sobre el promedio (default 25) → "Top performer"
   - Ticket promedio cae Y% vs semana pasada (default 10) → "Revisar"
   - Hora pico identificada → "Asegurar staff a esa hora"
   - Más de N (default 3) cancelaciones → "Revisar motivos"
5. **Tono mexicano casual** en los textos generados, mismo estilo que CLAUDE.md.

## 3. Backend

### 3.1 Settings

En `Settings/CajaSettings.cs` agregar:

```csharp
public class CajaSettings
{
    public FondoSugeridoSettings  FondoSugerido  { get; set; } = new();
    public UmbralesSettings       Umbrales       { get; set; } = new();
    public ReportesSettings       Reportes       { get; set; } = new();
}

public class ReportesSettings
{
    public HeuristicasSettings Heuristicas { get; set; } = new();
}

public class HeuristicasSettings
{
    public int     DiasSinVentaProducto       { get; set; } = 7;
    public decimal MeseraTopPorcentaje        { get; set; } = 25;
    public decimal TicketPromedioCaidaPorc    { get; set; } = 10;
    public int     CancelacionesAlerta        { get; set; } = 3;
}
```

En `appsettings.json` agregar:

```json
"Caja": {
  ...
  "Reportes": {
    "Heuristicas": {
      "DiasSinVentaProducto": 7,
      "MeseraTopPorcentaje": 25,
      "TicketPromedioCaidaPorc": 10,
      "CancelacionesAlerta": 3
    }
  }
}
```

### 3.2 DTO

`F:\BarAvenida\BarAvenida.API\DTOs\InformeDiaDto.cs`:

```csharp
namespace BarAvenida.API.DTOs;

public class InformeDiaDto
{
    public DateTime Fecha               { get; set; }
    public string FechaTexto            { get; set; } = ""; // "lunes 6 de mayo de 2026"

    public ResumenEjecutivoDto Resumen  { get; set; } = new();
    public List<HighlightDto> Highlights { get; set; } = new();
    public ComparativasDto Comparativas { get; set; } = new();
    public List<AnomaliaDto> Anomalias  { get; set; } = new();
    public List<RecomendacionDto> Recomendaciones { get; set; } = new();
}

public class ResumenEjecutivoDto
{
    public decimal VentasTotales        { get; set; }
    public int     CuentasCobradas      { get; set; }
    public decimal TicketPromedio       { get; set; }
    public int     ProductosVendidos    { get; set; }
    public string  Narrativa            { get; set; } = ""; // texto humano
}

public class HighlightDto
{
    public string Tipo                  { get; set; } = ""; // "TopProducto" | "TopMesera" | "HoraPico"
    public string Icono                 { get; set; } = "";
    public string Titulo                { get; set; } = "";
    public string Descripcion           { get; set; } = "";
}

public class ComparativasDto
{
    public string Ayer                  { get; set; } = ""; // "▲ 12% más ventas que ayer"
    public string SemanaAnterior        { get; set; } = ""; // "▼ 5% menos cuentas que el lunes pasado"
}

public class AnomaliaDto
{
    public string Tipo                  { get; set; } = ""; // "Cancelacion" | "Incidente" | "MesaLarga"
    public string Severidad             { get; set; } = ""; // "Info" | "Atencion" | "Grave"
    public string Mensaje               { get; set; } = "";
}

public class RecomendacionDto
{
    public string Categoria             { get; set; } = ""; // "Inventario" | "Personal" | "Operacion"
    public string Icono                 { get; set; } = "";
    public string Titulo                { get; set; } = "";
    public string Detalle               { get; set; } = "";
    public string? AccionScreen         { get; set; }       // pantalla donde tomar acción
}
```

### 3.3 Controller

Crear `F:\BarAvenida\BarAvenida.API\Controllers\ReportesInterpretativosController.cs`:

```csharp
using BarAvenida.API.Data;
using BarAvenida.API.DTOs;
using BarAvenida.API.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Globalization;

namespace BarAvenida.API.Controllers;

[ApiController]
[Route("api/admin/reportes")]
[Authorize(Roles = "Admin")]
public class ReportesInterpretativosController : ControllerBase
{
    private readonly BarAvenidaDbContext _db;
    private readonly HeuristicasSettings _h;

    public ReportesInterpretativosController(
        BarAvenidaDbContext db,
        IOptions<CajaSettings> opts)
    {
        _db = db;
        _h  = opts.Value.Reportes.Heuristicas;
    }

    // GET /api/admin/reportes/informe-dia?fecha=2026-05-07
    [HttpGet("informe-dia")]
    public async Task<IActionResult> InformeDia([FromQuery] DateTime? fecha)
    {
        var dia       = (fecha ?? DateTime.Now).Date;
        var diaSig    = dia.AddDays(1);
        var diaAnt    = dia.AddDays(-1);
        var semanaAnt = dia.AddDays(-7);

        // 1. Cuentas cobradas en el día y comparativos
        var cuentasHoy = await _db.Cuentas
            .Where(c => c.Estado == "Cobrada"
                     && c.FechaCierre != null
                     && c.FechaCierre >= dia
                     && c.FechaCierre <  diaSig)
            .Include(c => c.Ordenes).ThenInclude(o => o.Detalles).ThenInclude(d => d.Producto)
            .ToListAsync();

        var cuentasAyer = await _db.Cuentas
            .Where(c => c.Estado == "Cobrada"
                     && c.FechaCierre != null
                     && c.FechaCierre >= diaAnt
                     && c.FechaCierre <  dia)
            .ToListAsync();

        var cuentasSemana = await _db.Cuentas
            .Where(c => c.Estado == "Cobrada"
                     && c.FechaCierre != null
                     && c.FechaCierre >= semanaAnt
                     && c.FechaCierre <  semanaAnt.AddDays(1))
            .ToListAsync();

        decimal ventasHoy    = cuentasHoy.Sum(c => c.Total);
        decimal ventasAyer   = cuentasAyer.Sum(c => c.Total);
        decimal ventasSemana = cuentasSemana.Sum(c => c.Total);

        decimal ticketHoy    = cuentasHoy.Count > 0    ? ventasHoy / cuentasHoy.Count : 0;
        decimal ticketAyer   = cuentasAyer.Count > 0   ? ventasAyer / cuentasAyer.Count : 0;

        int productosVendidos = cuentasHoy
            .SelectMany(c => c.Ordenes)
            .SelectMany(o => o.Detalles)
            .Sum(d => d.Cantidad);

        var es = new CultureInfo("es-MX");
        string fechaTexto = char.ToUpper(dia.ToString("dddd d 'de' MMMM 'de' yyyy", es)[0])
                          + dia.ToString("dddd d 'de' MMMM 'de' yyyy", es).Substring(1);

        // ── Narrativa del resumen ────────────────────────────────────────────
        string narrativa;
        if (cuentasHoy.Count == 0)
        {
            narrativa = "Sin movimiento registrado este día. ¿Bar cerrado o falta capturar?";
        }
        else
        {
            var diff = ventasAyer > 0 ? ((ventasHoy - ventasAyer) / ventasAyer) * 100m : 0m;
            string compara = diff > 5
                ? $", {diff:0.0}% más que ayer 🔥"
                : diff < -5
                    ? $", {Math.Abs(diff):0.0}% menos que ayer ⚠"
                    : ", parecido a ayer";
            narrativa = $"Cerraste {cuentasHoy.Count} cuentas por ${ventasHoy:N0}{compara}. "
                      + $"Ticket promedio: ${ticketHoy:N0}.";
        }

        var resumen = new ResumenEjecutivoDto {
            VentasTotales     = ventasHoy,
            CuentasCobradas   = cuentasHoy.Count,
            TicketPromedio    = ticketHoy,
            ProductosVendidos = productosVendidos,
            Narrativa         = narrativa,
        };

        // ── Highlights ──────────────────────────────────────────────────────
        var highlights = new List<HighlightDto>();

        if (cuentasHoy.Count > 0)
        {
            // Top producto
            var detalles = cuentasHoy
                .SelectMany(c => c.Ordenes)
                .SelectMany(o => o.Detalles)
                .Where(d => d.Producto != null)
                .ToList();

            var topProd = detalles
                .GroupBy(d => new { d.ProductoId, Nombre = d.Producto!.Nombre })
                .Select(g => new { g.Key.Nombre, Cantidad = g.Sum(d => d.Cantidad), Total = g.Sum(d => d.Cantidad * d.PrecioUnitario) })
                .OrderByDescending(p => p.Cantidad)
                .FirstOrDefault();

            if (topProd != null)
            {
                highlights.Add(new HighlightDto {
                    Tipo        = "TopProducto",
                    Icono       = "🏆",
                    Titulo      = "Producto estrella",
                    Descripcion = $"{topProd.Nombre} — {topProd.Cantidad} vendidas (${topProd.Total:N0})",
                });
            }

            // Top mesera
            var topMeseraGrupo = cuentasHoy
                .GroupBy(c => c.MeseraId)
                .Select(g => new { MeseraId = g.Key, Total = g.Sum(c => c.Total), Cuentas = g.Count() })
                .OrderByDescending(x => x.Total)
                .FirstOrDefault();
            if (topMeseraGrupo != null)
            {
                var mesera = await _db.Usuarios.FindAsync(topMeseraGrupo.MeseraId);
                highlights.Add(new HighlightDto {
                    Tipo        = "TopMesera",
                    Icono       = "🥇",
                    Titulo      = "Mesera del día",
                    Descripcion = $"{mesera?.Nombre ?? "?"} — {topMeseraGrupo.Cuentas} cuentas, ${topMeseraGrupo.Total:N0}",
                });
            }

            // Hora pico
            var ventasPorHora = cuentasHoy
                .GroupBy(c => c.FechaCierre!.Value.Hour)
                .Select(g => new { Hora = g.Key, Total = g.Sum(c => c.Total) })
                .OrderByDescending(x => x.Total)
                .FirstOrDefault();
            if (ventasPorHora != null)
            {
                int sigHora = (ventasPorHora.Hora + 1) % 24;
                highlights.Add(new HighlightDto {
                    Tipo        = "HoraPico",
                    Icono       = "⏰",
                    Titulo      = "Hora pico",
                    Descripcion = $"{ventasPorHora.Hora}:00 – {sigHora}:00 con ${ventasPorHora.Total:N0}",
                });
            }
        }

        // ── Comparativas ────────────────────────────────────────────────────
        string comparaAyer = ventasAyer == 0
            ? "Ayer no hubo ventas registradas"
            : (() => {
                var p = ((ventasHoy - ventasAyer) / ventasAyer) * 100m;
                if (p > 0)  return $"▲ {p:0.0}% más ventas que ayer (${Math.Abs(ventasHoy - ventasAyer):N0} arriba)";
                if (p < 0)  return $"▼ {Math.Abs(p):0.0}% menos ventas que ayer (${Math.Abs(ventasHoy - ventasAyer):N0} abajo)";
                return "Mismo monto que ayer";
            })();

        string comparaSemana = ventasSemana == 0
            ? "Sin data del mismo día la semana pasada"
            : (() => {
                var p = ((ventasHoy - ventasSemana) / ventasSemana) * 100m;
                if (p > 0)  return $"▲ {p:0.0}% más que el mismo día la semana pasada";
                if (p < 0)  return $"▼ {Math.Abs(p):0.0}% menos que el mismo día la semana pasada";
                return "Mismo monto que la semana pasada";
            })();

        var comparativas = new ComparativasDto {
            Ayer            = comparaAyer,
            SemanaAnterior  = comparaSemana,
        };

        // ── Anomalías ───────────────────────────────────────────────────────
        var anomalias = new List<AnomaliaDto>();

        // Cancelaciones del día
        var canceladas = await _db.Cuentas
            .Where(c => c.Estado == "Cancelada"
                     && c.FechaCancelacion != null
                     && c.FechaCancelacion >= dia
                     && c.FechaCancelacion <  diaSig)
            .ToListAsync();
        if (canceladas.Count > 0)
        {
            anomalias.Add(new AnomaliaDto {
                Tipo      = "Cancelacion",
                Severidad = canceladas.Count >= _h.CancelacionesAlerta ? "Atencion" : "Info",
                Mensaje   = $"{canceladas.Count} cuenta{(canceladas.Count != 1 ? "s" : "")} cancelada{(canceladas.Count != 1 ? "s" : "")} hoy",
            });
        }

        // Incidentes de caja
        var incidentes = await _db.IncidentesCaja
            .Where(i => i.FechaRegistro >= dia && i.FechaRegistro < diaSig)
            .ToListAsync();
        foreach (var inc in incidentes)
        {
            anomalias.Add(new AnomaliaDto {
                Tipo      = "Incidente",
                Severidad = inc.Severidad == "Roja" ? "Grave" : (inc.Severidad == "Amarilla" ? "Atencion" : "Info"),
                Mensaje   = $"Cierre con diferencia de ${Math.Abs(inc.Diferencia):N0} ({inc.Tipo}, severidad {inc.Severidad})",
            });
        }

        // ── Recomendaciones ────────────────────────────────────────────────
        var recomendaciones = new List<RecomendacionDto>();

        // 1. Producto sin ventas en N días
        var corteSinVentas = dia.AddDays(-_h.DiasSinVentaProducto);
        var productosActivos = await _db.Productos
            .Where(p => p.Activo)
            .Select(p => p.Id)
            .ToListAsync();

        var productosConVentaReciente = await _db.OrdenDetalles
            .Include(d => d.Orden).ThenInclude(o => o.Cuenta)
            .Where(d => d.Orden != null
                     && d.Orden.Cuenta != null
                     && d.Orden.Cuenta.FechaCierre >= corteSinVentas)
            .Select(d => d.ProductoId)
            .Distinct()
            .ToListAsync();

        var sinVenta = productosActivos.Except(productosConVentaReciente).ToList();
        if (sinVenta.Count > 0 && sinVenta.Count <= 5)
        {
            var nombres = await _db.Productos
                .Where(p => sinVenta.Contains(p.Id))
                .Select(p => p.Nombre)
                .ToListAsync();
            recomendaciones.Add(new RecomendacionDto {
                Categoria    = "Inventario",
                Icono        = "📦",
                Titulo       = "Productos sin movimiento",
                Detalle      = $"{nombres.Count} producto{(nombres.Count != 1 ? "s" : "")} sin venderse en {_h.DiasSinVentaProducto} días: " +
                               $"{string.Join(", ", nombres.Take(5))}. Considera descontinuar o promocionar.",
                AccionScreen = "cat-productos",
            });
        }
        else if (sinVenta.Count > 5)
        {
            recomendaciones.Add(new RecomendacionDto {
                Categoria    = "Inventario",
                Icono        = "📦",
                Titulo       = "Muchos productos sin movimiento",
                Detalle      = $"{sinVenta.Count} productos no se han vendido en {_h.DiasSinVentaProducto} días. Revisar catálogo.",
                AccionScreen = "cat-productos",
            });
        }

        // 2. Mesera top performer
        if (cuentasHoy.Count > 0)
        {
            var ventasPorMesera = cuentasHoy
                .GroupBy(c => c.MeseraId)
                .Select(g => new { MeseraId = g.Key, Total = g.Sum(c => c.Total) })
                .ToList();
            if (ventasPorMesera.Count >= 2)
            {
                var promedio = ventasPorMesera.Average(x => x.Total);
                var topPerf  = ventasPorMesera.OrderByDescending(x => x.Total).First();
                if (promedio > 0)
                {
                    var diff = ((topPerf.Total - promedio) / promedio) * 100m;
                    if (diff >= _h.MeseraTopPorcentaje)
                    {
                        var mesera = await _db.Usuarios.FindAsync(topPerf.MeseraId);
                        recomendaciones.Add(new RecomendacionDto {
                            Categoria    = "Personal",
                            Icono        = "🌟",
                            Titulo       = "Top performer del día",
                            Detalle      = $"{mesera?.Nombre} vendió {diff:0}% más que el promedio. Ver qué hace bien y replicar.",
                        });
                    }
                }
            }
        }

        // 3. Caída de ticket promedio vs semana anterior
        decimal ticketSemana = cuentasSemana.Count > 0 ? ventasSemana / cuentasSemana.Count : 0;
        if (ticketSemana > 0 && ticketHoy > 0)
        {
            var caida = ((ticketSemana - ticketHoy) / ticketSemana) * 100m;
            if (caida >= _h.TicketPromedioCaidaPorc)
            {
                recomendaciones.Add(new RecomendacionDto {
                    Categoria = "Operacion",
                    Icono     = "📉",
                    Titulo    = "Ticket promedio bajando",
                    Detalle   = $"Ticket promedio de hoy ${ticketHoy:N0} es {caida:0.0}% menor que el mismo día de la semana pasada. " +
                                $"Revisar mix de productos o promociones.",
                });
            }
        }

        // 4. Cancelaciones excesivas
        if (canceladas.Count >= _h.CancelacionesAlerta)
        {
            recomendaciones.Add(new RecomendacionDto {
                Categoria    = "Operacion",
                Icono        = "🚫",
                Titulo       = "Demasiadas cancelaciones",
                Detalle      = $"{canceladas.Count} cancelaciones hoy (umbral: {_h.CancelacionesAlerta}). Revisar motivos en Consulta de cuentas.",
                AccionScreen = "cons-cuentas",
            });
        }

        // 5. Hora pico — recomendar staff
        if (highlights.Any(h => h.Tipo == "HoraPico"))
        {
            var picoH = highlights.First(h => h.Tipo == "HoraPico");
            recomendaciones.Add(new RecomendacionDto {
                Categoria = "Personal",
                Icono     = "👥",
                Titulo    = "Refuerza tu hora pico",
                Detalle   = $"{picoH.Descripcion}. Asegura suficiente staff a esa hora la próxima vez.",
            });
        }

        return Ok(new InformeDiaDto {
            Fecha           = dia,
            FechaTexto      = fechaTexto,
            Resumen         = resumen,
            Highlights      = highlights,
            Comparativas    = comparativas,
            Anomalias       = anomalias,
            Recomendaciones = recomendaciones,
        });
    }
}
```

## 4. Frontend Admin

### 4.1 `api.js`

Agregar:
```javascript
adminGetInformeDia: (t, fecha) => {
  const qs = fecha ? `?fecha=${fecha}` : ''
  return req(`/api/admin/reportes/informe-dia${qs}`, {}, t)
},
```

### 4.2 Pantalla nueva: `InformeDiaScreen.jsx`

`F:\BarAvenida\BarAvenida.Admin\src\screens\InformeDiaScreen.jsx`:

Layout:

```
┌──────────────────────────────────────────────────────────┐
│ ◀ VOLVER  📋 INFORME DEL DÍA  · jueves 7 de mayo de 2026 │
│                                              [📅 Fecha]  │
├──────────────────────────────────────────────────────────┤
│  💼 RESUMEN                                              │
│  Cerraste 12 cuentas por $1,500, 25% más que ayer 🔥.    │
│  Ticket promedio: $125.                                  │
│  ┌─────┬─────┬─────┬─────┐                              │
│  │$1500│ 12  │$125 │ 35  │                              │
│  │Ventas│Cuent│Ticket│Prod│                              │
│  └─────┴─────┴─────┴─────┘                              │
├──────────────────────────────────────────────────────────┤
│  🌟 HIGHLIGHTS                                           │
│  🏆 Producto estrella: Corona — 8 vendidas ($320)        │
│  🥇 Mesera del día: ABBY — 6 cuentas, $720               │
│  ⏰ Hora pico: 21:00 – 22:00 con $580                    │
├──────────────────────────────────────────────────────────┤
│  📊 COMPARATIVAS                                          │
│  ▲ 25% más ventas que ayer ($300 arriba)                 │
│  ▼ 5% menos que el mismo día la semana pasada            │
├──────────────────────────────────────────────────────────┤
│  ⚠ ANOMALÍAS                                             │
│  • 1 cuenta cancelada hoy                                │
├──────────────────────────────────────────────────────────┤
│  💡 RECOMENDACIONES                                       │
│  📦 Productos sin movimiento: XYZ no se ha vendido en…   │
│  🌟 Top performer: ABBY vendió 30% más que el promedio… │
│  👥 Refuerza tu hora pico: 21:00…                        │
└──────────────────────────────────────────────────────────┘
```

Pseudocódigo:

```javascript
import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import './InformeDiaScreen.css'

const fmt = (n) => `$${Number(n ?? 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`

function isoFecha(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export default function InformeDiaScreen({ auth, onVolver }) {
  const [fecha, setFecha] = useState(() => isoFecha(new Date()))
  const [data,  setData]  = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.adminGetInformeDia(auth.token, fecha)
      setData(d)
      setError(null)
    } catch (e) {
      setError(e.message || 'Error al cargar informe')
    } finally {
      setLoading(false)
    }
  }, [auth.token, fecha])

  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="id-root">
      <header className="id-header">
        <button className="id-volver" onClick={onVolver}>◀ VOLVER</button>
        <div className="id-titulo">
          <h1>📋 INFORME DEL DÍA</h1>
          <span className="id-fecha-texto">{data?.fechaTexto ?? '...'}</span>
        </div>
        <div className="id-fecha-picker">
          <label>📅</label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            max={isoFecha(new Date())}
          />
        </div>
      </header>

      {error && <div className="id-error">⚠ {error}</div>}
      {loading && !data && <div className="id-loading">Cargando informe...</div>}

      {data && (
        <div className="id-body">
          {/* Resumen */}
          <section className="id-section">
            <h2 className="id-sec-titulo">💼 RESUMEN</h2>
            <p className="id-narrativa">{data.resumen.narrativa}</p>
            <div className="id-kpis">
              <div className="id-kpi"><span className="id-kpi-val">{fmt(data.resumen.ventasTotales)}</span><span className="id-kpi-lbl">VENTAS</span></div>
              <div className="id-kpi"><span className="id-kpi-val">{data.resumen.cuentasCobradas}</span><span className="id-kpi-lbl">CUENTAS</span></div>
              <div className="id-kpi"><span className="id-kpi-val">{fmt(data.resumen.ticketPromedio)}</span><span className="id-kpi-lbl">TICKET</span></div>
              <div className="id-kpi"><span className="id-kpi-val">{data.resumen.productosVendidos}</span><span className="id-kpi-lbl">PRODUCTOS</span></div>
            </div>
          </section>

          {/* Highlights */}
          {data.highlights.length > 0 && (
            <section className="id-section">
              <h2 className="id-sec-titulo">🌟 HIGHLIGHTS</h2>
              <ul className="id-list">
                {data.highlights.map((h, i) => (
                  <li key={i} className="id-item">
                    <span className="id-item-icon">{h.icono}</span>
                    <div>
                      <span className="id-item-titulo">{h.titulo}</span>
                      <span className="id-item-desc">{h.descripcion}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Comparativas */}
          <section className="id-section">
            <h2 className="id-sec-titulo">📊 COMPARATIVAS</h2>
            <p className="id-comparativa">{data.comparativas.ayer}</p>
            <p className="id-comparativa">{data.comparativas.semanaAnterior}</p>
          </section>

          {/* Anomalías */}
          {data.anomalias.length > 0 && (
            <section className="id-section">
              <h2 className="id-sec-titulo">⚠ ANOMALÍAS</h2>
              <ul className="id-list">
                {data.anomalias.map((a, i) => (
                  <li key={i} className={`id-anomalia id-sev-${a.severidad.toLowerCase()}`}>
                    {a.mensaje}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Recomendaciones */}
          {data.recomendaciones.length > 0 && (
            <section className="id-section">
              <h2 className="id-sec-titulo">💡 RECOMENDACIONES</h2>
              <ul className="id-list">
                {data.recomendaciones.map((r, i) => (
                  <li key={i} className="id-recomendacion">
                    <span className="id-item-icon">{r.icono}</span>
                    <div>
                      <span className="id-item-titulo">{r.titulo}</span>
                      <span className="id-item-desc">{r.detalle}</span>
                      <span className="id-item-cat">[{r.categoria}]</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
```

### 4.3 CSS

`InformeDiaScreen.css` con tema dorado/negro consistente. Secciones con borde dorado, items con hover, severidades con colores (Info=gris, Atencion=amarillo, Grave=rojo).

### 4.4 Item en TopMenuBar

En menú **REPORTES**, agregar después de "Dashboard vivo":
```javascript
{ label: '📋 Informe del día',  screen: 'rep-informe-dia' },
```

### 4.5 Ruta en App.jsx

```jsx
case 'rep-informe-dia':
  return <InformeDiaScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
```

(Y el import correspondiente.)

## 5. Criterios de aceptación

### Backend
- [ ] `GET /api/admin/reportes/informe-dia?fecha=YYYY-MM-DD` retorna `InformeDiaDto` completo.
- [ ] Sin parámetro fecha, usa hoy.
- [ ] Narrativa generada en español casual mexicano.
- [ ] Comparativas vs ayer y semana anterior funcionan.
- [ ] Recomendaciones se generan según heurísticas configurables.
- [ ] **Build backend en 0/0**.

### Frontend
- [ ] Pantalla accesible desde Reportes → "📋 Informe del día".
- [ ] Selector de fecha funcional, default hoy.
- [ ] Las 5 secciones renderizan: Resumen, Highlights, Comparativas, Anomalías, Recomendaciones.
- [ ] Si no hay datos, secciones se ocultan o muestran estado vacío amigable.
- [ ] **Build admin en 0/0**.

## 6. Reglas de oro

- NO instalar librerías nuevas.
- NO ejecutar dotnet run / npm run dev.
- NO modificar `DashboardScreen.jsx` ni `DashboardLiveScreen.jsx`.
- Builds en **0/0**.
- Reportar archivos modificados, builds, decisiones.

## 7. Archivos esperados

| Archivo | Acción | Aprox |
|---|---|---|
| `Settings/CajaSettings.cs` | Modificar (+2 clases) | +25 |
| `appsettings.json` | Modificar (+sección Heuristicas) | +8 |
| `Controllers/ReportesInterpretativosController.cs` | NUEVO | ~280 líneas |
| `DTOs/InformeDiaDto.cs` | NUEVO | ~50 |
| `BarAvenida.Admin/src/api.js` | Modificar | +4 |
| `BarAvenida.Admin/src/screens/InformeDiaScreen.jsx` | NUEVO | ~180 |
| `BarAvenida.Admin/src/screens/InformeDiaScreen.css` | NUEVO | ~150 |
| `BarAvenida.Admin/src/components/TopMenuBar.jsx` | Modificar (+1 item) | +1 |
| `BarAvenida.Admin/src/App.jsx` | Modificar (+1 case + import) | +3 |

**Total: ~700 líneas, 4 archivos nuevos, sin migración EF, sin librerías nuevas.**
