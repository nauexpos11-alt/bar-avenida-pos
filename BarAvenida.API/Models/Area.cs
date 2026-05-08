using System.ComponentModel.DataAnnotations;

namespace BarAvenida.API.Models;

public class Area
{
    public int Id { get; set; }

    [Required, MaxLength(50)]
    public string Nombre { get; set; } = string.Empty;

    public bool Activa { get; set; } = true;

    public ICollection<Mesa> Mesas { get; set; } = new List<Mesa>();
}
