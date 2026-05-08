using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BarAvenida.API.Models;

public class InventarioItem
{
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string Nombre { get; set; } = string.Empty; // "Buchanan's 12", "Coca Cola Lt"

    [MaxLength(50)]
    public string? Marca { get; set; }

    [MaxLength(20)]
    public string TipoUnidad { get; set; } = "Pieza"; // Pieza, Botella, Caja, ml, gr

    [Column(TypeName = "decimal(10,2)")]
    public decimal CantidadActual { get; set; } = 0;

    [Column(TypeName = "decimal(10,2)")]
    public decimal StockMinimo { get; set; } = 0; // Para alertas

    [Column(TypeName = "decimal(10,2)")]
    public decimal? PesoEnvaseVacio { get; set; } // Para sensores: cuánto pesa la botella vacía

    [Column(TypeName = "decimal(10,2)")]
    public decimal? PesoEnvaseLleno { get; set; } // Para sensores: cuánto pesa lleno

    [MaxLength(20)]
    public string MetodoControl { get; set; } = "Manual"; // Manual, Sensor, Conteo

    public int? SensorId { get; set; }
    public Sensor? Sensor { get; set; }

    public DateTime UltimaActualizacion { get; set; } = DateTime.Now;

    public bool Activo { get; set; } = true;

    public ICollection<MovimientoInventario> Movimientos { get; set; } = new List<MovimientoInventario>();
}
