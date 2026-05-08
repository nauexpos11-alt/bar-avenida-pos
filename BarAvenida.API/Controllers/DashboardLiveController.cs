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
        var ahora    = DateTime.Now;
        var hoyDesde = ahora.Date;
        var hoyHasta = hoyDesde.AddDays(1);
        var ayerDesde = hoyDesde.AddDays(-1);
        var ayerHasta = hoyDesde;

        static decimal Delta(decimal hoy, decimal ayer)
        {
            if (ayer == 0) return hoy > 0 ? 100m : 0m;
            return Math.Round(((hoy - ayer) / ayer) * 100m, 1);
        }

        // 1. Cuentas cobradas hoy
        var cuentasHoy = await _db.Cuentas
            .Where(c => c.Estado == "Cobrada"
                     && c.FechaCierre != null
                     && c.FechaCierre >= hoyDesde
                     && c.FechaCierre <  hoyHasta)
            .Select(c => new { c.Id, c.Total, c.MeseraId, c.FechaCierre })
            .ToListAsync();

        // 2. Cuentas cobradas ayer
        var cuentasAyer = await _db.Cuentas
            .Where(c => c.Estado == "Cobrada"
                     && c.FechaCierre != null
                     && c.FechaCierre >= ayerDesde
                     && c.FechaCierre <  ayerHasta)
            .Select(c => new { c.Id, c.Total })
            .ToListAsync();

        decimal ventasHoy  = cuentasHoy.Sum(c => c.Total);
        decimal ventasAyer = cuentasAyer.Sum(c => c.Total);
        int countHoy       = cuentasHoy.Count;
        int countAyer      = cuentasAyer.Count;
        decimal ticketHoy  = countHoy  > 0 ? ventasHoy  / countHoy  : 0;
        decimal ticketAyer = countAyer > 0 ? ventasAyer / countAyer : 0;

        // 3. Ventas por hora (24 buckets, zeros incluidos)
        var ventasPorHora = Enumerable.Range(0, 24)
            .Select(h => new VentaPorHoraDto { Hora = h })
            .ToList();

        foreach (var c in cuentasHoy)
        {
            var slot = ventasPorHora[c.FechaCierre!.Value.Hour];
            slot.Ventas  += c.Total;
            slot.Cuentas += 1;
        }

        // 4. Top productos del dia (via ordenes de cuentas cobradas hoy)
        var cuentasIds = cuentasHoy.Select(c => c.Id).ToList();

        var ordenesIds = await _db.Ordenes
            .Where(o => cuentasIds.Contains(o.CuentaId))
            .Select(o => o.Id)
            .ToListAsync();

        var detallesHoy = await _db.OrdenDetalles
            .Include(d => d.Producto)
            .Where(d => ordenesIds.Contains(d.OrdenId))
            .ToListAsync();

        var topProductos = detallesHoy
            .GroupBy(d => new
            {
                d.ProductoId,
                Nombre = d.Producto != null ? d.Producto.Nombre : "?",
            })
            .Select(g => new TopProductoDto
            {
                ProductoId = g.Key.ProductoId,
                Nombre     = g.Key.Nombre,
                Cantidad   = g.Sum(x => x.Cantidad),
                Total      = g.Sum(x => x.Cantidad * x.PrecioUnitario),
            })
            .OrderByDescending(p => p.Cantidad)
            .Take(5)
            .ToList();

        int totalProductosVendidos = detallesHoy.Sum(d => d.Cantidad);

        // 5. Mesera top del dia
        string? meseraTopNombre = null;
        decimal meseraTopVentas = 0;

        var topMesera = cuentasHoy
            .GroupBy(c => c.MeseraId)
            .Select(g => new { MeseraId = g.Key, Total = g.Sum(c => c.Total) })
            .OrderByDescending(x => x.Total)
            .FirstOrDefault();

        if (topMesera != null)
        {
            var mesera = await _db.Usuarios.FindAsync(topMesera.MeseraId);
            meseraTopNombre = mesera?.Nombre;
            meseraTopVentas = topMesera.Total;
        }

        // 6. Hora pico
        var horaPico = ventasPorHora
            .OrderByDescending(h => h.Ventas)
            .FirstOrDefault();

        return Ok(new DashboardLiveDto
        {
            VentasHoy = new KpiConDeltaDto
            {
                Hoy   = ventasHoy,
                Ayer  = ventasAyer,
                Delta = Delta(ventasHoy, ventasAyer),
            },
            Cuentas = new KpiConDeltaDto
            {
                Hoy   = countHoy,
                Ayer  = countAyer,
                Delta = Delta(countHoy, countAyer),
            },
            TicketPromedio = new KpiConDeltaDto
            {
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
