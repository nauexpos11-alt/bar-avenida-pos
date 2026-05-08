namespace BarAvenida.API.DTOs;

/// <summary>
/// Respuesta del endpoint GET /api/Caja/sugerencia-fondo.
/// Recomienda un monto inicial basado en el histórico reciente de turnos.
/// PROMPT C.1 — Sugerencia de fondo.
/// </summary>
public class SugerenciaFondoDto
{
    /// <summary>Monto recomendado, redondeado a múltiplos de $50. Cero si no hay histórico.</summary>
    public decimal Recomendado { get; set; }

    public decimal MinimoHistorico { get; set; }
    public decimal MaximoHistorico { get; set; }

    /// <summary>Cantidad de turnos analizados para el cálculo.</summary>
    public int TurnosAnalizados { get; set; }

    /// <summary>Texto humano-legible explicando el origen del valor.</summary>
    public string Justificacion { get; set; } = "";
}
