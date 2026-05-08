using System.ComponentModel.DataAnnotations;

namespace BarAvenida.API.Models;

public class ConfiguracionTicket
{
    public int Id { get; set; }

    [MaxLength(100)]
    public string NombreNegocio { get; set; } = "BAR AVENIDA";

    [MaxLength(200)]
    public string? Direccion { get; set; }

    [MaxLength(20)]
    public string? Telefono { get; set; }

    [MaxLength(20)]
    public string? Rfc { get; set; }

    [MaxLength(200)]
    public string? RazonSocial { get; set; }

    [MaxLength(500)]
    public string? MensajePie { get; set; }

    // Impresora
    [MaxLength(50)]
    public string TipoConexion { get; set; } = "USB"; // USB, Red

    [MaxLength(200)]
    public string? NombreImpresoraUsb { get; set; }

    [MaxLength(100)]
    public string? IpImpresora { get; set; }

    public int PuertoImpresora { get; set; } = 9100;

    public bool AbrirCajonAlCobrar { get; set; } = true;
    public bool ImpresionHabilitada { get; set; } = true;

    // 58mm=32 chars, 80mm=48 chars
    public int AnchoTicket { get; set; } = 32;
}
