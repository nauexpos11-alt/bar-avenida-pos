namespace BarAvenida.API.DTOs;

public class AbrirCajonDto
{
    public string Pin { get; set; } = "";
    public string Motivo { get; set; } = "Manual";
}

public class RegistroCajonDto
{
    public int Id { get; set; }
    public string UsuarioNombre { get; set; } = "";
    public DateTime Fecha { get; set; }
    public string Motivo { get; set; } = "";
    public int? CuentaId { get; set; }
}
