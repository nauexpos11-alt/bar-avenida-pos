using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace BarAvenida.API.Models;

public class Cuenta
{
    public int Id { get; set; }

    public int? MesaId { get; set; }
    public Mesa? Mesa { get; set; }

    public int MeseraId { get; set; }
    public Usuario? Mesera { get; set; }

    public int NumeroPersonas { get; set; } = 1;

    [MaxLength(100)]
    public string? NombreCliente { get; set; } // Opcional, ej: "Diablo" / alias de la cuenta

    [MaxLength(50)]
    public string? Area { get; set; } // Opcional. Si la mesera escoge un area distinta a la de la mesa, se guarda aqui.

    public DateTime FechaApertura { get; set; } = DateTime.Now;

    public DateTime? FechaCierre { get; set; }

    [MaxLength(20)]
    public string Estado { get; set; } = "Abierta"; // Abierta, Cobrada, Cancelada

    [Column(TypeName = "decimal(10,2)")]
    public decimal Subtotal { get; set; } = 0;

    [Column(TypeName = "decimal(10,2)")]
    public decimal Descuento { get; set; } = 0;

    [Column(TypeName = "decimal(10,2)")]
    public decimal Total { get; set; } = 0;

    [MaxLength(20)]
    public string? MetodoPago { get; set; } // Efectivo, Tarjeta, Mixto

    [Column(TypeName = "decimal(10,2)")]
    public decimal ComisionTarjeta { get; set; } = 0;

    [Column(TypeName = "decimal(10,2)")]
    public decimal? MontoEfectivo { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal? MontoTarjeta { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal Cambio { get; set; } = 0;

    [MaxLength(20)]
    public string? RfcCliente { get; set; }

    [MaxLength(200)]
    public string? RazonSocialCliente { get; set; }

    public bool TicketImpreso { get; set; } = false;

    public DateTime? FechaImpresion { get; set; }

    public int Folio { get; set; } // Numero de folio del ticket

    // Cancelación (admin con PIN)
    [MaxLength(200)]
    public string? MotivoCancelacion { get; set; }

    public int? UsuarioCancelacionId { get; set; }
    public Usuario? UsuarioCancelacion { get; set; }

    public DateTime? FechaCancelacion { get; set; }

    // Una cuenta tiene muchas órdenes (cada vez que la mesera presiona ENVIAR)
    public ICollection<Orden> Ordenes { get; set; } = new List<Orden>();
}
