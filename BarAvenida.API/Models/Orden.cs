using System.ComponentModel.DataAnnotations;

namespace BarAvenida.API.Models;

public class Orden
{
    public int Id { get; set; }

    public int CuentaId { get; set; }
    public Cuenta? Cuenta { get; set; }

    public int NumeroOrden { get; set; }

    public DateTime FechaEnvio { get; set; } = DateTime.Now;

    public DateTime? FechaListo { get; set; }

    [MaxLength(20)]
    public string Estado { get; set; } = "Pendiente"; // Pendiente, Listo, Cancelado

    public bool EsAgregado { get; set; } = false; // true si es un agregado a una cuenta ya con orden anterior

    [MaxLength(200)]
    public string? Observaciones { get; set; }

    public ICollection<OrdenDetalle> Detalles { get; set; } = new List<OrdenDetalle>();
}
