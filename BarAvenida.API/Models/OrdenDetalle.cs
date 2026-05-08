using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BarAvenida.API.Models;

public class OrdenDetalle
{
    public int Id { get; set; }

    public int OrdenId { get; set; }
    public Orden? Orden { get; set; }

    public int ProductoId { get; set; }
    public Producto? Producto { get; set; }

    public int Cantidad { get; set; } = 1;

    [Column(TypeName = "decimal(10,2)")]
    public decimal PrecioUnitario { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal Subtotal { get; set; } // Cantidad * PrecioUnitario

    [MaxLength(200)]
    public string? Notas { get; set; } // ej: "Sin hielo", "Bien fría"
}
