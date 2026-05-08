using System.ComponentModel.DataAnnotations;

namespace BarAvenida.API.Models;

public class SolicitudCancelacion
{
    public int Id { get; set; }

    public int CuentaId { get; set; }
    public Cuenta? Cuenta { get; set; }

    public int? MesaId { get; set; }
    public Mesa? Mesa { get; set; }

    public int MeseraId { get; set; }
    public Usuario? Mesera { get; set; }

    [Required, MaxLength(20)]
    public string Tipo { get; set; } = ""; // "Producto" | "Cuenta"

    [MaxLength(200)]
    public string? Motivo { get; set; }

    // IDs de OrdenDetalle separados por coma (solo para Tipo="Producto")
    [MaxLength(500)]
    public string? DetallesIds { get; set; }

    [Required, MaxLength(20)]
    public string Estado { get; set; } = "Pendiente"; // "Pendiente" | "Aprobada" | "Rechazada"

    public DateTime FechaSolicitud { get; set; } = DateTime.Now;
    public DateTime? FechaResolucion { get; set; }

    public int? AdminId { get; set; }
    public Usuario? Admin { get; set; }
}
