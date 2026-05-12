using System.ComponentModel.DataAnnotations;

namespace BarAvenida.API.Models;

public class Usuario
{
    public int Id { get; set; }

    [Required, MaxLength(50)]
    public string Nombre { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    public string Codigo { get; set; } = string.Empty; // Ej: "23", "ABBY"

    [Required]
    public string PinHash { get; set; } = string.Empty; // PIN hasheado con BCrypt

    [Required, MaxLength(20)]
    public string Rol { get; set; } = "Mesera"; // Admin, Mesera, Barman

    public bool Activo { get; set; } = true;

    public DateTime FechaCreacion { get; set; } = DateTime.Now;

    // ── SEGURIDAD v1.9.0 (Round 1) ────────────────────────────────────────
    // Lockout / auditoría de login. Las columnas se crean via SQL raw en
    // startup (MigracionSeguridadRound1) — no via migración EF formal,
    // para evitar reescribir el ModelSnapshot.
    public int IntentosFallidos { get; set; } = 0;
    public DateTime? BloqueadoHasta { get; set; }
    public DateTime? UltimoLoginExitoso { get; set; }
    public DateTime? UltimoIntentoFallido { get; set; }
}
