using BarAvenida.API.Data;
using BarAvenida.API.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BarAvenida.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriasController : ControllerBase
{
    private readonly BarAvenidaDbContext _context;

    public CategoriasController(BarAvenidaDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Obtiene todas las categorías activas
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoriaDto>>> ObtenerCategorias()
    {
        var categorias = await _context.Categorias
            .Where(c => c.Activa)
            .OrderBy(c => c.Orden)
            .Select(c => new CategoriaDto
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Orden = c.Orden,
                ColorHex = c.ColorHex,
                CantidadProductos = c.Productos.Count(p => p.Activo)
            })
            .ToListAsync();

        return Ok(categorias);
    }

    /// <summary>
    /// Obtiene los productos de una categoría
    /// </summary>
    [HttpGet("{id}/productos")]
    public async Task<ActionResult<IEnumerable<ProductoDto>>> ObtenerProductosDeCategoria(int id)
    {
        var productos = await _context.Productos
            .Include(p => p.Categoria)
            .Where(p => p.CategoriaId == id && p.Activo)
            .OrderBy(p => p.Orden)
            .Select(p => new ProductoDto
            {
                Id = p.Id,
                Nombre = p.Nombre,
                CategoriaId = p.CategoriaId,
                CategoriaNombre = p.Categoria!.Nombre,
                Precio = p.Precio,
                TipoVenta = p.TipoVenta,
                Orden = p.Orden
            })
            .ToListAsync();

        return Ok(productos);
    }
}

[ApiController]
[Route("api/[controller]")]
public class ProductosController : ControllerBase
{
    private readonly BarAvenidaDbContext _context;

    public ProductosController(BarAvenidaDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Obtiene todos los productos activos
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductoDto>>> ObtenerTodos()
    {
        var productos = await _context.Productos
            .Include(p => p.Categoria)
            .Where(p => p.Activo)
            .OrderBy(p => p.Categoria!.Orden)
            .ThenBy(p => p.Orden)
            .Select(p => new ProductoDto
            {
                Id = p.Id,
                Nombre = p.Nombre,
                CategoriaId = p.CategoriaId,
                CategoriaNombre = p.Categoria!.Nombre,
                Precio = p.Precio,
                TipoVenta = p.TipoVenta,
                Orden = p.Orden
            })
            .ToListAsync();

        return Ok(productos);
    }
}
