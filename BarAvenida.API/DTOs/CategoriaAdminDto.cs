namespace BarAvenida.API.DTOs;

public class CategoriaAdminDto
{
    public int    Id                        { get; set; }
    public string Nombre                    { get; set; } = string.Empty;
    public int    Orden                     { get; set; }
    public string ColorHex                  { get; set; } = string.Empty;
    public bool   Activa                    { get; set; }
    public int    CantidadProductosActivos  { get; set; }
    public int    CantidadProductosTotales  { get; set; }
}

public class CategoriaCreateDto
{
    public string Nombre   { get; set; } = string.Empty;
    public int    Orden    { get; set; } = 99;
    public string ColorHex { get; set; } = "#FFD700";
}

public class CategoriaUpdateDto
{
    public string Nombre   { get; set; } = string.Empty;
    public int    Orden    { get; set; }
    public string ColorHex { get; set; } = string.Empty;
    public bool   Activa   { get; set; } = true;
}
