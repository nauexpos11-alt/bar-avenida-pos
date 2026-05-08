namespace BarAvenida.API.DTOs;

public class VentasResumenDto
{
    public decimal TotalVentas       { get; set; }
    public int     TotalCuentas      { get; set; }
    public decimal TicketPromedio    { get; set; }
    public decimal TotalComisiones   { get; set; }
    public decimal TotalEfectivo     { get; set; }
    public decimal TotalTarjeta      { get; set; }
    public List<VentaDiaDto> VentasPorDia { get; set; } = new();
}

public class VentaDiaDto
{
    public string  Fecha   { get; set; } = "";
    public decimal Total   { get; set; }
    public int     Cuentas { get; set; }
}

public class ProductoTopDto
{
    public int     ProductoId         { get; set; }
    public string  ProductoNombre     { get; set; } = "";
    public string  CategoriaNombre    { get; set; } = "";
    public int     UnidadesVendidas   { get; set; }
    public decimal TotalVentas        { get; set; }
    public decimal PorcentajeDelTotal { get; set; }
}

public class MeseroReporteDto
{
    public int     MeseraId          { get; set; }
    public string  MeseraNombre      { get; set; } = "";
    public decimal TotalVentas       { get; set; }
    public int     CantidadCuentas   { get; set; }
    public decimal TicketPromedio    { get; set; }
    public decimal PorcentajeDelTotal{ get; set; }
}

public class CategoriaReporteDto
{
    public int     CategoriaId       { get; set; }
    public string  CategoriaNombre   { get; set; } = "";
    public string  Color             { get; set; } = "#FFD700";
    public decimal TotalVentas       { get; set; }
    public int     UnidadesVendidas  { get; set; }
    public decimal PorcentajeDelTotal{ get; set; }
}

public class VentaHoraDto
{
    public int     Hora            { get; set; }
    public decimal TotalVentas     { get; set; }
    public int     CantidadCuentas { get; set; }
}

public class MetodosPagoReporteDto
{
    public MetodoPagoItemDto Efectivo { get; set; } = new();
    public MetodoPagoItemDto Tarjeta  { get; set; } = new();
    public MetodoPagoItemDto Mixto    { get; set; } = new();
}

public class MetodoPagoItemDto
{
    public decimal Total      { get; set; }
    public int     Cuentas    { get; set; }
    public decimal Porcentaje { get; set; }
}
