using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BarAvenida.API.Models;

public class Producto
{
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string Nombre { get; set; } = string.Empty; // "Corona", "Buchanan's 12 Shot"

    public int CategoriaId { get; set; }
    public Categoria? Categoria { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal Precio { get; set; }

    [MaxLength(20)]
    public string TipoVenta { get; set; } = "Pieza"; // Pieza, Shot, Botella

    // Para inventario: si vendes 1 shot, ¿cuántos ml descuenta de la botella?
    [Column(TypeName = "decimal(10,2)")]
    public decimal CantidadDescuento { get; set; } = 1; // 1 pieza, o 45ml de un shot

    // Para conectar con inventario: a qué item del inventario afecta esta venta
    public int? InventarioItemId { get; set; }
    public InventarioItem? InventarioItem { get; set; }

    public bool Activo { get; set; } = true;

    public int Orden { get; set; } = 0;
}
