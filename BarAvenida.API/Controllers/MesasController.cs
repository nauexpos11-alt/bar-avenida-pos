using BarAvenida.API.Data;
using BarAvenida.API.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BarAvenida.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MesasController : ControllerBase
{
    private readonly BarAvenidaDbContext _context;

    public MesasController(BarAvenidaDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Obtiene todas las mesas con su estado actual (libre/ocupada)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<MesaDto>>> ObtenerMesas()
    {
        var mesas = await _context.Mesas
            .Include(m => m.Area)
            .Where(m => m.Activa)
            .OrderBy(m => m.AreaId)
            .ThenBy(m => m.Numero.Length)
            .ThenBy(m => m.Numero)
            .ToListAsync();

        var resultado = new List<MesaDto>();

        foreach (var mesa in mesas)
        {
            // Buscar si tiene cuenta activa (Abierta O PorCobrar — ambas significan que la mesa NO esta libre)
            var cuentaAbierta = await _context.Cuentas
                .Include(c => c.Mesera)
                .FirstOrDefaultAsync(c => c.MesaId == mesa.Id
                    && (c.Estado == "Abierta" || c.Estado == "PorCobrar"));

            var dto = new MesaDto
            {
                Id              = mesa.Id,
                Numero          = mesa.Numero,
                AreaId          = mesa.AreaId,
                AreaNombre      = mesa.Area?.Nombre ?? "",
                Capacidad       = mesa.Capacidad,
                Estado          = cuentaAbierta != null ? "Ocupada" : "Libre",
                CuentaActivaId  = cuentaAbierta?.Id,
                TotalActual     = cuentaAbierta?.Total,
                MeseraActual    = cuentaAbierta?.Mesera?.Nombre,
                MeseraActualId  = cuentaAbierta?.MeseraId,
                EstadoCuenta    = cuentaAbierta?.Estado,
                AliasCuenta     = cuentaAbierta?.NombreCliente,
                AreaCuenta      = cuentaAbierta?.Area,
                FechaApertura   = cuentaAbierta?.FechaApertura,
                Folio           = cuentaAbierta?.Folio,
            };

            resultado.Add(dto);
        }

        return Ok(resultado);
    }

    /// <summary>
    /// Obtiene una mesa específica con su estado
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<MesaDto>> ObtenerMesa(int id)
    {
        var mesa = await _context.Mesas
            .Include(m => m.Area)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (mesa == null)
            return NotFound(new { mensaje = "Mesa no encontrada" });

        var cuentaAbierta = await _context.Cuentas
            .Include(c => c.Mesera)
            .FirstOrDefaultAsync(c => c.MesaId == mesa.Id
                && (c.Estado == "Abierta" || c.Estado == "PorCobrar"));

        var dto = new MesaDto
        {
            Id              = mesa.Id,
            Numero          = mesa.Numero,
            AreaId          = mesa.AreaId,
            AreaNombre      = mesa.Area?.Nombre ?? "",
            Capacidad       = mesa.Capacidad,
            Estado          = cuentaAbierta != null ? "Ocupada" : "Libre",
            CuentaActivaId  = cuentaAbierta?.Id,
            TotalActual     = cuentaAbierta?.Total,
            MeseraActual    = cuentaAbierta?.Mesera?.Nombre,
            MeseraActualId  = cuentaAbierta?.MeseraId,
            EstadoCuenta    = cuentaAbierta?.Estado,
            AliasCuenta     = cuentaAbierta?.NombreCliente,
            FechaApertura   = cuentaAbierta?.FechaApertura,
            Folio           = cuentaAbierta?.Folio,
        };

        return Ok(dto);
    }
}
