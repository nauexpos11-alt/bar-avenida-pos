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
}
