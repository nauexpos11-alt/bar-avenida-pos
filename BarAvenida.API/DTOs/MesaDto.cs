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
    public int? MeseraActualId { get; set; }            // ID de mesera que tiene la cuenta abierta
    public string? EstadoCuenta { get; set; }           // "Abierta" o "PorCobrar" (null si no hay cuenta)
    public string? AliasCuenta { get; set; }            // Alias personalizado de la cuenta (ej. "Mesa Señor")
    public string? AreaCuenta { get; set; }             // Si la cuenta tiene area distinta a la mesa, va aqui
    public DateTime? FechaApertura { get; set; }
}
