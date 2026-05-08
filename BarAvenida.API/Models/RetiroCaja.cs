using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BarAvenida.API.Models;

public class RetiroCaja
{
    public int Id { get; set; }

    public int TurnoId { get; set; }
    public CajaTurno? Turno { get; set; }

    public int UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }

    public DateTime Fecha { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal Monto { get; set; }

    [MaxLength(200)]
    public string? Concepto { get; set; }
}
