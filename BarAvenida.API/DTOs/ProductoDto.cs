namespace BarAvenida.API.DTOs;

public class CategoriaDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public int Orden { get; set; }
    public string ColorHex { get; set; } = string.Empty;
    public int CantidadProductos { get; set; }
}

public class ProductoDto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public int CategoriaId { get; set; }
    public string CategoriaNombre { get; set; } = string.Empty;
    public decimal Precio { get; set; }
    public string TipoVenta { get; set; } = string.Empty;
    public int Orden { get; set; }
}
