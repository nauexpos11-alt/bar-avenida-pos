using BarAvenida.API.Data;
using BarAvenida.API.DTOs;
using BarAvenida.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BarAvenida.API.Controllers;

[ApiController]
[Authorize]
public class ReglasCrossSellController : ControllerBase
{
    private readonly BarAvenidaDbContext _db;

    public ReglasCrossSellController(BarAvenidaDbContext db) => _db = db;

    // ── Admin: lista todas ───────────────────────────────────────────────────
    [HttpGet("/api/admin/reglas-crosssell")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Listar()
    {
        var reglas = await _db.ReglasCrossSell
            .Include(r => r.ProductoOrigen)
            .Include(r => r.ProductoSugerido)
            .OrderBy(r => r.ProductoOrigen!.Nombre)
            .ThenBy(r => r.Prioridad)
            .Select(r => new ReglaCrossSellDto {
                Id                     = r.Id,
                ProductoOrigenId       = r.ProductoOrigenId,
                ProductoOrigenNombre   = r.ProductoOrigen!.Nombre,
                ProductoSugeridoId     = r.ProductoSugeridoId,
                ProductoSugeridoNombre = r.ProductoSugerido!.Nombre,
                ProductoSugeridoPrecio = r.ProductoSugerido.Precio,
                Prioridad              = r.Prioridad,
                Activo                 = r.Activo,
            })
            .ToListAsync();

        return Ok(reglas);
    }

    // ── Admin: crear ─────────────────────────────────────────────────────────
    [HttpPost("/api/admin/reglas-crosssell")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Crear([FromBody] CrearReglaCrossSellDto dto)
    {
        if (dto.ProductoOrigenId == dto.ProductoSugeridoId)
            return BadRequest(new { mensaje = "Origen y sugerido no pueden ser el mismo producto." });

        var existe = await _db.ReglasCrossSell.AnyAsync(r =>
            r.ProductoOrigenId   == dto.ProductoOrigenId &&
            r.ProductoSugeridoId == dto.ProductoSugeridoId);
        if (existe) return Conflict(new { mensaje = "Esta regla ya existe." });

        var regla = new ReglaCrossSell {
            ProductoOrigenId   = dto.ProductoOrigenId,
            ProductoSugeridoId = dto.ProductoSugeridoId,
            Prioridad          = dto.Prioridad,
            Activo             = dto.Activo,
        };
        _db.ReglasCrossSell.Add(regla);
        await _db.SaveChangesAsync();

        return Ok(new { id = regla.Id });
    }

    // ── Admin: actualizar (prioridad, activo) ────────────────────────────────
    [HttpPut("/api/admin/reglas-crosssell/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Actualizar(int id, [FromBody] ActualizarReglaCrossSellDto dto)
    {
        var regla = await _db.ReglasCrossSell.FindAsync(id);
        if (regla == null) return NotFound();

        regla.Prioridad = dto.Prioridad;
        regla.Activo    = dto.Activo;
        await _db.SaveChangesAsync();

        return Ok();
    }

    // ── Admin: eliminar ──────────────────────────────────────────────────────
    [HttpDelete("/api/admin/reglas-crosssell/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var regla = await _db.ReglasCrossSell.FindAsync(id);
        if (regla == null) return NotFound();

        _db.ReglasCrossSell.Remove(regla);
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ── Tablet: sugerencias para un producto ─────────────────────────────────
    [HttpGet("/api/Productos/{id}/sugerencias")]
    public async Task<IActionResult> Sugerencias(int id)
    {
        var sugerencias = await _db.ReglasCrossSell
            .Where(r => r.ProductoOrigenId == id && r.Activo)
            .Include(r => r.ProductoSugerido)
            .Where(r => r.ProductoSugerido!.Activo)
            .OrderBy(r => r.Prioridad)
            .Take(3)
            .Select(r => new SugerenciaProductoDto {
                ProductoId = r.ProductoSugeridoId,
                Nombre     = r.ProductoSugerido!.Nombre,
                Precio     = r.ProductoSugerido.Precio,
            })
            .ToListAsync();

        return Ok(sugerencias);
    }
}
