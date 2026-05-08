using BarAvenida.API.Data;
using BarAvenida.API.DTOs;
using BarAvenida.API.Hubs;
using BarAvenida.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BarAvenida.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SolicitudesCancelacionController : ControllerBase
{
    private readonly BarAvenidaDbContext _context;
    private readonly IHubContext<BarHub> _hub;

    public SolicitudesCancelacionController(BarAvenidaDbContext context, IHubContext<BarHub> hub)
    {
        _context = context;
        _hub = hub;
    }

    // GET /api/SolicitudesCancelacion/pendientes
    [HttpGet("pendientes")]
    public async Task<IActionResult> GetPendientes()
    {
        var solicitudes = await _context.SolicitudesCancelacion
            .Include(s => s.Cuenta)
            .Include(s => s.Mesa)
            .Include(s => s.Mesera)
            .Where(s => s.Estado == "Pendiente")
            .OrderBy(s => s.FechaSolicitud)
            .ToListAsync();

        var result = new List<SolicitudCompletaDto>();

        foreach (var s in solicitudes)
        {
            var dto = new SolicitudCompletaDto
            {
                Id = s.Id,
                CuentaId = s.CuentaId,
                MesaId = s.MesaId,
                Folio = s.Cuenta?.Folio ?? 0,
                MesaNumero = s.Mesa?.Numero.ToString() ?? "",
                MeseraNombre = s.Mesera?.Nombre ?? "",
                Tipo = s.Tipo,
                Motivo = s.Motivo,
                Estado = s.Estado,
                FechaSolicitud = s.FechaSolicitud,
                Productos = new List<DetalleSolicitudDto>()
            };

            if (s.Tipo == "Producto" && !string.IsNullOrEmpty(s.DetallesIds))
            {
                var ids = s.DetallesIds.Split(',')
                    .Select(x => int.TryParse(x.Trim(), out var v) ? v : 0)
                    .Where(x => x > 0)
                    .ToList();

                var detalles = await _context.OrdenDetalles
                    .Include(d => d.Producto)
                    .Where(d => ids.Contains(d.Id))
                    .ToListAsync();

                dto.Productos = detalles.Select(d => new DetalleSolicitudDto
                {
                    OrdenDetalleId = d.Id,
                    ProductoNombre = d.Producto?.Nombre ?? "",
                    Cantidad = d.Cantidad,
                    Subtotal = d.Subtotal
                }).ToList();

                dto.MontoTotal = dto.Productos.Sum(p => p.Subtotal);
            }
            else if (s.Tipo == "Cuenta")
            {
                dto.MontoTotal = s.Cuenta?.Total ?? 0;
            }

            result.Add(dto);
        }

        return Ok(result);
    }

    // POST /api/SolicitudesCancelacion/{id}/aprobar
    [HttpPost("{id}/aprobar")]
    public async Task<IActionResult> Aprobar(int id)
    {
        var solicitud = await _context.SolicitudesCancelacion
            .Include(s => s.Cuenta)
                .ThenInclude(c => c!.Ordenes)
                    .ThenInclude(o => o.Detalles)
            .Include(s => s.Mesa)
            .Include(s => s.Mesera)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (solicitud == null)
            return NotFound(new { mensaje = "Solicitud no encontrada" });

        if (solicitud.Estado != "Pendiente")
            return BadRequest(new { mensaje = "La solicitud ya fue resuelta" });

        var adminIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        solicitud.AdminId = int.TryParse(adminIdStr, out var aId) ? aId : null;
        solicitud.Estado = "Aprobada";
        solicitud.FechaResolucion = DateTime.Now;

        if (solicitud.Tipo == "Producto")
        {
            var ids = (solicitud.DetallesIds ?? "")
                .Split(',')
                .Select(x => int.TryParse(x.Trim(), out var v) ? v : 0)
                .Where(x => x > 0)
                .ToList();

            var detalles = await _context.OrdenDetalles
                .Where(d => ids.Contains(d.Id))
                .ToListAsync();

            _context.OrdenDetalles.RemoveRange(detalles);
            await _context.SaveChangesAsync();

            // Recalculate cuenta total
            var cuenta = await _context.Cuentas
                .Include(c => c.Ordenes)
                    .ThenInclude(o => o.Detalles)
                .FirstOrDefaultAsync(c => c.Id == solicitud.CuentaId);

            if (cuenta != null)
            {
                cuenta.Total = cuenta.Ordenes.SelectMany(o => o.Detalles).Sum(d => d.Subtotal);
                await _context.SaveChangesAsync();
            }
        }
        else if (solicitud.Tipo == "Cuenta")
        {
            var cuenta = solicitud.Cuenta;
            if (cuenta != null)
            {
                cuenta.Estado = "Cancelada";
                cuenta.FechaCierre = DateTime.Now;

            }
        }

        await _context.SaveChangesAsync();

        var payload = new
        {
            id = solicitud.Id,
            estado = "Aprobada",
            mesaId = solicitud.MesaId,
            tipo = solicitud.Tipo
        };

        await _hub.Clients.Group("Meseras").SendAsync("SolicitudResuelta", payload);
        await _hub.Clients.Group("Admin").SendAsync("SolicitudResuelta", payload);

        return Ok(new { mensaje = "Solicitud aprobada" });
    }

    // POST /api/SolicitudesCancelacion/{id}/rechazar
    [HttpPost("{id}/rechazar")]
    public async Task<IActionResult> Rechazar(int id)
    {
        var solicitud = await _context.SolicitudesCancelacion
            .FirstOrDefaultAsync(s => s.Id == id);

        if (solicitud == null)
            return NotFound(new { mensaje = "Solicitud no encontrada" });

        if (solicitud.Estado != "Pendiente")
            return BadRequest(new { mensaje = "La solicitud ya fue resuelta" });

        var adminIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        solicitud.AdminId = int.TryParse(adminIdStr, out var aId) ? aId : null;
        solicitud.Estado = "Rechazada";
        solicitud.FechaResolucion = DateTime.Now;

        await _context.SaveChangesAsync();

        var payload = new
        {
            id = solicitud.Id,
            estado = "Rechazada",
            mesaId = solicitud.MesaId,
            tipo = solicitud.Tipo
        };

        await _hub.Clients.Group("Meseras").SendAsync("SolicitudResuelta", payload);
        await _hub.Clients.Group("Admin").SendAsync("SolicitudResuelta", payload);

        return Ok(new { mensaje = "Solicitud rechazada" });
    }
}
