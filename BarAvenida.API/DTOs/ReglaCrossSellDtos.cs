namespace BarAvenida.API.DTOs;

public class ReglaCrossSellDto
{
    public int     Id                     { get; set; }
    public int     ProductoOrigenId       { get; set; }
    public string  ProductoOrigenNombre   { get; set; } = "";
    public int     ProductoSugeridoId     { get; set; }
    public string  ProductoSugeridoNombre { get; set; } = "";
    public decimal ProductoSugeridoPrecio { get; set; }
    public int     Prioridad              { get; set; }
    public bool    Activo                 { get; set; }
}

public class CrearReglaCrossSellDto
{
    public int  ProductoOrigenId   { get; set; }
    public int  ProductoSugeridoId { get; set; }
    public int  Prioridad          { get; set; } = 100;
    public bool Activo             { get; set; } = true;
}

public class ActualizarReglaCrossSellDto
{
    public int  Prioridad { get; set; }
    public bool Activo    { get; set; }
}

public class SugerenciaProductoDto
{
    public int     ProductoId { get; set; }
    public string  Nombre     { get; set; } = "";
    public decimal Precio     { get; set; }
}
