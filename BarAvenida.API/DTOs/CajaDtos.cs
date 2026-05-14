using System.ComponentModel.DataAnnotations;

namespace BarAvenida.API.DTOs;

// ── Turno ──────────────────────────────────────────────────────────────────

public class CajaTurnoDto
{
    public int Id { get; set; }
    public DateTime FechaApertura { get; set; }
    public DateTime? FechaCierre { get; set; }
    public string UsuarioAperturaNombre { get; set; } = "";
    public string? UsuarioCierreNombre { get; set; }
    public decimal MontoInicial { get; set; }
    public decimal? MontoFinal { get; set; }
    public string Estado { get; set; } = "";
    public string? Notas { get; set; }
}

public class AbrirTurnoDto
{
    [Required]
    public string Pin { get; set; } = "";
    public decimal MontoInicial { get; set; }
    public string? Notas { get; set; }

    // Si true, cancela todas las cuentas abiertas y limpia órdenes pendientes
    // del KDS antes de abrir el turno. Útil para empezar fresco el día.
    public bool LimpiarDiaAnterior { get; set; } = false;
}

public class CerrarTurnoDto
{
    public int TurnoId { get; set; }
    [Required]
    public string Pin { get; set; } = "";
    public decimal EfectivoContado { get; set; }
    public string? Notas { get; set; }

    // PROMPT C.3 — Justificación obligatoria si severidad = Roja
    public string? Justificacion { get; set; }
}

// ── Corte ──────────────────────────────────────────────────────────────────

public class CorteDto
{
    public int? Id { get; set; }
    public string Tipo { get; set; } = "X";
    public int TurnoId { get; set; }
    public DateTime Fecha { get; set; }
    public string UsuarioNombre { get; set; } = "";
    public decimal MontoInicial { get; set; }
    public decimal TotalEfectivo { get; set; }
    public decimal TotalTarjeta { get; set; }
    public decimal TotalComision { get; set; }
    public decimal TotalVentas { get; set; }
    public decimal TotalRetiros { get; set; }
    public decimal EfectivoEnCaja { get; set; }  // = EfectivoEsperado
    public decimal? EfectivoContado { get; set; }
    public decimal? Diferencia { get; set; }
    public int CuentasCobradas { get; set; }
    public string? Notas { get; set; }
    public bool ModoSimulado { get; set; }
}

public class PostCorteZDto
{
    public int TurnoId { get; set; }
    [Required]
    public string Pin { get; set; } = "";
    public decimal? EfectivoContado { get; set; }
    public string? Notas { get; set; }
}

// ── Retiro ─────────────────────────────────────────────────────────────────

public class RetiroCajaDto
{
    public int TurnoId { get; set; }
    public decimal Monto { get; set; }
    [Required]
    public string Pin { get; set; } = "";
    public string? Concepto { get; set; }
}

public class RetiroCajaItemDto
{
    public int Id { get; set; }
    public DateTime Fecha { get; set; }
    public string UsuarioNombre { get; set; } = "";
    public decimal Monto { get; set; }
    public string? Concepto { get; set; }
}

public class ImprimirCorteDto
{
    public string? Tipo { get; set; }
}

public class PinSoloDto
{
    [Required]
    public string Pin { get; set; } = "";
}

public class ResetTotalDto
{
    [Required]
    public string Pin { get; set; } = "";
    [Required]
    public string Confirmacion { get; set; } = "";
}

// ── Incidentes (PROMPT C.3) ───────────────────────────────────────────────

public class IncidenteResumenDto
{
    public int     Id                  { get; set; }
    public int     TurnoId             { get; set; }
    public int?    CorteId             { get; set; }
    public string  Tipo                { get; set; } = "";
    public string  Severidad           { get; set; } = "";
    public decimal Diferencia          { get; set; }
    public decimal EfectivoEsperado    { get; set; }
    public decimal EfectivoContado     { get; set; }
    public string? Justificacion       { get; set; }
    public string? AutorizadoPorNombre { get; set; }
    public DateTime FechaRegistro      { get; set; }
}

public class IncidentesPaginadoDto
{
    public int Total                        { get; set; }
    public int Page                         { get; set; }
    public int PageSize                     { get; set; }
    public List<IncidenteResumenDto> Items  { get; set; } = new();
}
