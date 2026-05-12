namespace BarAvenida.API.DTOs;

// ===== COBRO RÁPIDO BARRA (admin cobra a cliente de barra sin abrir cuenta) =====
public class CobroRapidoBarraDto
{
    public List<ProductoCobroDto> Productos { get; set; } = new();

    // Montos según método de pago
    public decimal MontoEfectivo { get; set; } = 0;
    public decimal MontoTarjeta  { get; set; } = 0;

    // Descuento sobre el subtotal
    public decimal Descuento { get; set; } = 0;

    // "Efectivo" | "Tarjeta" | "Mixto"
    public string MetodoPago { get; set; } = "Efectivo";

    public bool ImprimirTicket { get; set; } = true;

    // Datos fiscales opcionales
    public string? RFC { get; set; }
    public string? RazonSocial { get; set; }

    // Id del admin/usuario que cobra
    public int MeseraId { get; set; }
}

public class ProductoCobroDto
{
    public int ProductoId { get; set; }
    public int Cantidad   { get; set; }
}
