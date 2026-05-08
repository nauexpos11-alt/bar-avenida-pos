namespace BarAvenida.API.DTOs;

public class DashboardLiveDto
{
    public KpiConDeltaDto VentasHoy           { get; set; } = new();
    public KpiConDeltaDto Cuentas             { get; set; } = new();
    public KpiConDeltaDto TicketPromedio      { get; set; } = new();
    public int TotalProductosVendidos         { get; set; }
    public List<VentaPorHoraDto> VentasPorHora { get; set; } = new();
    public List<TopProductoDto>  TopProductos  { get; set; } = new();
    public string? MeseraTopNombre            { get; set; }
    public decimal MeseraTopVentas            { get; set; }
    public int? HoraPico                      { get; set; }
    public decimal HoraPicoVentas             { get; set; }
    public DateTime FechaCalculo              { get; set; } = DateTime.Now;
}

public class KpiConDeltaDto
{
    public decimal Hoy   { get; set; }
    public decimal Ayer  { get; set; }
    public decimal Delta { get; set; }
}

public class VentaPorHoraDto
{
    public int     Hora    { get; set; }
    public decimal Ventas  { get; set; }
    public int     Cuentas { get; set; }
}

public class TopProductoDto
{
    public int     ProductoId { get; set; }
    public string  Nombre     { get; set; } = "";
    public int     Cantidad   { get; set; }
    public decimal Total      { get; set; }
}
