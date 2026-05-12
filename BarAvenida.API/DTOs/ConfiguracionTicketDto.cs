namespace BarAvenida.API.DTOs;

public class ConfiguracionTicketDto
{
    public string NombreNegocio { get; set; } = "";
    public string? Direccion { get; set; }
    public string? Telefono { get; set; }
    public string? Rfc { get; set; }
    public string? RazonSocial { get; set; }
    public string? MensajePie { get; set; }
    public string TipoConexion { get; set; } = "USB";
    public string? NombreImpresoraUsb { get; set; }
    public string? IpImpresora { get; set; }
    public int PuertoImpresora { get; set; } = 9100;
    public bool AbrirCajonAlCobrar { get; set; } = true;
    public bool ImpresionHabilitada { get; set; } = true;
    public int AnchoTicket { get; set; } = 32;

    // v1.9.0 Round 2 — PIN admin requerido para guardar cambios
    public string? Pin { get; set; }
}
