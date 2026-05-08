using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BarAvenida.API.Models;

public class FormaPago
{
    public int Id { get; set; }

    [Required, MaxLength(50)]
    public string Nombre { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Codigo { get; set; } = string.Empty;

    [Column(TypeName = "decimal(5,2)")]
    public decimal ComisionPorcentaje { get; set; } = 0;

    public bool ActivaParaCobro { get; set; } = true;

    public int Orden { get; set; } = 0;
}
