using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BarAvenida.API.Models;

public class CajaTurno
{
    public int Id { get; set; }

    public DateTime FechaApertura { get; set; }
    public DateTime? FechaCierre { get; set; }

    public int UsuarioAperturaId { get; set; }
    public Usuario? UsuarioApertura { get; set; }

    public int? UsuarioCierreId { get; set; }
    public Usuario? UsuarioCierre { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal MontoInicial { get; set; } = 0;

    [Column(TypeName = "decimal(10,2)")]
    public decimal? MontoFinal { get; set; }

    [MaxLength(20)]
    public string Estado { get; set; } = "Abierto"; // Abierto, Cerrado

    [MaxLength(500)]
    public string? Notas { get; set; }

    public ICollection<CorteCaja> Cortes { get; set; } = [];
    public ICollection<RetiroCaja> Retiros { get; set; } = [];
}
