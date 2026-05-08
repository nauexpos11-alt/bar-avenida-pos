using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BarAvenida.API.Models;

public class MovimientoInventario
{
    public int Id { get; set; }

    public int InventarioItemId { get; set; }
    public InventarioItem? InventarioItem { get; set; }

    [Required, MaxLength(20)]
    public string Tipo { get; set; } = string.Empty; // Entrada, Salida, Ajuste, Venta, Sensor

    [Column(TypeName = "decimal(10,2)")]
    public decimal Cantidad { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal CantidadAnterior { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal CantidadNueva { get; set; }

    [MaxLength(200)]
    public string? Motivo { get; set; }

    public int? UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }

    public int? OrdenId { get; set; } // Si es por venta, qué orden

    public DateTime Fecha { get; set; } = DateTime.Now;
}
