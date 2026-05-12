using BarAvenida.API.Data;
using BarAvenida.API.DTOs;
using BarAvenida.API.Helpers;
using BarAvenida.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace BarAvenida.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private const int MaxIntentosFallidos = 5;
    private static readonly TimeSpan LockoutDuracion = TimeSpan.FromMinutes(5);

    private readonly BarAvenidaDbContext _context;
    private readonly JwtHelper _jwtHelper;
    private readonly IAuditoriaService _audit;

    public AuthController(
        BarAvenidaDbContext context,
        JwtHelper jwtHelper,
        IAuditoriaService audit)
    {
        _context  = context;
        _jwtHelper = jwtHelper;
        _audit    = audit;
    }

    /// <summary>
    /// Login con código de usuario y PIN.
    /// Aplica lockout tras 5 intentos fallidos, registra auditoría
    /// y mete un delay constante para mitigar timing-attacks.
    /// </summary>
    [HttpPost("login")]
    [EnableRateLimiting("Login")]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginDto dto)
    {
        // Anti-timing — delay constante antes de cualquier respuesta
        var delayTask = Task.Delay(500);

        try
        {
            if (string.IsNullOrEmpty(dto.Codigo) || string.IsNullOrEmpty(dto.Pin))
            {
                await delayTask;
                return BadRequest(new { mensaje = "Código y PIN son requeridos" });
            }

            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(u => u.Codigo == dto.Codigo && u.Activo);

            if (usuario == null)
            {
                await delayTask;
                return Unauthorized(new { mensaje = "Usuario no encontrado o inactivo" });
            }

            // ¿Bloqueado?
            if (usuario.BloqueadoHasta.HasValue && usuario.BloqueadoHasta.Value > DateTime.UtcNow)
            {
                var hasta = usuario.BloqueadoHasta.Value.ToLocalTime()
                    .ToString("HH:mm:ss", CultureInfo.InvariantCulture);
                await delayTask;
                return StatusCode(429, new
                {
                    mensaje       = $"Cuenta bloqueada por intentos fallidos. Reintenta despues de las {hasta}.",
                    bloqueadoHasta = usuario.BloqueadoHasta.Value
                });
            }

            // Validar PIN con BCrypt
            bool pinValido = BCrypt.Net.BCrypt.Verify(dto.Pin, usuario.PinHash);

            if (!pinValido)
            {
                usuario.IntentosFallidos     += 1;
                usuario.UltimoIntentoFallido = DateTime.UtcNow;

                if (usuario.IntentosFallidos >= MaxIntentosFallidos)
                {
                    usuario.BloqueadoHasta = DateTime.UtcNow.Add(LockoutDuracion);

                    await _audit.LogAsync(
                        "Auth",
                        "LoginBloqueado",
                        $"Usuario {usuario.Codigo} bloqueado tras {usuario.IntentosFallidos} intentos fallidos",
                        usuario.Id,
                        usuario.Nombre);
                }
                else
                {
                    await _audit.LogAsync(
                        "Auth",
                        "LoginFallido",
                        $"Intento fallido #{usuario.IntentosFallidos} para usuario {usuario.Codigo}",
                        usuario.Id,
                        usuario.Nombre);
                }

                await _context.SaveChangesAsync();
                await delayTask;
                return Unauthorized(new { mensaje = "PIN incorrecto" });
            }

            // Éxito
            usuario.IntentosFallidos   = 0;
            usuario.UltimoLoginExitoso = DateTime.UtcNow;
            usuario.BloqueadoHasta     = null;
            await _context.SaveChangesAsync();

            var token = _jwtHelper.GenerarToken(usuario, out var expira);

            await delayTask;
            return Ok(new LoginResponseDto
            {
                Id        = usuario.Id,
                Nombre    = usuario.Nombre,
                Codigo    = usuario.Codigo,
                Rol       = usuario.Rol,
                Token     = token,
                ExpiresAt = expira
            });
        }
        catch
        {
            await delayTask;
            throw;
        }
    }

    /// <summary>
    /// Genera un nuevo JWT (8h) para el usuario autenticado.
    /// Útil para que el cliente extienda la sesión sin volver a pedir PIN.
    /// </summary>
    [HttpPost("refresh")]
    [Authorize]
    public async Task<ActionResult<TokenRefreshDto>> Refresh()
    {
        var idStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(idStr, out var userId))
            return Unauthorized(new { mensaje = "Token inválido" });

        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Id == userId && u.Activo);
        if (usuario == null)
            return Unauthorized(new { mensaje = "Usuario no encontrado o inactivo" });

        var token = _jwtHelper.GenerarToken(usuario, out var expira);
        return Ok(new TokenRefreshDto { Token = token, ExpiresAt = expira });
    }

    // POST /api/Auth/cambiar-pin  (usuario autenticado cambia su propio PIN)
    [HttpPost("cambiar-pin")]
    [Authorize]
    public async Task<IActionResult> CambiarPin([FromBody] CambiarPinDto dto)
    {
        if (string.IsNullOrEmpty(dto.PinActual) || string.IsNullOrEmpty(dto.PinNuevo))
            return BadRequest(new { mensaje = "PIN actual y nuevo son requeridos." });

        if (dto.PinNuevo != dto.ConfirmarPin)
            return BadRequest(new { mensaje = "El PIN nuevo y la confirmación no coinciden." });

        var codigo = User.Identity?.Name ?? "";
        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Codigo == codigo && u.Activo);
        if (usuario is null) return Unauthorized(new { mensaje = "Usuario no reconocido." });

        if (!BCrypt.Net.BCrypt.Verify(dto.PinActual, usuario.PinHash))
            return Unauthorized(new { mensaje = "PIN actual incorrecto." });

        // Validar fortaleza (4 dígitos mesera/barman, 6 admin)
        bool esAdmin = usuario.Rol == "Admin";
        var (ok, error) = PinValidator.Validar(dto.PinNuevo, esAdmin);
        if (!ok) return BadRequest(new { mensaje = error });

        usuario.PinHash = BCrypt.Net.BCrypt.HashPassword(dto.PinNuevo);
        await _context.SaveChangesAsync();

        await _audit.LogAsync(
            "Auth",
            esAdmin ? "PinAdminCambiado" : "PinCambiado",
            $"{usuario.Nombre} cambió su propio PIN",
            usuario.Id,
            usuario.Nombre);

        return Ok(new { mensaje = "PIN actualizado correctamente." });
    }

    // POST /api/Auth/validar-pin-admin  (cualquier usuario autenticado puede verificar PIN admin)
    [HttpPost("validar-pin-admin")]
    [Authorize]
    public async Task<IActionResult> ValidarPinAdmin([FromBody] ValidarPinAdminDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Pin))
            return BadRequest(new { mensaje = "PIN requerido" });

        var admins = await _context.Usuarios
            .Where(u => u.Rol == "Admin" && u.Activo)
            .ToListAsync();

        foreach (var admin in admins)
        {
            if (BCrypt.Net.BCrypt.Verify(dto.Pin, admin.PinHash))
                return Ok(new { ok = true, adminId = admin.Id, adminNombre = admin.Nombre });
        }

        return Unauthorized(new { mensaje = "PIN inválido" });
    }

    // POST /api/Auth/cambiar-pin-admin  (Admin cambia PIN de cualquier usuario)
    [HttpPost("cambiar-pin-admin")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CambiarPinAdmin([FromBody] CambiarPinAdminDto dto)
    {
        if (string.IsNullOrEmpty(dto.CodigoUsuario) || string.IsNullOrEmpty(dto.PinNuevo))
            return BadRequest(new { mensaje = "Código de usuario y PIN nuevo son requeridos." });

        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Codigo == dto.CodigoUsuario);
        if (usuario is null) return NotFound(new { mensaje = "Usuario no encontrado." });

        bool esAdmin = usuario.Rol == "Admin";
        var (ok, error) = PinValidator.Validar(dto.PinNuevo, esAdmin);
        if (!ok) return BadRequest(new { mensaje = error });

        usuario.PinHash = BCrypt.Net.BCrypt.HashPassword(dto.PinNuevo);
        // Reset lockout state al cambiar PIN administrativamente
        usuario.IntentosFallidos = 0;
        usuario.BloqueadoHasta   = null;
        await _context.SaveChangesAsync();

        var adminNombre = User.Identity?.Name ?? "Admin";
        await _audit.LogAsync(
            "Auth",
            "PinAdminCambiado",
            $"{adminNombre} cambió el PIN de {usuario.Nombre} ({usuario.Codigo})",
            usuario.Id,
            usuario.Nombre);

        return Ok(new { mensaje = $"PIN de {usuario.Nombre} actualizado correctamente." });
    }
}
