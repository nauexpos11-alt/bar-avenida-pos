using System.ComponentModel.DataAnnotations;

namespace BarAvenida.API.Models;

public class RegistroAperturaCajon
{
    public int Id { get; set; }

    public int UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }

    public DateTime Fecha { get; set; } = DateTime.Now;

    [MaxLength(50)]
    public string Motivo { get; set; } = "Manual"; // Manual, Cobro, Reimprimir

    public int? CuentaId { get; set; }
}
