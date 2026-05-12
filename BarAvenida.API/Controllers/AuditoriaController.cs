using BarAvenida.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BarAvenida.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AuditoriaController : ControllerBase
{
    private readonly BarAvenidaDbContext _db;

    public AuditoriaController(BarAvenidaDbContext db) => _db = db;

    // GET /api/Auditoria?desde=&hasta=&categoria=&tipo=&usuarioId=&page=1&pageSize=50
    [HttpGet]
    public async Task<IActionResult> Listar(
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        [FromQuery] string?   categoria,
        [FromQuery] string?   tipo,
        [FromQuery] int?      usuarioId,
        [FromQuery] int       page = 1,
        [FromQuery] int       pageSize = 50,
        CancellationToken     ct = default)
    {
        if (page     < 1)   page     = 1;
        if (pageSize < 1)   pageSize = 50;
        if (pageSize > 200) pageSize = 200;

        var q = _db.EventosAuditoria.AsQueryable();

        if (desde.HasValue)                q = q.Where(e => e.Fecha >= desde.Value);
        if (hasta.HasValue)                q = q.Where(e => e.Fecha <= hasta.Value);
        if (!string.IsNullOrWhiteSpace(categoria)) q = q.Where(e => e.Categoria == categoria);
        if (!string.IsNullOrWhiteSpace(tipo))      q = q.Where(e => e.Tipo == tipo);
        if (usuarioId.HasValue)            q = q.Where(e => e.UsuarioId == usuarioId.Value);

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(e => e.Fecha)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new
            {
                e.Id,
                e.Fecha,
                e.Categoria,
                e.Tipo,
                e.UsuarioId,
                e.UsuarioNombre,
                e.Descripcion,
                e.IpOrigen,
                e.Detalles,
            })
            .ToListAsync(ct);

        return Ok(new { total, page, pageSize, items });
    }

    // GET /api/Auditoria/tipos — devuelve catálogo de Categoria + Tipo distintos
    [HttpGet("tipos")]
    public async Task<IActionResult> GetTipos(CancellationToken ct)
    {
        var combos = await _db.EventosAuditoria
            .Select(e => new { e.Categoria, e.Tipo })
            .Distinct()
            .OrderBy(x => x.Categoria).ThenBy(x => x.Tipo)
            .ToListAsync(ct);

        var categorias = combos.Select(c => c.Categoria).Distinct().OrderBy(x => x).ToList();
        return Ok(new { categorias, combos });
    }
}
