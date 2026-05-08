using System.ComponentModel.DataAnnotations;

namespace BarAvenida.API.Models;

public class Mesa
{
    public int Id { get; set; }

    [Required, MaxLength(20)]
    public string Numero { get; set; } = string.Empty; // "1", "27_C", "30_1"

    public int AreaId { get; set; }
    public Area? Area { get; set; }

    public int Capacidad { get; set; } = 4;

    public bool Activa { get; set; } = true;

    public ICollection<Cuenta> Cuentas { get; set; } = new List<Cuenta>();
}
