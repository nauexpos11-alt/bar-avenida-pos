using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BarAvenida.API.Models;

namespace BarAvenida.API.Helpers;

public class JwtHelper
{
    private readonly IConfiguration _configuration;

    // v1.9.0 — antes 12h, ahora 8h (ronda de seguridad Round 1)
    public static readonly TimeSpan TokenLifetime = TimeSpan.FromHours(8);

    public JwtHelper(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerarToken(Usuario usuario) => GenerarToken(usuario, out _);

    public string GenerarToken(Usuario usuario, out DateTime expiresAt)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? "BarAvenida_LlaveSuperSecretaParaJWT_2026_MinimoCaracteres";
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? "BarAvenida";

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new Claim(ClaimTypes.Name, usuario.Nombre),
            new Claim("Codigo", usuario.Codigo),
            new Claim(ClaimTypes.Role, usuario.Rol)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        expiresAt = DateTime.UtcNow.Add(TokenLifetime);

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtIssuer,
            claims: claims,
            expires: expiresAt,
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
