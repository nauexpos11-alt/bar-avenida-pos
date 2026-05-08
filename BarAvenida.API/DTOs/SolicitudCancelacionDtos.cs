namespace BarAvenida.API.DTOs;

public class SolicitarCancelacionProductosDto
{
    public int[] DetallesIds { get; set; } = [];
    public string? Motivo { get; set; }
}

public class SolicitarCancelacionCuentaDto
{
    public string? Motivo { get; set; }
}

public class SolicitudResumenDto
{
    public int Id { get; set; }
    public string Tipo { get; set; } = "";
    public string Estado { get; set; } = "";
    public DateTime FechaSolicitud { get; set; }
}

public class SolicitudCompletaDto
{
    public int Id { get; set; }
    public int CuentaId { get; set; }
    public int? MesaId { get; set; }
    public int Folio { get; set; }
    public string MesaNumero { get; set; } = "";
    public string MeseraNombre { get; set; } = "";
    public string Tipo { get; set; } = "";
    public string? Motivo { get; set; }
    public string Estado { get; set; } = "";
    public DateTime FechaSolicitud { get; set; }
    public List<DetalleSolicitudDto> Productos { get; set; } = new();
    public decimal MontoTotal { get; set; }
}

public class DetalleSolicitudDto
{
    public int OrdenDetalleId { get; set; }
    public string ProductoNombre { get; set; } = "";
    public int Cantidad { get; set; }
    public decimal Subtotal { get; set; }
}
