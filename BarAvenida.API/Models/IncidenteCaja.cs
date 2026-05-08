using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BarAvenida.API.Models;

public class IncidenteCaja
{
    public int Id { get; set; }

    public int TurnoId { get; set; }
    public CajaTurno? Turno { get; set; }

    public int? CorteId { get; set; }
    public CorteCaja? Corte { get; set; }

    [Required, MaxLength(20)]
    public string Tipo { get; set; } = ""; // "Sobrante" | "Faltante"

    [Required, MaxLength(20)]
    public string Severidad { get; set; } = ""; // "Verde" | "Amarilla" | "Roja"

    [Column(TypeName = "decimal(10,2)")]
    public decimal Diferencia { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal EfectivoEsperado { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal EfectivoContado { get; set; }

    [MaxLength(500)]
    public string? Justificacion { get; set; }

    public int? AutorizadoPorId { get; set; }
    public Usuario? AutorizadoPor { get; set; }

    public DateTime FechaRegistro { get; set; } = DateTime.Now;
}
