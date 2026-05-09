using BarAvenida.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BarAvenida.API.Controllers;

[ApiController]
[Route("api/admin/monitor-ventas")]
[Authorize(Roles = "Admin")]
public class MonitorVentasController : ControllerBase
{
    private readonly BarAvenidaDbContext _db;

    public MonitorVentasController(BarAvenidaDbContext db) => _db = db;

    private static readonly HashSet<string> CategoriasOtros =
        new(StringComparer.OrdinalIgnoreCase) { "Botanas", "Cigarros", "Servicios" };

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string periodo = "hoy",
        CancellationToken ct = default)
    {
        var ahora = DateTime.Now;
        DateTime desde, hasta;

        switch (periodo.ToLower())
        {
            case "ayer":
                desde = ahora.Date.AddDays(-1);
                hasta = ahora.Date;
                break;
            case "semana":
                desde = ahora.Date.AddDays(-6);
                hasta = ahora.Date.AddDays(1);
                break;
            case "mes":
                desde = new DateTime(ahora.Year, ahora.Month, 1);
                hasta = ahora.Date.AddDays(1);
                break;
            case "turno":
                var turno = await _db.CajaTurnos
                    .Where(t => t.Estado == "Abierto")
                    .OrderByDescending(t => t.FechaApertura)
                    .FirstOrDefaultAsync(ct);
                desde = turno?.FechaApertura ?? ahora.Date;
                hasta = ahora.AddHours(1);
                break;
            default: // "hoy"
                desde = ahora.Date;
                hasta = ahora.Date.AddDays(1);
                break;
        }

        // Cuentas cobradas en el periodo
        var cuentas = await _db.Cuentas
            .Where(c => c.Estado == "Cobrada"
                     && c.FechaCierre != null
                     && c.FechaCierre >= desde
                     && c.FechaCierre <  hasta)
            .Select(c => new
            {
                c.Id,
                c.Total,
                c.MesaId,
                c.Area,
                MesaArea = c.Mesa != null && c.Mesa.Area != null ? c.Mesa.Area.Nombre : (string?)null,
            })
            .ToListAsync(ct);

        if (cuentas.Count == 0)
        {
            return Ok(new
            {
                periodo,
                rangoFechas     = new { desde, hasta = hasta > ahora ? ahora : hasta },
                ventaTotal      = 0m,
                deltaVsAyer     = (decimal?)null,
                cuentasPagadas  = 0,
                porTipoProducto = Array.Empty<object>(),
                porTipoServicio = Array.Empty<object>(),
                porArea         = Array.Empty<object>(),
                porCategoria    = Array.Empty<object>(),
            });
        }

        decimal ventaTotal     = cuentas.Sum(c => c.Total);
        int     cuentasPagadas = cuentas.Count;

        // Delta vs ayer (solo para "hoy" y "turno")
        decimal? deltaVsAyer = null;
        if (periodo is "hoy" or "turno")
        {
            var ventasAyer = await _db.Cuentas
                .Where(c => c.Estado == "Cobrada"
                         && c.FechaCierre != null
                         && c.FechaCierre >= desde.AddDays(-1)
                         && c.FechaCierre <  desde)
                .SumAsync(c => c.Total, ct);

            deltaVsAyer = ventasAyer == 0
                ? (ventaTotal > 0 ? 100m : 0m)
                : Math.Round(((ventaTotal - ventasAyer) / ventasAyer) * 100m, 1);
        }

        var cuentaIds = cuentas.Select(c => c.Id).ToList();

        // Detalles de órdenes de esas cuentas
        var detalles = await _db.OrdenDetalles
            .Include(d => d.Orden)
            .Include(d => d.Producto)
                .ThenInclude(p => p!.Categoria)
            .Where(d => _db.Ordenes
                .Where(o => cuentaIds.Contains(o.CuentaId))
                .Select(o => o.Id)
                .Contains(d.OrdenId))
            .Select(d => new
            {
                CuentaId      = d.Orden!.CuentaId,
                CategoriaNombre = d.Producto!.Categoria!.Nombre,
                Subtotal      = d.Subtotal,
            })
            .ToListAsync(ct);

        // Por tipo de producto (Bebidas / Otros)
        var montoTotal = detalles.Sum(d => d.Subtotal);

        var porTipoProducto = detalles
            .GroupBy(d => CategoriasOtros.Contains(d.CategoriaNombre) ? "Otros" : "Bebidas")
            .Select(g => new
            {
                tipo       = g.Key,
                monto      = g.Sum(d => d.Subtotal),
                porcentaje = montoTotal > 0
                    ? Math.Round(g.Sum(d => d.Subtotal) / montoTotal * 100m, 1)
                    : 0m,
            })
            .OrderByDescending(x => x.monto)
            .ToList<object>();

        // Por tipo de servicio (Mesa / Barra)
        var porTipoServicio = cuentas
            .GroupBy(c => c.MesaId == null ? "Barra" : "Mesa")
            .Select(g => new
            {
                tipo       = g.Key,
                monto      = g.Sum(c => c.Total),
                porcentaje = ventaTotal > 0
                    ? Math.Round(g.Sum(c => c.Total) / ventaTotal * 100m, 1)
                    : 0m,
                cuentas    = g.Count(),
            })
            .OrderByDescending(x => x.monto)
            .ToList<object>();

        // Por área (usa Cuenta.Area si está, sino mesa.area, sino "Sin área")
        var porArea = cuentas
            .GroupBy(c => !string.IsNullOrWhiteSpace(c.Area)
                ? c.Area
                : (c.MesaArea ?? "Sin área"))
            .Select(g => new
            {
                area       = g.Key.ToUpperInvariant(),
                monto      = g.Sum(c => c.Total),
                porcentaje = ventaTotal > 0
                    ? Math.Round(g.Sum(c => c.Total) / ventaTotal * 100m, 1)
                    : 0m,
                cuentas    = g.Count(),
            })
            .OrderByDescending(x => x.monto)
            .ToList<object>();

        // Por categoría de producto
        var porCategoria = detalles
            .GroupBy(d => d.CategoriaNombre)
            .Select(g => new
            {
                categoria  = g.Key,
                monto      = g.Sum(d => d.Subtotal),
                porcentaje = montoTotal > 0
                    ? Math.Round(g.Sum(d => d.Subtotal) / montoTotal * 100m, 1)
                    : 0m,
            })
            .OrderByDescending(x => x.monto)
            .ToList<object>();

        return Ok(new
        {
            periodo,
            rangoFechas     = new { desde, hasta = hasta > ahora ? ahora : hasta },
            ventaTotal,
            deltaVsAyer,
            cuentasPagadas,
            porTipoProducto,
            porTipoServicio,
            porArea,
            porCategoria,
        });
    }
}
