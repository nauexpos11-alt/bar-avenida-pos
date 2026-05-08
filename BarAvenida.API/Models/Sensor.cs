using System.ComponentModel.DataAnnotations;

namespace BarAvenida.API.Models;

public class Sensor
{
    public int Id { get; set; }

    [Required, MaxLength(50)]
    public string IdHardware { get; set; } = string.Empty; // "ESP32_001_S1"

    [Required, MaxLength(100)]
    public string Ubicacion { get; set; } = string.Empty; // "Estante A-1"

    [MaxLength(20)]
    public string Tipo { get; set; } = "Peso"; // Peso, Infrarrojo, Plataforma

    public bool EnLinea { get; set; } = false;

    public DateTime UltimoHeartbeat { get; set; } = DateTime.Now;

    public bool Activo { get; set; } = true;

    public ICollection<LecturaSensor> Lecturas { get; set; } = new List<LecturaSensor>();
}
