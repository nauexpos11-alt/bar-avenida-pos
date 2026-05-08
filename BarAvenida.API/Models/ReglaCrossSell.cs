using System.ComponentModel.DataAnnotations;

namespace BarAvenida.API.Models;

public class ReglaCrossSell
{
    public int Id { get; set; }

    public int ProductoOrigenId { get; set; }
    public Producto? ProductoOrigen { get; set; }

    public int ProductoSugeridoId { get; set; }
    public Producto? ProductoSugerido { get; set; }

    /// <summary>Orden de prioridad. Menor número = mayor prioridad. Default 100.</summary>
    public int Prioridad { get; set; } = 100;

    public bool Activo { get; set; } = true;

    public DateTime FechaCreacion { get; set; } = DateTime.Now;
}
