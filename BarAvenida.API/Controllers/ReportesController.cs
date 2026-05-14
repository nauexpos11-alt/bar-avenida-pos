using BarAvenida.API.Data;
using BarAvenida.API.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;

namespace BarAvenida.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportesController : ControllerBase
{
    private readonly BarAvenidaDbContext _db;

    public ReportesController(BarAvenidaDbContext db) => _db = db;

    // ── Helper ───────────────────────────────────────────────────────────────
    private static (DateTime desde, DateTime hastaEx) Rango(DateTime? desde, DateTime? hasta)
    {
        var d = (desde ?? DateTime.Today).Date;
        var h = (hasta ?? DateTime.Today).Date.AddDays(1);
        return (d, h);
    }

    private static string EscCsv(string s) =>
        s.Contains(',') || s.Contains('"') || s.Contains('\n')
            ? $"\"{s.Replace("\"", "\"\"")}\""
            : s;

    // ════════════════════════════════════════════════════════════════════════
    // NUEVOS ENDPOINTS (Admin dashboard reportes)
    // ════════════════════════════════════════════════════════════════════════

    // GET /api/Reportes/ventas-resumen
    [HttpGet("ventas-resumen")]
    public async Task<IActionResult> VentasResumen(
        [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta, CancellationToken ct)
    {
        var (d, h) = Rango(desde, hasta);

        var cuentas = await _db.Cuentas
            .AsNoTracking()
            .Where(c => c.Estado == "Cobrada" && c.FechaCierre >= d && c.FechaCierre < h)
            .Select(c => new {
                c.Total, c.ComisionTarjeta,
                MontoEfectivo = c.MontoEfectivo ?? 0m,
                MontoTarjeta  = c.MontoTarjeta  ?? 0m,
                Dia           = c.FechaCierre!.Value.Date
            })
            .ToListAsync(ct);

        var totalVentas = cuentas.Sum(x => x.Total);
        var totalCuentas = cuentas.Count;

        var ventasPorDia = cuentas
            .GroupBy(x => x.Dia)
            .Select(g => new VentaDiaDto
            {
                Fecha   = g.Key.ToString("yyyy-MM-dd"),
                Total   = g.Sum(x => x.Total),
                Cuentas = g.Count()
            })
            .OrderBy(x => x.Fecha)
            .ToList();

        return Ok(new VentasResumenDto
        {
            TotalVentas     = totalVentas,
            TotalCuentas    = totalCuentas,
            TicketPromedio  = totalCuentas > 0 ? Math.Round(totalVentas / totalCuentas, 2) : 0,
            TotalComisiones = cuentas.Sum(x => x.ComisionTarjeta),
            TotalEfectivo   = cuentas.Sum(x => x.MontoEfectivo),
            TotalTarjeta    = cuentas.Sum(x => x.MontoTarjeta),
            VentasPorDia    = ventasPorDia
        });
    }

    // GET /api/Reportes/productos-top?limit=20
    [HttpGet("productos-top")]
    public async Task<IActionResult> ProductosTop(
        [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta,
        [FromQuery] int limit = 20, CancellationToken ct = default)
    {
        var (d, h) = Rango(desde, hasta);
        limit = Math.Clamp(limit, 1, 200);

        // Incluye TODAS las ventas del rango: cobradas + abiertas + por cobrar
        // (excluye solo canceladas) para capturar todos los productos vendidos
        var raw = await _db.OrdenDetalles
            .AsNoTracking()
            .Where(x => x.Orden!.Cuenta!.Estado != "Cancelada"
                     && x.Orden.Cuenta.FechaApertura >= d
                     && x.Orden.Cuenta.FechaApertura < h)
            .Select(x => new {
                x.ProductoId,
                ProductoNombre  = x.Producto!.Nombre,
                CategoriaNombre = x.Producto.Categoria!.Nombre,
                x.Cantidad,
                x.Subtotal
            })
            .ToListAsync(ct);

        var grandTotal = raw.Sum(x => x.Subtotal);

        var result = raw
            .GroupBy(x => new { x.ProductoId, x.ProductoNombre, x.CategoriaNombre })
            .Select(g => new ProductoTopDto
            {
                ProductoId         = g.Key.ProductoId,
                ProductoNombre     = g.Key.ProductoNombre,
                CategoriaNombre    = g.Key.CategoriaNombre,
                UnidadesVendidas   = g.Sum(x => x.Cantidad),
                TotalVentas        = g.Sum(x => x.Subtotal),
                PorcentajeDelTotal = grandTotal > 0
                    ? Math.Round(g.Sum(x => x.Subtotal) / grandTotal * 100, 2) : 0,
            })
            .OrderByDescending(x => x.UnidadesVendidas)
            .Take(limit)
            .ToList();

        return Ok(result);
    }

    // GET /api/Reportes/meseros
    [HttpGet("meseros")]
    public async Task<IActionResult> VentasMeseros(
        [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta, CancellationToken ct)
    {
        var (d, h) = Rango(desde, hasta);

        var raw = await _db.Cuentas
            .AsNoTracking()
            .Where(c => c.Estado == "Cobrada" && c.FechaCierre >= d && c.FechaCierre < h)
            .Select(c => new { c.MeseraId, MeseraNombre = c.Mesera!.Nombre, c.Total })
            .ToListAsync(ct);

        var grandTotal = raw.Sum(x => x.Total);

        var result = raw
            .GroupBy(x => new { x.MeseraId, x.MeseraNombre })
            .Select(g =>
            {
                var tv = g.Sum(x => x.Total);
                var cc = g.Count();
                return new MeseroReporteDto
                {
                    MeseraId          = g.Key.MeseraId,
                    MeseraNombre      = g.Key.MeseraNombre,
                    TotalVentas       = tv,
                    CantidadCuentas   = cc,
                    TicketPromedio    = cc > 0 ? Math.Round(tv / cc, 2) : 0,
                    PorcentajeDelTotal = grandTotal > 0 ? Math.Round(tv / grandTotal * 100, 2) : 0,
                };
            })
            .OrderByDescending(x => x.TotalVentas)
            .ToList();

        return Ok(result);
    }

    // GET /api/Reportes/categorias
    [HttpGet("categorias")]
    public async Task<IActionResult> VentasCategorias(
        [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta, CancellationToken ct)
    {
        var (d, h) = Rango(desde, hasta);

        var raw = await _db.OrdenDetalles
            .AsNoTracking()
            .Where(x => x.Orden!.Cuenta!.Estado == "Cobrada"
                     && x.Orden.Cuenta.FechaCierre >= d
                     && x.Orden.Cuenta.FechaCierre < h)
            .Select(x => new {
                CategoriaId     = x.Producto!.CategoriaId,
                CategoriaNombre = x.Producto.Categoria!.Nombre,
                Color           = x.Producto.Categoria.ColorHex,
                x.Cantidad,
                x.Subtotal
            })
            .ToListAsync(ct);

        var grandTotal = raw.Sum(x => x.Subtotal);

        var result = raw
            .GroupBy(x => new { x.CategoriaId, x.CategoriaNombre, x.Color })
            .Select(g => new CategoriaReporteDto
            {
                CategoriaId       = g.Key.CategoriaId,
                CategoriaNombre   = g.Key.CategoriaNombre,
                Color             = g.Key.Color,
                TotalVentas       = g.Sum(x => x.Subtotal),
                UnidadesVendidas  = g.Sum(x => x.Cantidad),
                PorcentajeDelTotal = grandTotal > 0
                    ? Math.Round(g.Sum(x => x.Subtotal) / grandTotal * 100, 2) : 0,
            })
            .OrderByDescending(x => x.TotalVentas)
            .ToList();

        return Ok(result);
    }

    // GET /api/Reportes/ventas-por-hora
    [HttpGet("ventas-por-hora")]
    public async Task<IActionResult> VentasPorHora(
        [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta, CancellationToken ct)
    {
        var (d, h) = Rango(desde, hasta);

        var raw = await _db.Cuentas
            .AsNoTracking()
            .Where(c => c.Estado == "Cobrada" && c.FechaCierre >= d && c.FechaCierre < h)
            .Select(c => new { Hora = c.FechaCierre!.Value.Hour, c.Total })
            .ToListAsync(ct);

        var byHour = raw
            .GroupBy(x => x.Hora)
            .ToDictionary(g => g.Key, g => (Total: g.Sum(x => x.Total), Count: g.Count()));

        var result = Enumerable.Range(0, 24).Select(hora =>
        {
            byHour.TryGetValue(hora, out var v);
            return new VentaHoraDto
            {
                Hora            = hora,
                TotalVentas     = v.Total,
                CantidadCuentas = v.Count,
            };
        }).ToList();

        return Ok(result);
    }

    // GET /api/Reportes/metodos-pago
    [HttpGet("metodos-pago")]
    public async Task<IActionResult> MetodosPago(
        [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta, CancellationToken ct)
    {
        var (d, h) = Rango(desde, hasta);

        var cuentas = await _db.Cuentas
            .AsNoTracking()
            .Where(c => c.Estado == "Cobrada" && c.FechaCierre >= d && c.FechaCierre < h)
            .Select(c => new { c.MetodoPago, c.Total })
            .ToListAsync(ct);

        var grandTotal = cuentas.Sum(x => x.Total);

        MetodoPagoItemDto Calc(Func<string?, bool> pred)
        {
            var subset = cuentas.Where(x => pred(x.MetodoPago)).ToList();
            var t = subset.Sum(x => x.Total);
            return new MetodoPagoItemDto
            {
                Total      = t,
                Cuentas    = subset.Count,
                Porcentaje = grandTotal > 0 ? Math.Round(t / grandTotal * 100, 2) : 0,
            };
        }

        return Ok(new MetodosPagoReporteDto
        {
            Efectivo = Calc(m => m == "Efectivo"),
            Tarjeta  = Calc(m => m == "Tarjeta"),
            Mixto    = Calc(m => m != "Efectivo" && m != "Tarjeta"),
        });
    }

    // GET /api/Reportes/productos-vendidos-hoy
    // Vista "productos vendidos hoy" — actualizada en tiempo real (auto-refresh frontend cada 30s)
    [HttpGet("productos-vendidos-hoy")]
    public async Task<IActionResult> ProductosVendidosHoy(CancellationToken ct = default)
    {
        var hoy = DateTime.Today;
        var manana = hoy.AddDays(1);

        var detalles = await _db.OrdenDetalles
            .AsNoTracking()
            .Include(d => d.Producto).ThenInclude(p => p!.Categoria)
            .Include(d => d.Orden).ThenInclude(o => o!.Cuenta)
            .Where(d => d.Orden!.Cuenta!.Estado == "Cobrada"
                     && d.Orden.Cuenta.FechaCierre >= hoy
                     && d.Orden.Cuenta.FechaCierre <  manana)
            .ToListAsync(ct);

        var agrupado = detalles
            .GroupBy(d => new {
                d.ProductoId,
                Nombre    = d.Producto!.Nombre,
                Categoria = d.Producto.Categoria!.Nombre,
                Color     = d.Producto.Categoria.ColorHex
            })
            .Select(g => new {
                productoId      = g.Key.ProductoId,
                nombre          = g.Key.Nombre,
                categoria       = g.Key.Categoria,
                color           = g.Key.Color,
                cantidadVendida = g.Sum(x => x.Cantidad),
                totalAcumulado  = g.Sum(x => x.Subtotal),
            })
            .OrderByDescending(x => x.cantidadVendida)
            .ToList();

        var totalHoy = detalles.Sum(d => d.Subtotal);

        return Ok(new { totalHoy, productos = agrupado });
    }

    // GET /api/Reportes/exportar-csv?tipo=resumen|productos|meseros&desde=&hasta=
    [HttpGet("exportar-csv")]
    public async Task<IActionResult> ExportarCsv(
        [FromQuery] string tipo = "resumen",
        [FromQuery] DateTime? desde = null,
        [FromQuery] DateTime? hasta = null,
        CancellationToken ct = default)
    {
        var (d, h) = Rango(desde, hasta);
        var sb = new StringBuilder();

        switch (tipo.ToLowerInvariant())
        {
            case "resumen":
            {
                sb.AppendLine("Fecha,Cuentas,Total");
                var cuentas = await _db.Cuentas
                    .AsNoTracking()
                    .Where(c => c.Estado == "Cobrada" && c.FechaCierre >= d && c.FechaCierre < h)
                    .Select(c => new { Dia = c.FechaCierre!.Value.Date, c.Total })
                    .ToListAsync(ct);

                foreach (var row in cuentas.GroupBy(x => x.Dia).OrderBy(g => g.Key))
                    sb.AppendLine($"{row.Key:yyyy-MM-dd},{row.Count()},{row.Sum(x => x.Total):F2}");
                break;
            }
            case "productos":
            {
                sb.AppendLine("#,Producto,Categoría,Unidades,Total $,% del Total");
                var raw = await _db.OrdenDetalles
                    .AsNoTracking()
                    .Where(x => x.Orden!.Cuenta!.Estado == "Cobrada"
                             && x.Orden.Cuenta.FechaCierre >= d
                             && x.Orden.Cuenta.FechaCierre < h)
                    .Select(x => new {
                        x.ProductoId,
                        PN = x.Producto!.Nombre,
                        CN = x.Producto.Categoria!.Nombre,
                        x.Cantidad, x.Subtotal
                    })
                    .ToListAsync(ct);

                var gt = raw.Sum(x => x.Subtotal);
                var items = raw
                    .GroupBy(x => new { x.ProductoId, x.PN, x.CN })
                    .Select(g => new {
                        g.Key.PN, g.Key.CN,
                        Uni = g.Sum(x => x.Cantidad),
                        Tot = g.Sum(x => x.Subtotal),
                        Pct = gt > 0 ? g.Sum(x => x.Subtotal) / gt * 100 : 0,
                    })
                    .OrderByDescending(x => x.Uni)
                    .ToList();

                int rank = 1;
                foreach (var p in items)
                    sb.AppendLine($"{rank++},{EscCsv(p.PN)},{EscCsv(p.CN)},{p.Uni},{p.Tot:F2},{p.Pct:F2}");
                break;
            }
            case "meseros":
            {
                sb.AppendLine("Mesera/Barman,Cuentas,Total $,Ticket Promedio,% del Total");
                var raw = await _db.Cuentas
                    .AsNoTracking()
                    .Where(c => c.Estado == "Cobrada" && c.FechaCierre >= d && c.FechaCierre < h)
                    .Select(c => new { Nombre = c.Mesera!.Nombre, c.Total })
                    .ToListAsync(ct);

                var gt = raw.Sum(x => x.Total);
                var items = raw
                    .GroupBy(x => x.Nombre)
                    .Select(g => new {
                        Nombre = g.Key,
                        Cnt = g.Count(),
                        Tot = g.Sum(x => x.Total),
                        Pct = gt > 0 ? g.Sum(x => x.Total) / gt * 100 : 0,
                    })
                    .OrderByDescending(x => x.Tot)
                    .ToList();

                foreach (var m in items)
                    sb.AppendLine($"{EscCsv(m.Nombre)},{m.Cnt},{m.Tot:F2},{(m.Cnt > 0 ? m.Tot / m.Cnt : 0):F2},{m.Pct:F2}");
                break;
            }
            default:
                return BadRequest(new { message = "Tipo no válido. Use: resumen, productos, meseros" });
        }

        var enc   = new UTF8Encoding(true);
        var bytes = enc.GetPreamble().Concat(enc.GetBytes(sb.ToString())).ToArray();
        var name  = $"reporte-{tipo}-{d:yyyyMMdd}.csv";
        return File(bytes, "text/csv; charset=utf-8", name);
    }

    // ════════════════════════════════════════════════════════════════════════
    // ENDPOINTS LEGACY (mobile app — sin cambios)
    // ════════════════════════════════════════════════════════════════════════

    [HttpGet("ventas-dia")]
    [AllowAnonymous]
    public async Task<ActionResult> ObtenerVentasDelDia([FromQuery] DateTime? fecha = null)
    {
        var f      = fecha ?? DateTime.Today;
        var inicio = f.Date;
        var fin    = inicio.AddDays(1);

        var cuentas = await _db.Cuentas
            .AsNoTracking()
            .Where(c => c.Estado == "Cobrada" && c.FechaCierre >= inicio && c.FechaCierre < fin)
            .ToListAsync();

        var totalVentas   = cuentas.Sum(c => c.Total);
        var totalEfectivo = cuentas.Where(c => c.MetodoPago == "Efectivo" || c.MetodoPago == "Mixto").Sum(c => c.MontoEfectivo ?? 0);
        var totalTarjeta  = cuentas.Where(c => c.MetodoPago == "Tarjeta"  || c.MetodoPago == "Mixto").Sum(c => c.MontoTarjeta  ?? 0);

        return Ok(new
        {
            fecha           = f.ToString("yyyy-MM-dd"),
            cantidadCuentas = cuentas.Count,
            totalVentas,
            totalEfectivo,
            totalTarjeta,
            ticketPromedio  = cuentas.Any() ? totalVentas / cuentas.Count : 0
        });
    }

    [HttpGet("productos-mas-vendidos")]
    [AllowAnonymous]
    public async Task<ActionResult> ObtenerProductosMasVendidos(
        [FromQuery] DateTime? desde = null,
        [FromQuery] DateTime? hasta = null,
        [FromQuery] int top = 20)
    {
        var fechaInicio = desde ?? DateTime.Today;
        var fechaFin    = hasta ?? DateTime.Today.AddDays(1);

        var productos = await _db.OrdenDetalles
            .AsNoTracking()
            .Include(d => d.Producto).ThenInclude(p => p!.Categoria)
            .Include(d => d.Orden).ThenInclude(o => o!.Cuenta)
            .Where(d => d.Orden!.Cuenta!.Estado == "Cobrada"
                     && d.Orden.Cuenta.FechaCierre >= fechaInicio
                     && d.Orden.Cuenta.FechaCierre <= fechaFin)
            .GroupBy(d => new { d.ProductoId, d.Producto!.Nombre, Categoria = d.Producto.Categoria!.Nombre })
            .Select(g => new {
                ProductoId     = g.Key.ProductoId,
                Nombre         = g.Key.Nombre,
                Categoria      = g.Key.Categoria,
                TotalVendido   = g.Sum(x => x.Cantidad),
                TotalIngresos  = g.Sum(x => x.Subtotal)
            })
            .OrderByDescending(x => x.TotalVendido)
            .Take(top)
            .ToListAsync();

        return Ok(productos);
    }

    [HttpGet("ventas-categoria")]
    [AllowAnonymous]
    public async Task<ActionResult> ObtenerVentasPorCategoria([FromQuery] DateTime? fecha = null)
    {
        var f      = fecha ?? DateTime.Today;
        var inicio = f.Date;
        var fin    = inicio.AddDays(1);

        var ventasCategoria = await _db.OrdenDetalles
            .AsNoTracking()
            .Include(d => d.Producto).ThenInclude(p => p!.Categoria)
            .Include(d => d.Orden).ThenInclude(o => o!.Cuenta)
            .Where(d => d.Orden!.Cuenta!.Estado == "Cobrada"
                     && d.Orden.Cuenta.FechaCierre >= inicio
                     && d.Orden.Cuenta.FechaCierre < fin)
            .GroupBy(d => d.Producto!.Categoria!.Nombre)
            .Select(g => new {
                Categoria       = g.Key,
                CantidadVendida = g.Sum(x => x.Cantidad),
                TotalIngresos   = g.Sum(x => x.Subtotal)
            })
            .OrderByDescending(x => x.TotalIngresos)
            .ToListAsync();

        return Ok(ventasCategoria);
    }

    [HttpGet("ventas-mesera")]
    [AllowAnonymous]
    public async Task<ActionResult> ObtenerVentasPorMesera([FromQuery] DateTime? fecha = null)
    {
        var f      = fecha ?? DateTime.Today;
        var inicio = f.Date;
        var fin    = inicio.AddDays(1);

        var ventasMesera = await _db.Cuentas
            .AsNoTracking()
            .Include(c => c.Mesera)
            .Where(c => c.Estado == "Cobrada" && c.FechaCierre >= inicio && c.FechaCierre < fin)
            .GroupBy(c => new { c.MeseraId, c.Mesera!.Nombre })
            .Select(g => new {
                MeseraId        = g.Key.MeseraId,
                Nombre          = g.Key.Nombre,
                CantidadCuentas = g.Count(),
                TotalVendido    = g.Sum(x => x.Total)
            })
            .OrderByDescending(x => x.TotalVendido)
            .ToListAsync();

        return Ok(ventasMesera);
    }

    [HttpGet("ventas-semana")]
    [AllowAnonymous]
    public async Task<ActionResult> ObtenerVentasSemana()
    {
        var hace7Dias = DateTime.Today.AddDays(-6);

        var ventas = await _db.Cuentas
            .AsNoTracking()
            .Where(c => c.Estado == "Cobrada" && c.FechaCierre >= hace7Dias)
            .ToListAsync();

        var ventasPorDia = ventas
            .GroupBy(c => c.FechaCierre!.Value.Date)
            .Select(g => new {
                Fecha           = g.Key.ToString("yyyy-MM-dd"),
                DiaSemana       = g.Key.ToString("dddd"),
                CantidadCuentas = g.Count(),
                TotalVendido    = g.Sum(x => x.Total)
            })
            .OrderBy(x => x.Fecha)
            .ToList();

        return Ok(ventasPorDia);
    }

    [HttpGet("resumen-movil")]
    [AllowAnonymous]
    public async Task<ActionResult> ObtenerResumenMovil()
    {
        var hoy    = DateTime.Today;
        var manana = hoy.AddDays(1);

        var cuentasHoy = await _db.Cuentas
            .AsNoTracking()
            .Where(c => c.Estado == "Cobrada" && c.FechaCierre >= hoy && c.FechaCierre < manana)
            .ToListAsync();

        var cuentasAbiertas  = await _db.Cuentas.CountAsync(c => c.Estado == "Abierta");
        var totalEnMesas     = await _db.Cuentas.Where(c => c.Estado == "Abierta").SumAsync(c => c.Total);

        return Ok(new
        {
            ventasHoy               = cuentasHoy.Sum(c => c.Total),
            cuentasCerradasHoy      = cuentasHoy.Count,
            cuentasAbiertas,
            totalEnMesasAbiertas    = totalEnMesas,
            ticketPromedio          = cuentasHoy.Any() ? cuentasHoy.Sum(c => c.Total) / cuentasHoy.Count : 0
        });
    }
}
