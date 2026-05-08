using BarAvenida.API.Data;
using BarAvenida.API.DTOs;
using BarAvenida.API.Services;
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
    private readonly BarAvenidaDbContext   _db;
    private readonly HeuristicasSettings   _h;
    private readonly AsistenteService      _asistente;

    public ReportesInterpretativosController(
        BarAvenidaDbContext         db,
        IOptions<CajaSettings>      opts,
        AsistenteService            asistente)
    {
        _db        = db;
        _h         = opts.Value.Reportes.Heuristicas;
        _asistente = asistente;
    }

    // GET /api/admin/reportes/informe-dia?fecha=2026-05-07
    [HttpGet("informe-dia")]
    public async Task<IActionResult> InformeDia([FromQuery] DateTime? fecha)
    {
        var dia       = (fecha ?? DateTime.Now).Date;
        var diaSig    = dia.AddDays(1);
        var diaAnt    = dia.AddDays(-1);
        var semanaAnt = dia.AddDays(-7);

        // ── 1. Cuentas cobradas: hoy, ayer y semana anterior ──────────────
        var cuentasHoy = await _db.Cuentas
            .Where(c => c.Estado == "Cobrada"
                     && c.FechaCierre != null
                     && c.FechaCierre >= dia
                     && c.FechaCierre <  diaSig)
            .Include(c => c.Ordenes)
                .ThenInclude(o => o.Detalles)
                .ThenInclude(d => d.Producto)
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

        decimal ticketHoy    = cuentasHoy.Count   > 0 ? ventasHoy    / cuentasHoy.Count   : 0;
        decimal ticketSemana = cuentasSemana.Count > 0 ? ventasSemana / cuentasSemana.Count : 0;

        int productosVendidos = cuentasHoy
            .SelectMany(c => c.Ordenes)
            .SelectMany(o => o.Detalles)
            .Sum(d => d.Cantidad);

        // ── Fecha en español ─────────────────────────────────────────────
        var es = new CultureInfo("es-MX");
        var rawFecha = dia.ToString("dddd d 'de' MMMM 'de' yyyy", es);
        string fechaTexto = char.ToUpper(rawFecha[0]) + rawFecha.Substring(1);

        // ── 2. Narrativa del resumen ──────────────────────────────────────
        string narrativa;
        if (cuentasHoy.Count == 0)
        {
            narrativa = "Sin movimiento registrado este dia. Bar cerrado o falta capturar?";
        }
        else
        {
            var diff = ventasAyer > 0 ? ((ventasHoy - ventasAyer) / ventasAyer) * 100m : 0m;
            string compara;
            if (diff > 5)
                compara = $", {diff:0.0}% mas que ayer";
            else if (diff < -5)
                compara = $", {Math.Abs(diff):0.0}% menos que ayer";
            else
                compara = ", parecido a ayer";

            narrativa = $"Cerraste {cuentasHoy.Count} cuentas por ${ventasHoy:N0}{compara}. "
                      + $"Ticket promedio: ${ticketHoy:N0}.";
        }

        var resumen = new ResumenEjecutivoDto
        {
            VentasTotales     = ventasHoy,
            CuentasCobradas   = cuentasHoy.Count,
            TicketPromedio    = ticketHoy,
            ProductosVendidos = productosVendidos,
            Narrativa         = narrativa,
        };

        // ── 3. Highlights ─────────────────────────────────────────────────
        var highlights = new List<HighlightDto>();

        if (cuentasHoy.Count > 0)
        {
            var detalles = cuentasHoy
                .SelectMany(c => c.Ordenes)
                .SelectMany(o => o.Detalles)
                .Where(d => d.Producto != null)
                .ToList();

            var topProd = detalles
                .GroupBy(d => new { d.ProductoId, Nombre = d.Producto!.Nombre })
                .Select(g => new
                {
                    g.Key.Nombre,
                    Cantidad = g.Sum(d => d.Cantidad),
                    Total    = g.Sum(d => d.Cantidad * d.PrecioUnitario),
                })
                .OrderByDescending(p => p.Cantidad)
                .FirstOrDefault();

            if (topProd != null)
            {
                highlights.Add(new HighlightDto
                {
                    Tipo        = "TopProducto",
                    Icono       = "trofeo",
                    Titulo      = "Producto estrella",
                    Descripcion = $"{topProd.Nombre} - {topProd.Cantidad} vendidas (${topProd.Total:N0})",
                });
            }

            var topMeseraGrupo = cuentasHoy
                .GroupBy(c => c.MeseraId)
                .Select(g => new { MeseraId = g.Key, Total = g.Sum(c => c.Total), Cuentas = g.Count() })
                .OrderByDescending(x => x.Total)
                .FirstOrDefault();

            if (topMeseraGrupo != null)
            {
                var mesera = await _db.Usuarios.FindAsync(topMeseraGrupo.MeseraId);
                highlights.Add(new HighlightDto
                {
                    Tipo        = "TopMesera",
                    Icono       = "medalla",
                    Titulo      = "Mesera del dia",
                    Descripcion = $"{mesera?.Nombre ?? "?"} - {topMeseraGrupo.Cuentas} cuentas, ${topMeseraGrupo.Total:N0}",
                });
            }

            var horaPico = cuentasHoy
                .GroupBy(c => c.FechaCierre!.Value.Hour)
                .Select(g => new { Hora = g.Key, Total = g.Sum(c => c.Total) })
                .OrderByDescending(x => x.Total)
                .FirstOrDefault();

            if (horaPico != null)
            {
                int sigHora = (horaPico.Hora + 1) % 24;
                highlights.Add(new HighlightDto
                {
                    Tipo        = "HoraPico",
                    Icono       = "reloj",
                    Titulo      = "Hora pico",
                    Descripcion = $"{horaPico.Hora}:00 - {sigHora}:00 con ${horaPico.Total:N0}",
                });
            }
        }

        // ── 4. Comparativas ───────────────────────────────────────────────
        string comparaAyer;
        if (ventasAyer == 0)
        {
            comparaAyer = "Ayer no hubo ventas registradas";
        }
        else
        {
            var p = ((ventasHoy - ventasAyer) / ventasAyer) * 100m;
            if (p > 0)
                comparaAyer = $"▲ {p:0.0}% mas ventas que ayer (${Math.Abs(ventasHoy - ventasAyer):N0} arriba)";
            else if (p < 0)
                comparaAyer = $"▼ {Math.Abs(p):0.0}% menos ventas que ayer (${Math.Abs(ventasHoy - ventasAyer):N0} abajo)";
            else
                comparaAyer = "Mismo monto que ayer";
        }

        string comparaSemana;
        if (ventasSemana == 0)
        {
            comparaSemana = "Sin data del mismo dia la semana pasada";
        }
        else
        {
            var p = ((ventasHoy - ventasSemana) / ventasSemana) * 100m;
            if (p > 0)
                comparaSemana = $"▲ {p:0.0}% mas que el mismo dia la semana pasada";
            else if (p < 0)
                comparaSemana = $"▼ {Math.Abs(p):0.0}% menos que el mismo dia la semana pasada";
            else
                comparaSemana = "Mismo monto que la semana pasada";
        }

        var comparativas = new ComparativasDto
        {
            Ayer           = comparaAyer,
            SemanaAnterior = comparaSemana,
        };

        // ── 5. Anomalias ──────────────────────────────────────────────────
        var anomalias = new List<AnomaliaDto>();

        var canceladas = await _db.Cuentas
            .Where(c => c.Estado == "Cancelada"
                     && c.FechaCancelacion != null
                     && c.FechaCancelacion >= dia
                     && c.FechaCancelacion <  diaSig)
            .ToListAsync();

        if (canceladas.Count > 0)
        {
            anomalias.Add(new AnomaliaDto
            {
                Tipo      = "Cancelacion",
                Severidad = canceladas.Count >= _h.CancelacionesAlerta ? "Atencion" : "Info",
                Mensaje   = $"{canceladas.Count} cuenta{(canceladas.Count != 1 ? "s" : "")} cancelada{(canceladas.Count != 1 ? "s" : "")} hoy",
            });
        }

        var incidentes = await _db.IncidentesCaja
            .Where(i => i.FechaRegistro >= dia && i.FechaRegistro < diaSig)
            .ToListAsync();

        foreach (var inc in incidentes)
        {
            anomalias.Add(new AnomaliaDto
            {
                Tipo      = "Incidente",
                Severidad = inc.Severidad == "Roja" ? "Grave" : (inc.Severidad == "Amarilla" ? "Atencion" : "Info"),
                Mensaje   = $"Cierre con diferencia de ${Math.Abs(inc.Diferencia):N0} ({inc.Tipo}, severidad {inc.Severidad})",
            });
        }

        // ── 6. Recomendaciones ────────────────────────────────────────────
        var recomendaciones = new List<RecomendacionDto>();

        // R1. Productos activos sin ventas en N dias
        var corteSinVentas = dia.AddDays(-_h.DiasSinVentaProducto);

        var productosActivos = await _db.Productos
            .Where(p => p.Activo)
            .Select(p => p.Id)
            .ToListAsync();

        var productosConVentaReciente = await _db.OrdenDetalles
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
            recomendaciones.Add(new RecomendacionDto
            {
                Categoria    = "Inventario",
                Icono        = "inventario",
                Titulo       = "Productos sin movimiento",
                Detalle      = $"{nombres.Count} producto{(nombres.Count != 1 ? "s" : "")} sin venderse en {_h.DiasSinVentaProducto} dias: "
                             + $"{string.Join(", ", nombres)}. Considera descontinuar o promocionar.",
                AccionScreen = "cat-productos",
            });
        }
        else if (sinVenta.Count > 5)
        {
            recomendaciones.Add(new RecomendacionDto
            {
                Categoria    = "Inventario",
                Icono        = "inventario",
                Titulo       = "Muchos productos sin movimiento",
                Detalle      = $"{sinVenta.Count} productos no se han vendido en {_h.DiasSinVentaProducto} dias. Revisar catalogo.",
                AccionScreen = "cat-productos",
            });
        }

        // R2. Mesera top performer (solo si hay 2+ meseras)
        if (cuentasHoy.Count > 0)
        {
            var ventasPorMesera = cuentasHoy
                .GroupBy(c => c.MeseraId)
                .Select(g => new { MeseraId = g.Key, Total = g.Sum(c => c.Total) })
                .ToList();

            if (ventasPorMesera.Count >= 2)
            {
                var promedio = ventasPorMesera.Average(x => (double)x.Total);
                var topPerf  = ventasPorMesera.OrderByDescending(x => x.Total).First();
                if (promedio > 0)
                {
                    var diff = (((double)topPerf.Total - promedio) / promedio) * 100.0;
                    if (diff >= (double)_h.MeseraTopPorcentaje)
                    {
                        var mesera = await _db.Usuarios.FindAsync(topPerf.MeseraId);
                        recomendaciones.Add(new RecomendacionDto
                        {
                            Categoria = "Personal",
                            Icono     = "estrella",
                            Titulo    = "Top performer del dia",
                            Detalle   = $"{mesera?.Nombre} vendio {diff:0}% mas que el promedio. Ver que hace bien y replicar.",
                        });
                    }
                }
            }
        }

        // R3. Caida de ticket promedio vs semana anterior
        if (ticketSemana > 0 && ticketHoy > 0)
        {
            var caida = ((ticketSemana - ticketHoy) / ticketSemana) * 100m;
            if (caida >= _h.TicketPromedioCaidaPorc)
            {
                recomendaciones.Add(new RecomendacionDto
                {
                    Categoria = "Operacion",
                    Icono     = "tendencia",
                    Titulo    = "Ticket promedio bajando",
                    Detalle   = $"Ticket promedio de hoy ${ticketHoy:N0} es {caida:0.0}% menor que el mismo dia de la semana pasada. "
                              + "Revisar mix de productos o promociones.",
                });
            }
        }

        // R4. Cancelaciones excesivas
        if (canceladas.Count >= _h.CancelacionesAlerta)
        {
            recomendaciones.Add(new RecomendacionDto
            {
                Categoria    = "Operacion",
                Icono        = "alerta",
                Titulo       = "Demasiadas cancelaciones",
                Detalle      = $"{canceladas.Count} cancelaciones hoy (umbral: {_h.CancelacionesAlerta}). Revisar motivos en Consulta de cuentas.",
                AccionScreen = "cons-cuentas",
            });
        }

        // R5. Recomendar reforzar hora pico
        var horaPicoHighlight = highlights.FirstOrDefault(h => h.Tipo == "HoraPico");
        if (horaPicoHighlight != null)
        {
            recomendaciones.Add(new RecomendacionDto
            {
                Categoria = "Personal",
                Icono     = "staff",
                Titulo    = "Refuerza tu hora pico",
                Detalle   = $"{horaPicoHighlight.Descripcion}. Asegura suficiente staff a esa hora la proxima vez.",
            });
        }

        return Ok(new InformeDiaDto
        {
            Fecha           = dia,
            FechaTexto      = fechaTexto,
            Resumen         = resumen,
            Highlights      = highlights,
            Comparativas    = comparativas,
            Anomalias       = anomalias,
            Recomendaciones = recomendaciones,
        });
    }

    // POST /api/admin/reportes/analisis-ia?fecha=2026-05-07
    [HttpPost("analisis-ia")]
    public async Task<IActionResult> AnalisisIa([FromQuery] DateTime? fecha)
    {
        var informeResp = await InformeDia(fecha) as OkObjectResult;
        if (informeResp?.Value is not InformeDiaDto informe)
            return StatusCode(500, new { mensaje = "No se pudo generar el informe base" });

        var analisis = await _asistente.AnalizarInforme(informe);
        return Ok(analisis);
    }
}
