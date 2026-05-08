namespace BarAvenida.API.Settings;

/// <summary>
/// Configuración de la sección "Caja" en appsettings.json.
/// Centraliza umbrales de alertas, sugerencia de fondo y cierre asistido.
/// PROMPT C — Caja Inteligente.
/// </summary>
public class CajaSettings
{
    public FondoSugeridoSettings FondoSugerido { get; set; } = new();
    public UmbralesSettings      Umbrales      { get; set; } = new();
    public ReportesSettings      Reportes      { get; set; } = new();
}

// PROMPT E — Reportes interpretativos
public class ReportesSettings
{
    public HeuristicasSettings Heuristicas { get; set; } = new();
}

public class HeuristicasSettings
{
    public int     DiasSinVentaProducto    { get; set; } = 7;
    public decimal MeseraTopPorcentaje     { get; set; } = 25;
    public decimal TicketPromedioCaidaPorc { get; set; } = 10;
    public int     CancelacionesAlerta     { get; set; } = 3;
}

public class FondoSugeridoSettings
{
    /// <summary>Días hacia atrás a considerar para el promedio.</summary>
    public int DiasHistorial { get; set; } = 7;

    /// <summary>Si true, sólo usa turnos que cayeron en el mismo día de la semana.</summary>
    public bool MismoDiaSemana { get; set; } = true;
}

public class UmbralesSettings
{
    public decimal CajonMaximoEfectivo { get; set; } = 5000;
    public int     HorasSinCorteX      { get; set; } = 4;
    public decimal DiferenciaVerde     { get; set; } = 50;
    public decimal DiferenciaAmarilla  { get; set; } = 200;

    // PROMPT H — Anti-fuga
    public int MinutosSinActividadMesa { get; set; } = 30;
}
