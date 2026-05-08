using System.ComponentModel.DataAnnotations;

namespace BarAvenida.API.Models;

public class Categoria
{
    public int Id { get; set; }

    [Required, MaxLength(50)]
    public string Nombre { get; set; } = string.Empty;

    public int Orden { get; set; } = 0; // Para ordenar en pantalla

    [MaxLength(20)]
    public string ColorHex { get; set; } = "#FFD700"; // Color en la UI

    public bool Activa { get; set; } = true;

    public ICollection<Producto> Productos { get; set; } = new List<Producto>();
}
