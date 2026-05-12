using BarAvenida.API.Data;
using BarAvenida.API.Models;
using Microsoft.AspNetCore.Http;

namespace BarAvenida.API.Services;

public interface IAuditoriaService
{
    Task LogAsync(
        string categoria,
        string tipo,
        string descripcion,
        int? usuarioId = null,
        string usuarioNombre = "",
        string? detallesJson = null);
}

/// <summary>
/// Inserta eventos de auditoría con la IP del request actual (si existe).
/// Cualquier excepción se loguea pero NO se propaga: la auditoría
/// nunca debe romper el flujo de negocio.
/// </summary>
public class AuditoriaService : IAuditoriaService
{
    private readonly BarAvenidaDbContext _db;
    private readonly IHttpContextAccessor _http;
    private readonly ILogger<AuditoriaService> _log;

    public AuditoriaService(
        BarAvenidaDbContext db,
        IHttpContextAccessor http,
        ILogger<AuditoriaService> log)
    {
        _db   = db;
        _http = http;
        _log  = log;
    }

    public async Task LogAsync(
        string categoria,
        string tipo,
        string descripcion,
        int? usuarioId = null,
        string usuarioNombre = "",
        string? detallesJson = null)
    {
        try
        {
            string? ip = null;
            try
            {
                ip = _http.HttpContext?.Connection?.RemoteIpAddress?.ToString();
            }
            catch { /* ignore */ }

            var ev = new EventoAuditoria
            {
                Fecha         = DateTime.UtcNow,
                Categoria     = (categoria ?? "").Length > 40 ? categoria![..40] : (categoria ?? ""),
                Tipo          = (tipo ?? "").Length > 60 ? tipo![..60] : (tipo ?? ""),
                UsuarioId     = usuarioId,
                UsuarioNombre = (usuarioNombre ?? "").Length > 80 ? usuarioNombre![..80] : (usuarioNombre ?? ""),
                Descripcion   = (descripcion ?? "").Length > 500 ? descripcion![..500] : (descripcion ?? ""),
                IpOrigen      = ip is { Length: > 0 } && ip.Length <= 64 ? ip : ip?[..Math.Min(64, ip.Length)],
                Detalles      = detallesJson,
            };

            _db.EventosAuditoria.Add(ev);
            await _db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex,
                "AuditoriaService.LogAsync falló (cat={Cat}, tipo={Tipo}) — se ignora",
                categoria, tipo);
        }
    }
}
