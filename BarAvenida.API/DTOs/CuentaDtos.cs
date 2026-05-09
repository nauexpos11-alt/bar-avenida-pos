namespace BarAvenida.API.DTOs;

// ===== ABRIR CUENTA =====
public class AbrirCuentaDto
{
    public int MesaId { get; set; }
    public int MeseraId { get; set; }
    public int NumeroPersonas { get; set; } = 1;
    public string? NombreCliente { get; set; }
    public string? Area { get; set; }   // Opcional: sobreescribe el area de la mesa para esta cuenta especifica
}

// ===== ABRIR CUENTA RÁPIDA (BARRA) — sin mesa =====
public record AbrirCuentaRapidaDto(int MeseraId);

// ===== ENVIAR ORDEN (cada vez que mesera presiona ENVIAR) =====
public class EnviarOrdenDto
{
    public int CuentaId { get; set; }
    public string? Observaciones { get; set; }
    public List<DetalleOrdenDto> Detalles { get; set; } = new();
}

public class DetalleOrdenDto
{
    public int ProductoId { get; set; }
    public int Cantidad { get; set; }
    public string? Notas { get; set; }
}

// ===== RESPUESTA: cuenta completa con todas sus órdenes =====
public class CuentaCompletaDto
{
    public int Id { get; set; }
    public int? MesaId { get; set; }
    public string MesaNumero { get; set; } = string.Empty;
    public int MeseraId { get; set; }
    public string MeseraNombre { get; set; } = string.Empty;
    public int NumeroPersonas { get; set; }
    public string? NombreCliente { get; set; }
    public string? Area { get; set; }   // Area especifica de esta cuenta (puede ser distinta a la mesa)
    public DateTime FechaApertura { get; set; }
    public DateTime? FechaCierre { get; set; }
    public string Estado { get; set; } = string.Empty;
    public decimal Subtotal { get; set; }
    public decimal Descuento { get; set; }
    public decimal Total { get; set; }
    public string? MetodoPago { get; set; }
    public decimal ComisionTarjeta { get; set; }
    public decimal? MontoEfectivo { get; set; }
    public decimal? MontoTarjeta { get; set; }
    public decimal Cambio { get; set; }
    public string? RfcCliente { get; set; }
    public string? RazonSocialCliente { get; set; }
    public bool TicketImpreso { get; set; }
    public DateTime? FechaImpresion { get; set; }
    public string? MotivoCancelacion { get; set; }
    public string? UsuarioCancelacionNombre { get; set; }
    public DateTime? FechaCancelacion { get; set; }
    public int Folio { get; set; }
    public List<OrdenDto> Ordenes { get; set; } = new();
}

// ===== ORDEN (una tarjeta del KDS) =====
public class OrdenDto
{
    public int Id { get; set; }
    public int CuentaId { get; set; }
    public int NumeroOrden { get; set; }
    public string MesaNumero { get; set; } = string.Empty;
    public string MeseraNombre { get; set; } = string.Empty;
    public DateTime FechaEnvio { get; set; }
    public DateTime? FechaListo { get; set; }
    public string Estado { get; set; } = string.Empty;
    public bool EsAgregado { get; set; }
    public string? Observaciones { get; set; }
    public List<DetalleOrdenResponseDto> Detalles { get; set; } = new();
    public decimal TotalOrden { get; set; }
    public int MinutosTranscurridos { get; set; }
}

public class DetalleOrdenResponseDto
{
    public int Id { get; set; }
    public int ProductoId { get; set; }
    public string ProductoNombre { get; set; } = string.Empty;
    public int Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Subtotal { get; set; }
    public string? Notas { get; set; }
}

// ===== COBRAR CUENTA =====
public class CobrarCuentaDto
{
    public int CuentaId { get; set; }
    public string MetodoPago { get; set; } = "Efectivo"; // Efectivo, Tarjeta, Mixto
    public decimal Descuento { get; set; } = 0;
    public decimal? MontoEfectivo { get; set; }
    public decimal? MontoTarjeta { get; set; }
    public decimal EfectivoRecibido { get; set; } = 0;
    public string? RfcCliente { get; set; }
    public string? RazonSocialCliente { get; set; }
}

// ===== RESPUESTA COBRAR CUENTA =====
public class CuentaCobradaDto
{
    public int Id { get; set; }
    public int Folio { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Descuento { get; set; }
    public decimal ComisionTarjeta { get; set; }
    public decimal Total { get; set; }
    public string MetodoPago { get; set; } = "";
    public decimal? MontoEfectivo { get; set; }
    public decimal? MontoTarjeta { get; set; }
    public decimal Cambio { get; set; }
    public bool TicketImpreso { get; set; }
    public bool ModoSimulado { get; set; }
    public string? Error { get; set; }
}

// ===== LISTAR CUENTAS (resumen para tabla) =====
public class CuentaResumenDto
{
    public int Id { get; set; }
    public int? MesaId { get; set; }
    public int Folio { get; set; }
    public string MesaNumero { get; set; } = "";
    public string? NombreCliente { get; set; }
    public string MeseraNombre { get; set; } = "";
    public string Estado { get; set; } = "";
    public decimal Total { get; set; }
    public DateTime FechaApertura { get; set; }
    public DateTime? FechaCierre { get; set; }
    public string? MetodoPago { get; set; }
    public int OrdenesCount { get; set; }
    public int NumeroPersonas { get; set; }
    public int ProductosCount { get; set; }
}

// ===== EDITAR INFO DE CUENTA =====
public record EditarInfoCuentaDto(
    string? NombreCliente,
    int?    NumeroPersonas,
    string? Area
);

// ===== MOVER ÁREA =====
public record MoverAreaDto(string AreaNueva);

// ===== CANCELAR CUENTA (admin con PIN) =====
public class CancelarCuentaDto
{
    public string Pin { get; set; } = "";
    public string Motivo { get; set; } = "";
}

// ===== TICKETS SIMULADOS =====
public class TicketSimuladoCuentaDto
{
    public string BaseName { get; set; } = "";
    public DateTime Fecha { get; set; }
    public string Tipo { get; set; } = ""; // original | reimpr
    public string[] Extensiones { get; set; } = [];
}

// ===== CANCELAR CUENTA YA COBRADA (admin, post-cobro) =====
public class CancelarCobradaDto
{
    public string Motivo { get; set; } = "";
}
