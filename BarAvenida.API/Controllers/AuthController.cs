using BarAvenida.API.Data;
using BarAvenida.API.DTOs;
using BarAvenida.API.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BarAvenida.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly BarAvenidaDbContext _context;
    private readonly JwtHelper _jwtHelper;

    public AuthController(BarAvenidaDbContext context, JwtHelper jwtHelper)
    {
        _context = context;
        _jwtHelper = jwtHelper;
    }

    /// <summary>
    /// Login con código de usuario y PIN
    /// </summary>
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginDto dto)
    {
        if (string.IsNullOrEmpty(dto.Codigo) || string.IsNullOrEmpty(dto.Pin))
            return BadRequest(new { mensaje = "Código y PIN son requeridos" });

        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Codigo == dto.Codigo && u.Activo);

        if (usuario == null)
            return Unauthorized(new { mensaje = "Usuario no encontrado o inactivo" });

        // Validar PIN con BCrypt
        bool pinValido = BCrypt.Net.BCrypt.Verify(dto.Pin, usuario.PinHash);
        if (!pinValido)
            return Unauthorized(new { mensaje = "PIN incorrecto" });

        // Generar token
        var token = _jwtHelper.GenerarToken(usuario);

        return Ok(new LoginResponseDto
        {
            Id = usuario.Id,
            Nombre = usuario.Nombre,
            Codigo = usuario.Codigo,
            Rol = usuario.Rol,
            Token = token
        });
    }

    // POST /api/Auth/cambiar-pin  (usuario autenticado cambia su propio PIN)
    [HttpPost("cambiar-pin")]
    [Authorize]
    public async Task<IActionResult> CambiarPin([FromBody] CambiarPinDto dto)
    {
        if (string.IsNullOrEmpty(dto.PinActual) || string.IsNullOrEmpty(dto.PinNuevo))
            return BadRequest(new { mensaje = "PIN actual y nuevo son requeridos." });

        if (dto.PinNuevo.Length < 4)
            return BadRequest(new { mensaje = "El PIN nuevo debe tener al menos 4 dígitos." });

        if (dto.PinNuevo != dto.ConfirmarPin)
            return BadRequest(new { mensaje = "El PIN nuevo y la confirmación no coinciden." });

        var codigo = User.Identity?.Name ?? "";
        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Codigo == codigo && u.Activo);
        if (usuario is null) return Unauthorized(new { mensaje = "Usuario no reconocido." });

        if (!BCrypt.Net.BCrypt.Verify(dto.PinActual, usuario.PinHash))
            return Unauthorized(new { mensaje = "PIN actual incorrecto." });

        usuario.PinHash = BCrypt.Net.BCrypt.HashPassword(dto.PinNuevo);
        await _context.SaveChangesAsync();

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

        if (dto.PinNuevo.Length < 4)
            return BadRequest(new { mensaje = "El PIN debe tener al menos 4 dígitos." });

        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Codigo == dto.CodigoUsuario);
        if (usuario is null) return NotFound(new { mensaje = "Usuario no encontrado." });

        usuario.PinHash = BCrypt.Net.BCrypt.HashPassword(dto.PinNuevo);
        await _context.SaveChangesAsync();

        return Ok(new { mensaje = $"PIN de {usuario.Nombre} actualizado correctamente." });
    }
}
