using System.ComponentModel.DataAnnotations.Schema;

namespace BarAvenida.API.Models;

public class LecturaSensor
{
    public int Id { get; set; }

    public int SensorId { get; set; }
    public Sensor? Sensor { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal Valor { get; set; } // Peso en gramos, o cantidad en piezas

    public DateTime Fecha { get; set; } = DateTime.Now;
}
