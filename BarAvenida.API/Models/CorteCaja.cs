using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BarAvenida.API.Models;

public class CorteCaja
{
    public int Id { get; set; }

    public DateTime FechaApertura { get; set; }

    public DateTime? FechaCierre { get; set; }

    public int UsuarioAperturaId { get; set; }
    public Usuario? UsuarioApertura { get; set; }

    public int? UsuarioCierreId { get; set; }
    public Usuario? UsuarioCierre { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal MontoInicial { get; set; } = 0;

    [Column(TypeName = "decimal(10,2)")]
    public decimal TotalEfectivo { get; set; } = 0;

    [Column(TypeName = "decimal(10,2)")]
    public decimal TotalTarjeta { get; set; } = 0;

    [Column(TypeName = "decimal(10,2)")]
    public decimal TotalVentas { get; set; } = 0;

    public int CuentasCobradas { get; set; } = 0;

    [MaxLength(500)]
    public string? Notas { get; set; }

    [MaxLength(20)]
    public string Estado { get; set; } = "Abierto"; // Abierto, Cerrado

    // ── Campos agregados en migración CajaTurnosYRetiros ────────────────────
    public int? TurnoId { get; set; }
    public CajaTurno? Turno { get; set; }

    [MaxLength(1)]
    public string Tipo { get; set; } = "Z"; // X (parcial) o Z (cierre)

    [Column(TypeName = "decimal(10,2)")]
    public decimal TotalRetiros { get; set; } = 0;

    [Column(TypeName = "decimal(10,2)")]
    public decimal EfectivoEnCaja { get; set; } = 0;

    [Column(TypeName = "decimal(10,2)")]
    public decimal TotalComision { get; set; } = 0;

    [Column(TypeName = "decimal(10,2)")]
    public decimal? EfectivoContado { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal? Diferencia { get; set; }
}
