using System.ComponentModel.DataAnnotations;

namespace BarAvenida.API.Models;

/// <summary>
/// Evento de auditoría — registra acciones sensibles del sistema:
/// cobros, cancelaciones, cambios de configuración, login bloqueado, etc.
/// Tabla creada via SQL raw en startup (MigracionSeguridadRound1).
/// </summary>
public class EventoAuditoria
{
    public int Id { get; set; }

    public DateTime Fecha { get; set; } = DateTime.UtcNow;

    [Required, MaxLength(40)]
    public string Categoria { get; set; } = string.Empty;
    // Cuenta, Producto, Caja, Auth, Solicitud, Sistema, ...

    [Required, MaxLength(60)]
    public string Tipo { get; set; } = string.Empty;
    // CobroCuenta, CancelarCuenta, LoginBloqueado, ProductoCreado,
    // TurnoAbierto, PinAdminCambiado, ...

    public int? UsuarioId { get; set; }

    [MaxLength(80)]
    public string UsuarioNombre { get; set; } = string.Empty; // snapshot

    [Required, MaxLength(500)]
    public string Descripcion { get; set; } = string.Empty;

    [MaxLength(64)]
    public string? IpOrigen { get; set; }

    public string? Detalles { get; set; } // JSON opcional con campos extra
}
