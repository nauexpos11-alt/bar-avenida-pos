namespace BarAvenida.API.DTOs;

public class ProductoAdminDto
{
    public int     Id                 { get; set; }
    public string  Nombre             { get; set; } = string.Empty;
    public int     CategoriaId        { get; set; }
    public string  CategoriaNombre    { get; set; } = string.Empty;
    public string  CategoriaColor     { get; set; } = string.Empty;
    public decimal Precio             { get; set; }
    public string  TipoVenta          { get; set; } = string.Empty;
    public decimal CantidadDescuento  { get; set; }
    public bool    Activo             { get; set; }
    public int     Orden              { get; set; }
}

public class ProductoCreateDto
{
    public string  Nombre            { get; set; } = string.Empty;
    public int     CategoriaId       { get; set; }
    public decimal Precio            { get; set; }
    public string  TipoVenta         { get; set; } = "Pieza";
    public decimal CantidadDescuento { get; set; } = 1;
    public int     Orden             { get; set; } = 0;
}

public class ProductoUpdateDto
{
    public string  Nombre            { get; set; } = string.Empty;
    public int     CategoriaId       { get; set; }
    public decimal Precio            { get; set; }
    public string  TipoVenta         { get; set; } = "Pieza";
    public decimal CantidadDescuento { get; set; } = 1;
    public int     Orden             { get; set; } = 0;
    public bool    Activo            { get; set; } = true;
}
