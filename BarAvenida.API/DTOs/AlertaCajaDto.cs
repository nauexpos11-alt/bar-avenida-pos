namespace BarAvenida.API.DTOs;

/// <summary>
/// Payload del evento SignalR <c>AlertaCaja</c> emitido al grupo "Admin".
/// PROMPT C.2 — Alertas activas en tiempo real.
/// </summary>
public class AlertaCajaDto
{
    /// <summary>Identificador único de la alerta (para deduplicación en el frontend).</summary>
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>Tipo: "EfectivoExcesivo" | "TiempoSinCorteX" | "Anomalia"</summary>
    public string Tipo { get; set; } = "";

    /// <summary>Severidad: "Amarilla" | "Roja"</summary>
    public string Severidad { get; set; } = "";

    public string Mensaje { get; set; } = "";

    /// <summary>Texto del botón sugerido en el drawer (ej: "Hacer retiro").</summary>
    public string? AccionSugerida { get; set; }

    /// <summary>Clave de la pantalla a la que dirige el botón (ej: "caja-retiros").</summary>
    public string? AccionScreen { get; set; }

    public DateTime FechaDeteccion { get; set; } = DateTime.Now;
}
