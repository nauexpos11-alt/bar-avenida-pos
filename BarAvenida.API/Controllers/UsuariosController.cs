using BarAvenida.API.Data;
using BarAvenida.API.DTOs;
using BarAvenida.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BarAvenida.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsuariosController : ControllerBase
{
    private readonly BarAvenidaDbContext _db;

    public UsuariosController(BarAvenidaDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var lista = await _db.Usuarios
            .OrderBy(u => u.Id)
            .Select(u => new UsuarioListDto
            {
                Id = u.Id,
                Nombre = u.Nombre,
                Codigo = u.Codigo,
                Rol = u.Rol,
                Activo = u.Activo,
                FechaCreacion = u.FechaCreacion
            })
            .ToListAsync();

        return Ok(lista);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUsuarioDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre) || string.IsNullOrWhiteSpace(dto.Codigo))
            return BadRequest(new { message = "Nombre y Código son requeridos." });

        if (dto.Pin.Length != 4 || !dto.Pin.All(char.IsDigit))
            return BadRequest(new { message = "El PIN debe ser exactamente 4 dígitos numéricos." });

        if (await _db.Usuarios.AnyAsync(u => u.Codigo == dto.Codigo))
            return BadRequest(new { message = "El código ya está en uso." });

        var usuario = new Usuario
        {
            Nombre = dto.Nombre.Trim(),
            Codigo = dto.Codigo.Trim().ToUpper(),
            PinHash = BCrypt.Net.BCrypt.HashPassword(dto.Pin),
            Rol = dto.Rol,
            Activo = dto.Activo,
            FechaCreacion = DateTime.Now
        };

        _db.Usuarios.Add(usuario);
        await _db.SaveChangesAsync();

        return Ok(new { id = usuario.Id, message = "Usuario creado." });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUsuarioDto dto)
    {
        var usuario = await _db.Usuarios.FindAsync(id);
        if (usuario == null) return NotFound(new { message = "Usuario no encontrado." });

        if (string.IsNullOrWhiteSpace(dto.Nombre) || string.IsNullOrWhiteSpace(dto.Codigo))
            return BadRequest(new { message = "Nombre y Código son requeridos." });

        if (!string.IsNullOrWhiteSpace(dto.Pin))
        {
            if (dto.Pin.Length != 4 || !dto.Pin.All(char.IsDigit))
                return BadRequest(new { message = "El PIN debe ser exactamente 4 dígitos numéricos." });
            usuario.PinHash = BCrypt.Net.BCrypt.HashPassword(dto.Pin);
        }

        if (await _db.Usuarios.AnyAsync(u => u.Codigo == dto.Codigo.Trim().ToUpper() && u.Id != id))
            return BadRequest(new { message = "El código ya está en uso." });

        usuario.Nombre = dto.Nombre.Trim();
        usuario.Codigo = dto.Codigo.Trim().ToUpper();
        usuario.Rol = dto.Rol;
        usuario.Activo = dto.Activo;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Usuario actualizado." });
    }
}
