namespace BarAvenida.API.DTOs;

public class MesaDto
{
    public int Id { get; set; }
    public string Numero { get; set; } = string.Empty;
    public int AreaId { get; set; }
    public string AreaNombre { get; set; } = string.Empty;
    public int Capacidad { get; set; }
    public string Estado { get; set; } = "Libre"; // Libre, Ocupada
    public int? CuentaActivaId { get; set; }
    public decimal? TotalActual { get; set; }
    public string? MeseraActual { get; set; }
    public DateTime? FechaApertura { get; set; }
}
