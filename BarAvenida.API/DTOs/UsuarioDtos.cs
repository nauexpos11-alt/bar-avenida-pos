namespace BarAvenida.API.DTOs;

public class UsuarioListDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public string Codigo { get; set; } = "";
    public string Rol { get; set; } = "";
    public bool Activo { get; set; }
    public DateTime FechaCreacion { get; set; }
}

public class CreateUsuarioDto
{
    public string Nombre { get; set; } = "";
    public string Codigo { get; set; } = "";
    public string Pin { get; set; } = "";
    public string Rol { get; set; } = "Mesera";
    public bool Activo { get; set; } = true;
}

public class UpdateUsuarioDto
{
    public string Nombre { get; set; } = "";
    public string Codigo { get; set; } = "";
    public string? Pin { get; set; }
    public string Rol { get; set; } = "Mesera";
    public bool Activo { get; set; }
}
