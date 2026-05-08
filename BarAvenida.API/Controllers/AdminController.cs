using BarAvenida.API.Data;
using BarAvenida.API.DTOs;
using BarAvenida.API.Models;
using BarAvenida.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BarAvenida.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly BarAvenidaDbContext _db;
    private readonly ILogger<AdminController> _log;
    private readonly EscPosService _escPos;
    private readonly TicketService _ticket;

    public AdminController(
        BarAvenidaDbContext db,
        ILogger<AdminController> log,
        EscPosService escPos,
        TicketService ticket)
    {
        _db     = db;
        _log    = log;
        _escPos = escPos;
        _ticket = ticket;
    }

    // ── Reference catalog (Soft Restaurant real prices) ─────────────────
    private sealed record ItemRef(string Cat, string Nombre, decimal Precio, string Tipo = "Pieza");

    private static readonly ItemRef[] Catalogo =
    [
        // CERVEZAS
        new("Cervezas", "Corona",          40m),
        new("Cervezas", "Tecate",          39m),   // 35 → 39
        new("Cervezas", "Indio",           35m),
        new("Cervezas", "Victoria",        40m),
        new("Cervezas", "Ambar Corona",    45m),
        new("Cervezas", "Ultra Michelob",  45m),
        new("Cervezas", "Carta Blanca",    45m),
        new("Cervezas", "Caguama",         45m),
        new("Cervezas", "Miller Media",    85m),
        new("Cervezas", "Miller Caguama",  47m),
        new("Cervezas", "XX Lager",       100m),   // 45 → 100
        new("Cervezas", "Bohemia",         45m),
        new("Cervezas", "Heineken",        45m),
        new("Cervezas", "Modelo",          42m),
        new("Cervezas", "Amstel Ultra",    45m),
        new("Cervezas", "Tecate Roja",     35m),

        // TEQUILAS — shots
        new("Tequilas", "Centenario Shot",          45m,  "Shot"),   // 65 → 45
        new("Tequilas", "Tradicional Shot",         65m,  "Shot"),
        new("Tequilas", "Hornitos Shot",            65m,  "Shot"),
        new("Tequilas", "Codorniz Shot",            55m,  "Shot"),
        new("Tequilas", "Cuervo Especial Shot",     65m,  "Shot"),
        new("Tequilas", "Maestro Dobel Shot",      100m,  "Shot"),
        new("Tequilas", "Don Julio 70 Shot",       150m,  "Shot"),
        new("Tequilas", "Don Julio Rep y Bco Shot",100m,  "Shot"),
        new("Tequilas", "Jimador Shot",             55m,  "Shot"),
        new("Tequilas", "1800 Cristalino Shot",    100m,  "Shot"),
        new("Tequilas", "1800 Añe Rep Bco Shot",    75m,  "Shot"),
        // TEQUILAS — botellas
        new("Tequilas", "1800 Botella Rep Bco",          850m,  "Botella"),
        new("Tequilas", "Centenario Botella",            850m,  "Botella"),
        new("Tequilas", "Codorniz Botella",              750m,  "Botella"),
        new("Tequilas", "Cuervo Especial Botella",       800m,  "Botella"),
        new("Tequilas", "Don Julio 70 Botella",         1800m,  "Botella"),
        new("Tequilas", "Don Julio Rep y Bco Botella",  1200m,  "Botella"),
        new("Tequilas", "Hornitos Botella",              800m,  "Botella"),
        new("Tequilas", "Jimador Botella",               750m,  "Botella"),
        new("Tequilas", "Maestro Dobel Botella",        1700m,  "Botella"),
        new("Tequilas", "Tradicional Botella",           800m,  "Botella"),
        new("Tequilas", "1800 Cristalino Botella",      1700m,  "Botella"),

        // REFRESCOS
        new("Refrescos", "Coca",         35m),
        new("Refrescos", "Fresca",       35m),
        new("Refrescos", "Agua Mineral", 35m),
        new("Refrescos", "Agua Natural", 35m),

        // PREPARADOS
        new("Preparados", "Sangrita Shot",          10m,  "Shot"),
        new("Preparados", "Limon Concentrado Shot", 10m,  "Shot"),
        new("Preparados", "Jarabe Nat Grana Shot",  15m,  "Shot"),
        new("Preparados", "Preparado Vampiro",      35m),
        new("Preparados", "Preparado Paloma",       20m),
        new("Preparados", "Vaso Chelado Sal y Limon",10m),
        new("Preparados", "Limonada Grande",        70m),
        new("Preparados", "Limonada Chica",         35m),
        new("Preparados", "Shot Petroleo",          15m,  "Shot"),
        new("Preparados", "Perla Negra",           135m),

        // RON — shots
        new("Ron", "Bacardi Carta Blanca Shot",   65m, "Shot"),
        new("Ron", "Bacardi Añejo Shot",          65m, "Shot"),
        new("Ron", "Capitan Morgan Shot",         65m, "Shot"),
        new("Ron", "Bacardi Solera Shot",         65m, "Shot"),
        new("Ron", "Matusalem Shot",              65m, "Shot"),
        // RON — botellas
        new("Ron", "Bacardi Añejo Botella",         650m, "Botella"),
        new("Ron", "Bacardi Carta Blanca Botella",  750m, "Botella"),
        new("Ron", "Bacardi Solera Botella",        800m, "Botella"),
        new("Ron", "Capitan Morgan Botella",        850m, "Botella"),
        new("Ron", "Matusalem Botella",             850m, "Botella"),

        // WISKYS — shots  (spec: "Whiskies" → DB: "Wiskys" via alias)
        new("Whiskies", "Black Label Shot",          100m, "Shot"),
        new("Whiskies", "Red Label Shot",             75m, "Shot"),
        new("Whiskies", "Black White Shot",           70m, "Shot"),
        new("Whiskies", "Buchanans 12 Shot",         100m, "Shot"),
        new("Whiskies", "Buchanans 18 Shot",         170m, "Shot"),
        new("Whiskies", "Chivas Regal Shot",         100m, "Shot"),
        new("Whiskies", "Jack Daniels Shot",          85m, "Shot"),
        new("Whiskies", "Jack Daniels Honey Shot",    85m, "Shot"),
        new("Whiskies", "Passport Shot",              55m, "Shot"),
        new("Whiskies", "William Lawson Shot",        55m, "Shot"),
        // WISKYS — botellas
        new("Whiskies", "Black Label Botella",        1700m, "Botella"),
        new("Whiskies", "Red Label Botella",           850m, "Botella"),
        new("Whiskies", "Black White Botella",         800m, "Botella"),
        new("Whiskies", "Buchanans 12 Botella",       1700m, "Botella"),
        new("Whiskies", "Buchanans 18 Botella",       2800m, "Botella"),
        new("Whiskies", "Chivas Regal Botella",       1700m, "Botella"),
        new("Whiskies", "Jack Daniels Botella",        850m, "Botella"),
        new("Whiskies", "Jack Daniels Honey Botella",  850m, "Botella"),
        new("Whiskies", "Passport Botella",            600m, "Botella"),
        new("Whiskies", "William Lawson Botella",      600m, "Botella"),

        // MEZCAL
        new("Mezcal", "400 Conejos Shot",     75m,  "Shot"),
        new("Mezcal", "Amaras Shot",          85m,  "Shot"),
        new("Mezcal", "400 Conejos Botella",  900m, "Botella"),
        new("Mezcal", "Amaras Botella",      1000m, "Botella"),

        // VODKAS — shots
        new("Vodkas", "Absolut Shot",    65m, "Shot"),
        new("Vodkas", "Wiborowa Shot",   55m, "Shot"),
        new("Vodkas", "Smirnoff Shot",   65m, "Shot"),
        new("Vodkas", "Oso Negro Shot",  65m, "Shot"),
        // VODKAS — botellas
        new("Vodkas", "Absolut Botella",    750m, "Botella"),
        new("Vodkas", "Oso Negro Botella",  650m, "Botella"),
        new("Vodkas", "Smirnoff Botella",   750m, "Botella"),
        new("Vodkas", "Wiborowa Botella",   750m, "Botella"),

        // BRANDYS — shots
        new("Brandys", "Torres 10 Shot",   75m, "Shot"),
        new("Brandys", "Presidente Shot",  50m, "Shot"),
        new("Brandys", "Don Pedro Shot",   50m, "Shot"),
        // BRANDYS — botellas
        new("Brandys", "Torres 10 Botella",   750m, "Botella"),
        new("Brandys", "Presidente Botella",  700m, "Botella"),
        new("Brandys", "Don Pedro Botella",   700m, "Botella"),

        // MEZCLADORES
        new("Mezcladores", "Boost Chico",  45m),
        new("Mezcladores", "Boost Grande", 80m),
        new("Mezcladores", "Red Bull",     58m),   // 45 → 58

        // LICORES — shots
        new("Licores", "Baileys Shot",    70m, "Shot"),
        new("Licores", "Licor 43 Shot",   75m, "Shot"),
        // LICORES — botellas
        new("Licores", "Baileys Botella",   800m, "Botella"),
        new("Licores", "Licor 43 Botella",  750m, "Botella"),

        // BOTANAS
        new("Botanas", "Papas Diversas",       35m),
        new("Botanas", "Pistaches",            38m),
        new("Botanas", "Carne Seca",           48m),
        new("Botanas", "Cacahuates",           35m),
        new("Botanas", "Camarones",            35m),
        new("Botanas", "Charales",             35m),
        new("Botanas", "Fritos Diversos",      35m),
        new("Botanas", "Chicharrones",         35m),
        new("Botanas", "Carne Seca Chihuahua", 50m),
        new("Botanas", "Takis",                35m),
        new("Botanas", "Chips",                35m),

        // CLAMATOS
        new("Clamatos", "Clamato Chico",           45m),
        new("Clamatos", "Clamato Grande",          85m),
        new("Clamatos", "Michelada Chica",         25m),
        new("Clamatos", "Michelada Grande",        40m),
        new("Clamatos", "Vaso Chelado Limon y Sal", 10m),
        new("Clamatos", "Clamato Frasco",          35m),
        new("Clamatos", "Escarchado Sencillo",      5m),
        new("Clamatos", "Escarchado con Limon",    10m),

        // SERVICIOS
        new("Servicios", "Moneda",          10m),
        new("Servicios", "Salida de Dinero",  1m),

        // CIGARROS
        new("Cigarros", "Marlboro Rojo",      13m),
        new("Cigarros", "Marlboro Blanco",    13m),
        new("Cigarros", "Caja Marlboro Bco", 130m),
        new("Cigarros", "Caja Marlboro Rojo",130m),

        // CUBETAS
        new("Cubetas", "Cubeta Corona",        400m),
        new("Cubetas", "Cubeta Tecate",        350m),
        new("Cubetas", "Cubeta Indio",         350m),
        new("Cubetas", "Cubeta Victoria",      400m),
        new("Cubetas", "Cubeta XX",            450m),
        new("Cubetas", "Cubeta Carta Blanca",  450m),
        new("Cubetas", "Cubeta Bohemia",       450m),
        new("Cubetas", "Cubeta Miller",        470m),
        new("Cubetas", "Cubeta Ultra Michelob",450m),
        new("Cubetas", "Cubeta Ambar Corona",  450m),
        new("Cubetas", "Cubeta Heineken",      450m),
        new("Cubetas", "Cubeta Modelo",        450m),
        new("Cubetas", "Cubeta Amstel Ultra",  450m),

        // OTROS — productos nuevos no presentes en el catálogo inicial
        new("Otros", "Billar Hora", 60m),
        new("Otros", "Limonada",    70m),
    ];

    // Aliases: spec category name → DB category name
    private static readonly Dictionary<string, string> CatAlias =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Whiskies"] = "Wiskys",
            ["Whisky"]   = "Wiskys",
            ["Whiskeys"] = "Wiskys",
        };

    private static string NormCat(string nombre) =>
        CatAlias.TryGetValue(nombre, out var v) ? v : nombre;

    // ── Report DTO ───────────────────────────────────────────────────────
    public sealed class ReporteSincronizacion
    {
        public DateTime     Fecha                 { get; } = DateTime.UtcNow;
        public List<string> CategoriasCreadas     { get; } = [];
        public int          CategoriasExistentes  { get; set; }
        public List<string> ProductosCreados      { get; } = [];
        public List<string> ProductosActualizados { get; } = [];
        public int          ProductosSinCambios   { get; set; }
        public List<string> Errores               { get; } = [];
    }

    // ── POST /api/admin/sincronizar-catalogo ─────────────────────────────
    [HttpPost("sincronizar-catalogo")]
    public async Task<IActionResult> SincronizarCatalogo(CancellationToken ct)
    {
        var rpt = new ReporteSincronizacion();

        var cats = await _db.Categorias.ToDictionaryAsync(
            c => c.Nombre, c => c, StringComparer.OrdinalIgnoreCase, ct);

        var prods = await _db.Productos.ToListAsync(ct);

        var catSeenIds = new HashSet<int>();

        foreach (var item in Catalogo)
        {
            try
            {
                var catNombre = NormCat(item.Cat);

                // Find or create category
                if (!cats.TryGetValue(catNombre, out var cat))
                {
                    cat = new Categoria { Nombre = catNombre, Activa = true, Orden = 99 };
                    _db.Categorias.Add(cat);
                    await _db.SaveChangesAsync(ct);   // need the generated Id
                    cats[catNombre] = cat;
                    rpt.CategoriasCreadas.Add(catNombre);
                }
                else if (catSeenIds.Add(cat.Id))
                {
                    rpt.CategoriasExistentes++;
                }

                // Search within the same category only
                var catProds = prods.Where(p => p.CategoriaId == cat.Id).ToList();

                // 1. Exact match (case-insensitive)
                var prod = catProds.FirstOrDefault(p =>
                    p.Nombre.Equals(item.Nombre, StringComparison.OrdinalIgnoreCase));

                // 2. Contains fallback
                prod ??= catProds.FirstOrDefault(p =>
                    p.Nombre.Contains(item.Nombre, StringComparison.OrdinalIgnoreCase) ||
                    item.Nombre.Contains(p.Nombre, StringComparison.OrdinalIgnoreCase));

                if (prod is null)
                {
                    var nuevo = new Producto
                    {
                        Nombre      = item.Nombre,
                        CategoriaId = cat.Id,
                        Precio      = item.Precio,
                        TipoVenta   = item.Tipo,
                        Activo      = true,
                        Orden       = 0
                    };
                    _db.Productos.Add(nuevo);
                    prods.Add(nuevo);
                    rpt.ProductosCreados.Add($"{item.Nombre} (${item.Precio:F2}, {catNombre})");
                }
                else if (prod.Precio != item.Precio)
                {
                    rpt.ProductosActualizados.Add(
                        $"{prod.Nombre}: ${prod.Precio:F2} → ${item.Precio:F2}");
                    prod.Precio = item.Precio;
                }
                else
                {
                    rpt.ProductosSinCambios++;
                }
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Sincronización: error procesando {Nombre}", item.Nombre);
                rpt.Errores.Add($"{item.Nombre}: {ex.Message}");
            }
        }

        await _db.SaveChangesAsync(ct);

        _log.LogInformation(
            "Sincronización completada — creados:{C} actualizados:{U} sin-cambios:{S} errores:{E}",
            rpt.ProductosCreados.Count, rpt.ProductosActualizados.Count,
            rpt.ProductosSinCambios, rpt.Errores.Count);

        return Ok(rpt);
    }

    // ── CRUD PRODUCTOS ───────────────────────────────────────────────────────

    // GET /api/admin/productos
    [HttpGet("productos")]
    public async Task<IActionResult> GetProductos(
        [FromQuery] int?    categoriaId,
        [FromQuery] bool?   activo,
        [FromQuery] string? busqueda,
        CancellationToken   ct)
    {
        var query = _db.Productos.AsQueryable();

        if (categoriaId.HasValue)
            query = query.Where(p => p.CategoriaId == categoriaId.Value);

        if (activo.HasValue)
            query = query.Where(p => p.Activo == activo.Value);

        if (!string.IsNullOrWhiteSpace(busqueda))
        {
            var lower = busqueda.Trim().ToLower();
            query = query.Where(p => p.Nombre.ToLower().Contains(lower));
        }

        var result = await query
            .OrderBy(p => p.Categoria!.Orden)
            .ThenBy(p => p.Orden)
            .ThenBy(p => p.Nombre)
            .Select(p => new ProductoAdminDto
            {
                Id                = p.Id,
                Nombre            = p.Nombre,
                CategoriaId       = p.CategoriaId,
                CategoriaNombre   = p.Categoria!.Nombre,
                CategoriaColor    = p.Categoria!.ColorHex,
                Precio            = p.Precio,
                TipoVenta         = p.TipoVenta,
                CantidadDescuento = p.CantidadDescuento,
                Activo            = p.Activo,
                Orden             = p.Orden,
            })
            .ToListAsync(ct);

        return Ok(result);
    }

    // POST /api/admin/productos
    [HttpPost("productos")]
    public async Task<IActionResult> CreateProducto(
        [FromBody] ProductoCreateDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { message = "El nombre es requerido." });
        if (dto.Nombre.Length > 100)
            return BadRequest(new { message = "El nombre no puede exceder 100 caracteres." });
        if (dto.Precio < 0)
            return BadRequest(new { message = "El precio no puede ser negativo." });
        if (!new[] { "Pieza", "Shot", "Botella" }.Contains(dto.TipoVenta))
            return BadRequest(new { message = "TipoVenta debe ser Pieza, Shot o Botella." });

        var cat = await _db.Categorias.FirstOrDefaultAsync(c => c.Id == dto.CategoriaId, ct);
        if (cat is null)
            return BadRequest(new { message = "La categoría especificada no existe." });

        var duplic = await _db.Productos.AnyAsync(
            p => p.CategoriaId == dto.CategoriaId &&
                 p.Nombre.ToLower() == dto.Nombre.Trim().ToLower(), ct);
        if (duplic)
            return BadRequest(new { message = $"Ya existe un producto con ese nombre en '{cat.Nombre}'." });

        var prod = new Producto
        {
            Nombre            = dto.Nombre.Trim(),
            CategoriaId       = dto.CategoriaId,
            Precio            = dto.Precio,
            TipoVenta         = dto.TipoVenta,
            CantidadDescuento = dto.CantidadDescuento <= 0 ? 1 : dto.CantidadDescuento,
            Orden             = dto.Orden,
            Activo            = true,
        };
        _db.Productos.Add(prod);
        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetProductos), new ProductoAdminDto
        {
            Id                = prod.Id,
            Nombre            = prod.Nombre,
            CategoriaId       = prod.CategoriaId,
            CategoriaNombre   = cat.Nombre,
            CategoriaColor    = cat.ColorHex,
            Precio            = prod.Precio,
            TipoVenta         = prod.TipoVenta,
            CantidadDescuento = prod.CantidadDescuento,
            Activo            = prod.Activo,
            Orden             = prod.Orden,
        });
    }

    // PUT /api/admin/productos/{id}
    [HttpPut("productos/{id:int}")]
    public async Task<IActionResult> UpdateProducto(
        int id, [FromBody] ProductoUpdateDto dto, CancellationToken ct)
    {
        var prod = await _db.Productos.FindAsync(new object[] { id }, ct);
        if (prod is null)
            return NotFound(new { message = $"Producto {id} no encontrado." });

        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { message = "El nombre es requerido." });
        if (dto.Nombre.Length > 100)
            return BadRequest(new { message = "El nombre no puede exceder 100 caracteres." });
        if (dto.Precio < 0)
            return BadRequest(new { message = "El precio no puede ser negativo." });
        if (!new[] { "Pieza", "Shot", "Botella" }.Contains(dto.TipoVenta))
            return BadRequest(new { message = "TipoVenta debe ser Pieza, Shot o Botella." });

        var cat = await _db.Categorias.FirstOrDefaultAsync(c => c.Id == dto.CategoriaId, ct);
        if (cat is null)
            return BadRequest(new { message = "La categoría especificada no existe." });

        // Unicidad de nombre (excluye el propio producto)
        bool cambia = !string.Equals(prod.Nombre, dto.Nombre.Trim(), StringComparison.OrdinalIgnoreCase)
                   || prod.CategoriaId != dto.CategoriaId;
        if (cambia)
        {
            var duplic = await _db.Productos.AnyAsync(
                p => p.Id != id &&
                     p.CategoriaId == dto.CategoriaId &&
                     p.Nombre.ToLower() == dto.Nombre.Trim().ToLower(), ct);
            if (duplic)
                return BadRequest(new { message = $"Ya existe un producto con ese nombre en '{cat.Nombre}'." });
        }

        prod.Nombre            = dto.Nombre.Trim();
        prod.CategoriaId       = dto.CategoriaId;
        prod.Precio            = dto.Precio;
        prod.TipoVenta         = dto.TipoVenta;
        prod.CantidadDescuento = dto.CantidadDescuento <= 0 ? 1 : dto.CantidadDescuento;
        prod.Orden             = dto.Orden;
        prod.Activo            = dto.Activo;
        await _db.SaveChangesAsync(ct);

        return Ok(new ProductoAdminDto
        {
            Id                = prod.Id,
            Nombre            = prod.Nombre,
            CategoriaId       = prod.CategoriaId,
            CategoriaNombre   = cat.Nombre,
            CategoriaColor    = cat.ColorHex,
            Precio            = prod.Precio,
            TipoVenta         = prod.TipoVenta,
            CantidadDescuento = prod.CantidadDescuento,
            Activo            = prod.Activo,
            Orden             = prod.Orden,
        });
    }

    // DELETE /api/admin/productos/{id}  — soft delete
    [HttpDelete("productos/{id:int}")]
    public async Task<IActionResult> DesactivarProducto(int id, CancellationToken ct)
    {
        var prod = await _db.Productos.FindAsync(new object[] { id }, ct);
        if (prod is null)
            return NotFound(new { message = $"Producto {id} no encontrado." });

        prod.Activo = false;
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Producto desactivado." });
    }

    // PATCH /api/admin/productos/{id}/activar
    [HttpPatch("productos/{id:int}/activar")]
    public async Task<IActionResult> ActivarProducto(int id, CancellationToken ct)
    {
        var prod = await _db.Productos
            .Include(p => p.Categoria)
            .FirstOrDefaultAsync(p => p.Id == id, ct);
        if (prod is null)
            return NotFound(new { message = $"Producto {id} no encontrado." });

        prod.Activo = true;
        await _db.SaveChangesAsync(ct);

        return Ok(new ProductoAdminDto
        {
            Id                = prod.Id,
            Nombre            = prod.Nombre,
            CategoriaId       = prod.CategoriaId,
            CategoriaNombre   = prod.Categoria!.Nombre,
            CategoriaColor    = prod.Categoria!.ColorHex,
            Precio            = prod.Precio,
            TipoVenta         = prod.TipoVenta,
            CantidadDescuento = prod.CantidadDescuento,
            Activo            = prod.Activo,
            Orden             = prod.Orden,
        });
    }

    // ── CRUD CATEGORÍAS ──────────────────────────────────────────────────────

    // GET /api/admin/categorias
    [HttpGet("categorias")]
    public async Task<IActionResult> GetCategorias(CancellationToken ct)
    {
        var result = await _db.Categorias
            .OrderBy(c => c.Orden)
            .ThenBy(c => c.Nombre)
            .Select(c => new CategoriaAdminDto
            {
                Id                       = c.Id,
                Nombre                   = c.Nombre,
                Orden                    = c.Orden,
                ColorHex                 = c.ColorHex,
                Activa                   = c.Activa,
                CantidadProductosActivos = c.Productos.Count(p => p.Activo),
                CantidadProductosTotales = c.Productos.Count(),
            })
            .ToListAsync(ct);

        return Ok(result);
    }

    // POST /api/admin/categorias
    [HttpPost("categorias")]
    public async Task<IActionResult> CreateCategoria(
        [FromBody] CategoriaCreateDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { message = "El nombre es requerido." });
        if (dto.Nombre.Length > 50)
            return BadRequest(new { message = "El nombre no puede exceder 50 caracteres." });
        if (!System.Text.RegularExpressions.Regex.IsMatch(dto.ColorHex, @"^#[0-9A-Fa-f]{6}$"))
            return BadRequest(new { message = "El color debe ser un valor hexadecimal válido (ej. #FFD700)." });

        var duplic = await _db.Categorias.AnyAsync(
            c => c.Nombre.ToLower() == dto.Nombre.Trim().ToLower(), ct);
        if (duplic)
            return BadRequest(new { message = $"Ya existe una categoría con el nombre '{dto.Nombre}'." });

        var cat = new Categoria
        {
            Nombre   = dto.Nombre.Trim(),
            Orden    = dto.Orden,
            ColorHex = dto.ColorHex.ToUpperInvariant(),
            Activa   = true,
        };
        _db.Categorias.Add(cat);
        await _db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetCategorias), new CategoriaAdminDto
        {
            Id                       = cat.Id,
            Nombre                   = cat.Nombre,
            Orden                    = cat.Orden,
            ColorHex                 = cat.ColorHex,
            Activa                   = cat.Activa,
            CantidadProductosActivos = 0,
            CantidadProductosTotales = 0,
        });
    }

    // PUT /api/admin/categorias/{id}
    [HttpPut("categorias/{id:int}")]
    public async Task<IActionResult> UpdateCategoria(
        int id, [FromBody] CategoriaUpdateDto dto, CancellationToken ct)
    {
        var cat = await _db.Categorias
            .Include(c => c.Productos)
            .FirstOrDefaultAsync(c => c.Id == id, ct);
        if (cat is null)
            return NotFound(new { message = $"Categoría {id} no encontrada." });

        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { message = "El nombre es requerido." });
        if (!System.Text.RegularExpressions.Regex.IsMatch(dto.ColorHex, @"^#[0-9A-Fa-f]{6}$"))
            return BadRequest(new { message = "El color debe ser un valor hexadecimal válido." });

        if (!dto.Activa && cat.Activa)
        {
            int activos = cat.Productos.Count(p => p.Activo);
            if (activos > 0)
                return BadRequest(new { message = $"No se puede desactivar: tiene {activos} producto(s) activo(s). Desactívalos primero." });
        }

        if (!string.Equals(cat.Nombre, dto.Nombre.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            var duplic = await _db.Categorias.AnyAsync(
                c => c.Id != id && c.Nombre.ToLower() == dto.Nombre.Trim().ToLower(), ct);
            if (duplic)
                return BadRequest(new { message = $"Ya existe una categoría con el nombre '{dto.Nombre}'." });
        }

        cat.Nombre   = dto.Nombre.Trim();
        cat.Orden    = dto.Orden;
        cat.ColorHex = dto.ColorHex.ToUpperInvariant();
        cat.Activa   = dto.Activa;
        await _db.SaveChangesAsync(ct);

        return Ok(new CategoriaAdminDto
        {
            Id                       = cat.Id,
            Nombre                   = cat.Nombre,
            Orden                    = cat.Orden,
            ColorHex                 = cat.ColorHex,
            Activa                   = cat.Activa,
            CantidadProductosActivos = cat.Productos.Count(p => p.Activo),
            CantidadProductosTotales = cat.Productos.Count,
        });
    }

    // DELETE /api/admin/categorias/{id}  — hard delete solo si vacía
    [HttpDelete("categorias/{id:int}")]
    public async Task<IActionResult> DeleteCategoria(int id, CancellationToken ct)
    {
        var cat = await _db.Categorias
            .Include(c => c.Productos)
            .FirstOrDefaultAsync(c => c.Id == id, ct);
        if (cat is null)
            return NotFound(new { message = $"Categoría {id} no encontrada." });

        if (cat.Productos.Count > 0)
            return BadRequest(new
            {
                message = $"No se puede eliminar: tiene {cat.Productos.Count} producto(s) asociado(s). Desactívala en lugar de eliminarla."
            });

        _db.Categorias.Remove(cat);
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Categoría eliminada correctamente." });
    }

    // ── CONFIGURACIÓN TICKET ─────────────────────────────────────────────────

    // GET /api/admin/configuracion-ticket
    [HttpGet("configuracion-ticket")]
    public async Task<IActionResult> GetConfiguracionTicket(CancellationToken ct)
    {
        var cfg = await _db.ConfiguracionesTicket.FindAsync(new object[] { 1 }, ct);
        if (cfg is null) return NotFound();

        return Ok(new ConfiguracionTicketDto
        {
            NombreNegocio       = cfg.NombreNegocio,
            Direccion           = cfg.Direccion,
            Telefono            = cfg.Telefono,
            Rfc                 = cfg.Rfc,
            RazonSocial         = cfg.RazonSocial,
            MensajePie          = cfg.MensajePie,
            TipoConexion        = cfg.TipoConexion,
            NombreImpresoraUsb  = cfg.NombreImpresoraUsb,
            IpImpresora         = cfg.IpImpresora,
            PuertoImpresora     = cfg.PuertoImpresora,
            AbrirCajonAlCobrar  = cfg.AbrirCajonAlCobrar,
            ImpresionHabilitada = cfg.ImpresionHabilitada,
            AnchoTicket         = cfg.AnchoTicket,
        });
    }

    // PUT /api/admin/configuracion-ticket
    [HttpPut("configuracion-ticket")]
    public async Task<IActionResult> UpdateConfiguracionTicket(
        [FromBody] ConfiguracionTicketDto dto, CancellationToken ct)
    {
        var cfg = await _db.ConfiguracionesTicket.FindAsync(new object[] { 1 }, ct);
        if (cfg is null) return NotFound();

        cfg.NombreNegocio       = dto.NombreNegocio.Trim();
        cfg.Direccion           = dto.Direccion?.Trim();
        cfg.Telefono            = dto.Telefono?.Trim();
        cfg.Rfc                 = dto.Rfc?.Trim();
        cfg.RazonSocial         = dto.RazonSocial?.Trim();
        cfg.MensajePie          = dto.MensajePie?.Trim();
        cfg.TipoConexion        = dto.TipoConexion;
        cfg.NombreImpresoraUsb  = dto.NombreImpresoraUsb?.Trim();
        cfg.IpImpresora         = dto.IpImpresora?.Trim();
        cfg.PuertoImpresora     = dto.PuertoImpresora;
        cfg.AbrirCajonAlCobrar  = dto.AbrirCajonAlCobrar;
        cfg.ImpresionHabilitada = dto.ImpresionHabilitada;
        cfg.AnchoTicket         = dto.AnchoTicket;

        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Configuración actualizada." });
    }

    // POST /api/admin/imprimir-prueba
    [HttpPost("imprimir-prueba")]
    public async Task<IActionResult> ImprimirPrueba(CancellationToken ct)
    {
        var cfg = await _db.ConfiguracionesTicket.FindAsync(new object[] { 1 }, ct);
        if (cfg is null) return NotFound();

        var ticket = _ticket.GenerarTicketPrueba(cfg);
        bool ok    = await _escPos.ImprimirTicketAsync(ticket);

        if (!ok)
            return StatusCode(503, new { message = "No se pudo imprimir. Verifique la impresora." });

        return Ok(new
        {
            message = cfg.ImpresionHabilitada
                ? "Ticket de prueba enviado a la impresora."
                : @"Ticket de prueba generado en modo simulado. Revise F:\BarAvenida\TicketsImpresos\"
        });
    }

    // ── CAJÓN DE DINERO ──────────────────────────────────────────────────────

    // POST /api/admin/abrir-cajon
    [HttpPost("abrir-cajon")]
    public async Task<IActionResult> AbrirCajon([FromBody] AbrirCajonDto dto, CancellationToken ct)
    {
        var idStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "";
        if (!int.TryParse(idStr, out int userId))
            return Unauthorized(new { message = "Usuario no reconocido." });
        var usuario = await _db.Usuarios
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (usuario is null)
            return Unauthorized(new { message = "Usuario no reconocido." });

        if (!string.IsNullOrEmpty(dto.Pin) && !BCrypt.Net.BCrypt.Verify(dto.Pin, usuario.PinHash))
            return Unauthorized(new { message = "PIN incorrecto." });

        string motivo = string.IsNullOrWhiteSpace(dto.Motivo) ? "Manual" : dto.Motivo.Trim();

        bool ok = await _escPos.AbrirCajonAsync(usuario.Nombre, motivo);
        if (!ok) return StatusCode(503, new { message = "No se pudo abrir el cajón. Verifique la impresora." });

        _db.RegistrosAperturaCajon.Add(new RegistroAperturaCajon
        {
            UsuarioId = usuario.Id,
            Motivo    = motivo,
            Fecha     = DateTime.Now
        });
        await _db.SaveChangesAsync(ct);

        return Ok(new { message = "Cajón abierto." });
    }

    // ── CRUD ÁREAS ───────────────────────────────────────────────────────────────

    [HttpGet("areas")]
    public async Task<IActionResult> GetAreas(CancellationToken ct)
    {
        var result = await _db.Areas
            .OrderBy(a => a.Nombre)
            .Select(a => new AreaDto
            {
                Id         = a.Id,
                Nombre     = a.Nombre,
                Activa     = a.Activa,
                MesasCount = a.Mesas.Count(m => m.Activa),
            })
            .ToListAsync(ct);
        return Ok(result);
    }

    [HttpPost("areas")]
    public async Task<IActionResult> CreateArea([FromBody] AreaUpsertDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { message = "El nombre es requerido." });

        var duplic = await _db.Areas.AnyAsync(a => a.Nombre.ToLower() == dto.Nombre.Trim().ToLower(), ct);
        if (duplic) return BadRequest(new { message = "Ya existe un área con ese nombre." });

        var area = new Area { Nombre = dto.Nombre.Trim(), Activa = dto.Activa };
        _db.Areas.Add(area);
        await _db.SaveChangesAsync(ct);
        return Ok(new AreaDto { Id = area.Id, Nombre = area.Nombre, Activa = area.Activa, MesasCount = 0 });
    }

    [HttpPut("areas/{id:int}")]
    public async Task<IActionResult> UpdateArea(int id, [FromBody] AreaUpsertDto dto, CancellationToken ct)
    {
        var area = await _db.Areas.Include(a => a.Mesas).FirstOrDefaultAsync(a => a.Id == id, ct);
        if (area is null) return NotFound(new { message = $"Área {id} no encontrada." });

        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { message = "El nombre es requerido." });

        if (!string.Equals(area.Nombre, dto.Nombre.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            var duplic = await _db.Areas.AnyAsync(a => a.Id != id && a.Nombre.ToLower() == dto.Nombre.Trim().ToLower(), ct);
            if (duplic) return BadRequest(new { message = "Ya existe un área con ese nombre." });
        }

        area.Nombre = dto.Nombre.Trim();
        area.Activa = dto.Activa;
        await _db.SaveChangesAsync(ct);
        return Ok(new AreaDto { Id = area.Id, Nombre = area.Nombre, Activa = area.Activa, MesasCount = area.Mesas.Count(m => m.Activa) });
    }

    [HttpDelete("areas/{id:int}")]
    public async Task<IActionResult> DeleteArea(int id, CancellationToken ct)
    {
        var area = await _db.Areas.Include(a => a.Mesas).FirstOrDefaultAsync(a => a.Id == id, ct);
        if (area is null) return NotFound(new { message = $"Área {id} no encontrada." });

        if (area.Mesas.Count > 0)
            return BadRequest(new { message = $"No se puede eliminar: tiene {area.Mesas.Count} mesa(s) asociada(s)." });

        _db.Areas.Remove(area);
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Área eliminada." });
    }

    // ── CRUD MESAS ───────────────────────────────────────────────────────────────

    [HttpGet("mesas")]
    public async Task<IActionResult> GetMesas([FromQuery] int? areaId, CancellationToken ct)
    {
        var query = _db.Mesas.Include(m => m.Area).AsQueryable();
        if (areaId.HasValue) query = query.Where(m => m.AreaId == areaId.Value);

        var result = await query
            .OrderBy(m => m.Area!.Nombre)
            .ThenBy(m => m.Numero)
            .Select(m => new MesaAdminDto
            {
                Id         = m.Id,
                Numero     = m.Numero,
                AreaId     = m.AreaId,
                AreaNombre = m.Area!.Nombre,
                Capacidad  = m.Capacidad,
                Activa     = m.Activa,
            })
            .ToListAsync(ct);
        return Ok(result);
    }

    [HttpPost("mesas")]
    public async Task<IActionResult> CreateMesa([FromBody] MesaUpsertDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Numero))
            return BadRequest(new { message = "El número es requerido." });

        var area = await _db.Areas.FindAsync(new object[] { dto.AreaId }, ct);
        if (area is null) return BadRequest(new { message = "El área especificada no existe." });

        var duplic = await _db.Mesas.AnyAsync(m => m.Numero.ToLower() == dto.Numero.Trim().ToLower(), ct);
        if (duplic) return BadRequest(new { message = $"Ya existe una mesa con el número '{dto.Numero}'." });

        var mesa = new Mesa { Numero = dto.Numero.Trim(), AreaId = dto.AreaId, Capacidad = dto.Capacidad, Activa = dto.Activa };
        _db.Mesas.Add(mesa);
        await _db.SaveChangesAsync(ct);
        return Ok(new MesaAdminDto { Id = mesa.Id, Numero = mesa.Numero, AreaId = mesa.AreaId, AreaNombre = area.Nombre, Capacidad = mesa.Capacidad, Activa = mesa.Activa });
    }

    [HttpPut("mesas/{id:int}")]
    public async Task<IActionResult> UpdateMesa(int id, [FromBody] MesaUpsertDto dto, CancellationToken ct)
    {
        var mesa = await _db.Mesas.FindAsync(new object[] { id }, ct);
        if (mesa is null) return NotFound(new { message = $"Mesa {id} no encontrada." });

        if (string.IsNullOrWhiteSpace(dto.Numero))
            return BadRequest(new { message = "El número es requerido." });

        var area = await _db.Areas.FindAsync(new object[] { dto.AreaId }, ct);
        if (area is null) return BadRequest(new { message = "El área especificada no existe." });

        if (!string.Equals(mesa.Numero, dto.Numero.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            var duplic = await _db.Mesas.AnyAsync(m => m.Id != id && m.Numero.ToLower() == dto.Numero.Trim().ToLower(), ct);
            if (duplic) return BadRequest(new { message = $"Ya existe una mesa con el número '{dto.Numero}'." });
        }

        mesa.Numero    = dto.Numero.Trim();
        mesa.AreaId    = dto.AreaId;
        mesa.Capacidad = dto.Capacidad;
        mesa.Activa    = dto.Activa;
        await _db.SaveChangesAsync(ct);
        return Ok(new MesaAdminDto { Id = mesa.Id, Numero = mesa.Numero, AreaId = mesa.AreaId, AreaNombre = area.Nombre, Capacidad = mesa.Capacidad, Activa = mesa.Activa });
    }

    [HttpDelete("mesas/{id:int}")]
    public async Task<IActionResult> DeleteMesa(int id, CancellationToken ct)
    {
        var mesa = await _db.Mesas.Include(m => m.Cuentas).FirstOrDefaultAsync(m => m.Id == id, ct);
        if (mesa is null) return NotFound(new { message = $"Mesa {id} no encontrada." });

        if (mesa.Cuentas.Any())
            return BadRequest(new { message = "No se puede eliminar: tiene cuentas asociadas. Desactívela en su lugar." });

        _db.Mesas.Remove(mesa);
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Mesa eliminada." });
    }

    // ── CRUD MESEROS ─────────────────────────────────────────────────────────────

    [HttpGet("meseros")]
    public async Task<IActionResult> GetMeseros(CancellationToken ct)
    {
        var result = await _db.Usuarios
            .Where(u => u.Rol == "Mesera" || u.Rol == "Barman")
            .OrderBy(u => u.Nombre)
            .Select(u => new MeseroDto
            {
                Id            = u.Id,
                Nombre        = u.Nombre,
                Codigo        = u.Codigo,
                Rol           = u.Rol,
                Activo        = u.Activo,
                FechaCreacion = u.FechaCreacion,
            })
            .ToListAsync(ct);
        return Ok(result);
    }

    [HttpPost("meseros")]
    public async Task<IActionResult> CreateMesero([FromBody] MeseroCreateDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre)) return BadRequest(new { message = "El nombre es requerido." });
        if (string.IsNullOrWhiteSpace(dto.Codigo)) return BadRequest(new { message = "El código es requerido." });
        if (string.IsNullOrWhiteSpace(dto.Pin) || dto.Pin.Length < 4)
            return BadRequest(new { message = "El PIN debe tener al menos 4 dígitos." });
        if (!new[] { "Mesera", "Barman" }.Contains(dto.Rol))
            return BadRequest(new { message = "El rol debe ser Mesera o Barman." });

        var duplic = await _db.Usuarios.AnyAsync(u => u.Codigo.ToLower() == dto.Codigo.Trim().ToLower(), ct);
        if (duplic) return BadRequest(new { message = $"El código '{dto.Codigo}' ya está en uso." });

        var usuario = new Models.Usuario
        {
            Nombre        = dto.Nombre.Trim(),
            Codigo        = dto.Codigo.Trim(),
            Rol           = dto.Rol,
            PinHash       = BCrypt.Net.BCrypt.HashPassword(dto.Pin),
            Activo        = true,
            FechaCreacion = DateTime.Now,
        };
        _db.Usuarios.Add(usuario);
        await _db.SaveChangesAsync(ct);
        return Ok(new MeseroDto { Id = usuario.Id, Nombre = usuario.Nombre, Codigo = usuario.Codigo, Rol = usuario.Rol, Activo = usuario.Activo, FechaCreacion = usuario.FechaCreacion });
    }

    [HttpPut("meseros/{id:int}")]
    public async Task<IActionResult> UpdateMesero(int id, [FromBody] MeseroUpdateDto dto, CancellationToken ct)
    {
        var usuario = await _db.Usuarios.FindAsync(new object[] { id }, ct);
        if (usuario is null) return NotFound(new { message = $"Usuario {id} no encontrado." });
        if (usuario.Rol == "Admin") return BadRequest(new { message = "No se puede modificar al administrador desde este módulo." });

        if (string.IsNullOrWhiteSpace(dto.Nombre)) return BadRequest(new { message = "El nombre es requerido." });
        if (string.IsNullOrWhiteSpace(dto.Codigo)) return BadRequest(new { message = "El código es requerido." });
        if (!new[] { "Mesera", "Barman" }.Contains(dto.Rol))
            return BadRequest(new { message = "El rol debe ser Mesera o Barman." });

        if (!string.Equals(usuario.Codigo, dto.Codigo.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            var duplic = await _db.Usuarios.AnyAsync(u => u.Id != id && u.Codigo.ToLower() == dto.Codigo.Trim().ToLower(), ct);
            if (duplic) return BadRequest(new { message = $"El código '{dto.Codigo}' ya está en uso." });
        }

        usuario.Nombre = dto.Nombre.Trim();
        usuario.Codigo = dto.Codigo.Trim();
        usuario.Rol    = dto.Rol;
        usuario.Activo = dto.Activo;
        if (!string.IsNullOrEmpty(dto.Pin))
            usuario.PinHash = BCrypt.Net.BCrypt.HashPassword(dto.Pin);

        await _db.SaveChangesAsync(ct);
        return Ok(new MeseroDto { Id = usuario.Id, Nombre = usuario.Nombre, Codigo = usuario.Codigo, Rol = usuario.Rol, Activo = usuario.Activo, FechaCreacion = usuario.FechaCreacion });
    }

    [HttpDelete("meseros/{id:int}")]
    public async Task<IActionResult> DeleteMesero(int id, CancellationToken ct)
    {
        var usuario = await _db.Usuarios.FindAsync(new object[] { id }, ct);
        if (usuario is null) return NotFound(new { message = $"Usuario {id} no encontrado." });
        if (usuario.Rol == "Admin") return BadRequest(new { message = "No se puede eliminar al administrador." });

        usuario.Activo = false;
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Mesero desactivado." });
    }

    // DELETE /api/admin/meseros/{id}/permanent — hard delete (solo si sin cuentas)
    [HttpDelete("meseros/{id:int}/permanent")]
    public async Task<IActionResult> DeleteMeseroPermanente(int id, CancellationToken ct)
    {
        var usuario = await _db.Usuarios.FindAsync(new object[] { id }, ct);
        if (usuario is null) return NotFound(new { message = $"Usuario {id} no encontrado." });
        if (usuario.Rol == "Admin") return BadRequest(new { message = "No se puede eliminar al administrador." });

        var tieneCuentas = await _db.Cuentas.AnyAsync(c => c.MeseraId == id, ct);
        if (tieneCuentas)
            return BadRequest(new { message = $"{usuario.Nombre} tiene cuentas asociadas y no puede eliminarse permanentemente. Desactívalo en su lugar." });

        _db.Usuarios.Remove(usuario);
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = $"{usuario.Nombre} eliminado permanentemente." });
    }

    // ── CRUD FORMAS DE PAGO ──────────────────────────────────────────────────────

    [HttpGet("formas-pago")]
    public async Task<IActionResult> GetFormasPago(CancellationToken ct)
    {
        var result = await _db.FormasPago
            .OrderBy(f => f.Orden).ThenBy(f => f.Nombre)
            .Select(f => new FormaPagoDto
            {
                Id                 = f.Id,
                Nombre             = f.Nombre,
                Codigo             = f.Codigo,
                ComisionPorcentaje = f.ComisionPorcentaje,
                ActivaParaCobro    = f.ActivaParaCobro,
                Orden              = f.Orden,
            })
            .ToListAsync(ct);
        return Ok(result);
    }

    [HttpPost("formas-pago")]
    public async Task<IActionResult> CreateFormaPago([FromBody] FormaPagoUpsertDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre)) return BadRequest(new { message = "El nombre es requerido." });

        var duplic = await _db.FormasPago.AnyAsync(f => f.Nombre.ToLower() == dto.Nombre.Trim().ToLower(), ct);
        if (duplic) return BadRequest(new { message = "Ya existe una forma de pago con ese nombre." });

        var fp = new FormaPago { Nombre = dto.Nombre.Trim(), Codigo = dto.Codigo.Trim().ToUpper(), ComisionPorcentaje = dto.ComisionPorcentaje, ActivaParaCobro = dto.ActivaParaCobro, Orden = dto.Orden };
        _db.FormasPago.Add(fp);
        await _db.SaveChangesAsync(ct);
        return Ok(new FormaPagoDto { Id = fp.Id, Nombre = fp.Nombre, Codigo = fp.Codigo, ComisionPorcentaje = fp.ComisionPorcentaje, ActivaParaCobro = fp.ActivaParaCobro, Orden = fp.Orden });
    }

    [HttpPut("formas-pago/{id:int}")]
    public async Task<IActionResult> UpdateFormaPago(int id, [FromBody] FormaPagoUpsertDto dto, CancellationToken ct)
    {
        var fp = await _db.FormasPago.FindAsync(new object[] { id }, ct);
        if (fp is null) return NotFound(new { message = $"Forma de pago {id} no encontrada." });

        if (string.IsNullOrWhiteSpace(dto.Nombre)) return BadRequest(new { message = "El nombre es requerido." });

        if (!string.Equals(fp.Nombre, dto.Nombre.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            var duplic = await _db.FormasPago.AnyAsync(f => f.Id != id && f.Nombre.ToLower() == dto.Nombre.Trim().ToLower(), ct);
            if (duplic) return BadRequest(new { message = "Ya existe una forma de pago con ese nombre." });
        }

        fp.Nombre             = dto.Nombre.Trim();
        fp.Codigo             = dto.Codigo.Trim().ToUpper();
        fp.ComisionPorcentaje = dto.ComisionPorcentaje;
        fp.ActivaParaCobro    = dto.ActivaParaCobro;
        fp.Orden              = dto.Orden;
        await _db.SaveChangesAsync(ct);
        return Ok(new FormaPagoDto { Id = fp.Id, Nombre = fp.Nombre, Codigo = fp.Codigo, ComisionPorcentaje = fp.ComisionPorcentaje, ActivaParaCobro = fp.ActivaParaCobro, Orden = fp.Orden });
    }

    [HttpDelete("formas-pago/{id:int}")]
    public async Task<IActionResult> DeleteFormaPago(int id, CancellationToken ct)
    {
        var fp = await _db.FormasPago.FindAsync(new object[] { id }, ct);
        if (fp is null) return NotFound(new { message = $"Forma de pago {id} no encontrada." });

        _db.FormasPago.Remove(fp);
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Forma de pago eliminada." });
    }

    // POST /api/admin/formas-pago/seed — inserta las 3 formas base si no existen
    [HttpPost("formas-pago/seed")]
    public async Task<IActionResult> SeedFormasPago(CancellationToken ct)
    {
        var defaults = new[]
        {
            new { Nombre = "Efectivo",    Codigo = "EFE", Comision = 0m,  Orden = 1 },
            new { Nombre = "Tarjeta",     Codigo = "TAR", Comision = 5m,  Orden = 2 },
            new { Nombre = "Pago mixto",  Codigo = "MIX", Comision = 0m,  Orden = 3 },
        };
        int creadas = 0;
        foreach (var d in defaults)
        {
            if (!await _db.FormasPago.AnyAsync(f => f.Codigo == d.Codigo, ct))
            {
                _db.FormasPago.Add(new BarAvenida.API.Models.FormaPago
                {
                    Nombre             = d.Nombre,
                    Codigo             = d.Codigo,
                    ComisionPorcentaje = d.Comision,
                    ActivaParaCobro    = true,
                    Orden              = d.Orden,
                });
                creadas++;
            }
        }
        await _db.SaveChangesAsync(ct);
        return Ok(new { message = $"{creadas} forma(s) de pago creadas.", creadas });
    }

    // ── FOLIO / SECUENCIA ────────────────────────────────────────────────────────

    [HttpGet("folio")]
    public async Task<IActionResult> GetFolio(CancellationToken ct)
    {
        var sec = await _db.SecuenciasFolio.FindAsync(new object[] { 1 }, ct);
        if (sec is null) return NotFound();
        return Ok(new FolioDto { UltimoFolio = sec.UltimoFolio, PrefijoFolio = sec.PrefijoFolio, LongitudMinima = sec.LongitudMinima });
    }

    [HttpPut("folio")]
    public async Task<IActionResult> UpdateFolio([FromBody] FolioUpdateDto dto, CancellationToken ct)
    {
        var sec = await _db.SecuenciasFolio.FindAsync(new object[] { 1 }, ct);
        if (sec is null) return NotFound();

        sec.PrefijoFolio   = dto.PrefijoFolio?.Trim() ?? "";
        sec.LongitudMinima = Math.Clamp(dto.LongitudMinima, 1, 10);
        await _db.SaveChangesAsync(ct);
        return Ok(new FolioDto { UltimoFolio = sec.UltimoFolio, PrefijoFolio = sec.PrefijoFolio, LongitudMinima = sec.LongitudMinima });
    }

    // GET /api/admin/impresoras-disponibles
    [HttpGet("impresoras-disponibles")]
    [System.Runtime.Versioning.SupportedOSPlatform("windows")]
    public IActionResult GetImpresorasDisponibles()
    {
        var impresoras = new List<string>();
        try
        {
            using var key = Microsoft.Win32.Registry.LocalMachine
                .OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Print\Printers");
            if (key is not null)
                impresoras.AddRange(key.GetSubKeyNames());
        }
        catch { }

        // Filtrar entradas SID (impresoras de usuario, no del sistema)
        impresoras = impresoras
            .Where(p => !System.Text.RegularExpressions.Regex.IsMatch(p, @"^S-\d-\d-\d"))
            .ToList();

        return Ok(new { impresoras });
    }

    // GET /api/admin/tickets-simulados/recientes?limit=10
    [HttpGet("tickets-simulados/recientes")]
    public IActionResult GetTicketsSimuladosRecientes([FromQuery] int limit = 10)
    {
        limit = Math.Clamp(limit, 1, 50);
        const string carpeta = @"F:\BarAvenida\TicketsImpresos";

        if (!Directory.Exists(carpeta))
            return Ok(new { tickets = Array.Empty<object>() });

        var tickets = Directory
            .GetFiles(carpeta, "ticket-*.html")
            .Select(f => Path.GetFileNameWithoutExtension(f)!)
            .Distinct()
            .Select(baseName =>
            {
                var parts  = baseName.Split('-');
                string folio  = parts.Length >= 4 ? string.Join("-", parts[1..^2]) : baseName;
                string tsRaw  = parts.Length >= 4 ? $"{parts[^2]}-{parts[^1]}" : "";
                _ = DateTime.TryParseExact(tsRaw, "yyyyMMdd-HHmmss",
                        System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.None,
                        out DateTime fecha);
                return new { baseName, folio, fecha };
            })
            .OrderByDescending(t => t.fecha)
            .Take(limit)
            .ToList();

        return Ok(new { tickets });
    }

    // GET /api/admin/tickets-simulados/preview/{baseName}
    [HttpGet("tickets-simulados/preview/{baseName}")]
    public IActionResult GetTicketPreview(string baseName)
    {
        if (!System.Text.RegularExpressions.Regex.IsMatch(baseName, @"^ticket-[\w-]+$"))
            return BadRequest(new { message = "Nombre inválido." });

        const string carpeta = @"F:\BarAvenida\TicketsImpresos";
        string ruta = Path.Combine(carpeta, baseName + ".html");

        if (!System.IO.File.Exists(ruta))
            return NotFound(new { message = "Ticket no encontrado." });

        return PhysicalFile(ruta, "text/html; charset=utf-8");
    }

    // GET /api/admin/registros-cajon
    [HttpGet("registros-cajon")]
    public async Task<IActionResult> GetRegistrosCajon(
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        CancellationToken ct)
    {
        var inicio = desde?.Date ?? DateTime.Today;
        var fin    = (hasta?.Date ?? DateTime.Today).AddDays(1);

        var registros = await _db.RegistrosAperturaCajon
            .Include(r => r.Usuario)
            .Where(r => r.Fecha >= inicio && r.Fecha < fin)
            .OrderByDescending(r => r.Fecha)
            .Select(r => new RegistroCajonDto
            {
                Id            = r.Id,
                UsuarioNombre = r.Usuario!.Nombre,
                Fecha         = r.Fecha,
                Motivo        = r.Motivo,
                CuentaId      = r.CuentaId,
            })
            .ToListAsync(ct);

        return Ok(registros);
    }
}
