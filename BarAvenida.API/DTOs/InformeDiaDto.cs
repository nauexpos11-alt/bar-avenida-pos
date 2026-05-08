namespace BarAvenida.API.DTOs;

public class InformeDiaDto
{
    public DateTime Fecha                              { get; set; }
    public string FechaTexto                          { get; set; } = "";
    public ResumenEjecutivoDto Resumen                { get; set; } = new();
    public List<HighlightDto> Highlights              { get; set; } = new();
    public ComparativasDto Comparativas               { get; set; } = new();
    public List<AnomaliaDto> Anomalias                { get; set; } = new();
    public List<RecomendacionDto> Recomendaciones     { get; set; } = new();
}

public class ResumenEjecutivoDto
{
    public decimal VentasTotales     { get; set; }
    public int     CuentasCobradas   { get; set; }
    public decimal TicketPromedio    { get; set; }
    public int     ProductosVendidos { get; set; }
    public string  Narrativa         { get; set; } = "";
}

public class HighlightDto
{
    public string Tipo        { get; set; } = ""; // TopProducto | TopMesera | HoraPico
    public string Icono       { get; set; } = "";
    public string Titulo      { get; set; } = "";
    public string Descripcion { get; set; } = "";
}

public class ComparativasDto
{
    public string Ayer           { get; set; } = "";
    public string SemanaAnterior { get; set; } = "";
}

public class AnomaliaDto
{
    public string Tipo      { get; set; } = ""; // Cancelacion | Incidente
    public string Severidad { get; set; } = ""; // Info | Atencion | Grave
    public string Mensaje   { get; set; } = "";
}

public class RecomendacionDto
{
    public string  Categoria    { get; set; } = ""; // Inventario | Personal | Operacion
    public string  Icono        { get; set; } = "";
    public string  Titulo       { get; set; } = "";
    public string  Detalle      { get; set; } = "";
    public string? AccionScreen { get; set; }
}
