using System.ComponentModel.DataAnnotations;

namespace BarAvenida.API.Models;

public class SecuenciaFolio
{
    public int Id { get; set; } = 1;

    public int UltimoFolio { get; set; } = 0;

    [MaxLength(10)]
    public string PrefijoFolio { get; set; } = "";

    public int LongitudMinima { get; set; } = 4;
}
