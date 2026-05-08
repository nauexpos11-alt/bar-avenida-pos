using BarAvenida.API.Models;
using Microsoft.EntityFrameworkCore;

namespace BarAvenida.API.Data;

public class BarAvenidaDbContext : DbContext
{
    public BarAvenidaDbContext(DbContextOptions<BarAvenidaDbContext> options) : base(options)
    {
    }

    public DbSet<Usuario> Usuarios { get; set; }
    public DbSet<Area> Areas { get; set; }
    public DbSet<Mesa> Mesas { get; set; }
    public DbSet<Categoria> Categorias { get; set; }
    public DbSet<Producto> Productos { get; set; }
    public DbSet<Cuenta> Cuentas { get; set; }
    public DbSet<Orden> Ordenes { get; set; }
    public DbSet<OrdenDetalle> OrdenDetalles { get; set; }
    public DbSet<InventarioItem> InventarioItems { get; set; }
    public DbSet<MovimientoInventario> MovimientosInventario { get; set; }
    public DbSet<Sensor> Sensores { get; set; }
    public DbSet<LecturaSensor> LecturasSensor { get; set; }
    public DbSet<CorteCaja> CortesCaja { get; set; }
    public DbSet<CajaTurno> CajaTurnos { get; set; }
    public DbSet<RetiroCaja> RetirosCaja { get; set; }
    public DbSet<ConfiguracionTicket> ConfiguracionesTicket { get; set; }
    public DbSet<RegistroAperturaCajon> RegistrosAperturaCajon { get; set; }
    public DbSet<FormaPago> FormasPago { get; set; }
    public DbSet<SecuenciaFolio> SecuenciasFolio { get; set; }
    public DbSet<SolicitudCancelacion> SolicitudesCancelacion { get; set; }
    public DbSet<IncidenteCaja> IncidentesCaja { get; set; }
    public DbSet<ReglaCrossSell> ReglasCrossSell { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ÍNDICES ÚNICOS
        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.Codigo)
            .IsUnique();

        modelBuilder.Entity<Sensor>()
            .HasIndex(s => s.IdHardware)
            .IsUnique();

        modelBuilder.Entity<Mesa>()
            .HasIndex(m => m.Numero)
            .IsUnique();

        // RELACIONES - Evitar borrado en cascada que cree ciclos
        modelBuilder.Entity<Producto>()
            .HasOne(p => p.InventarioItem)
            .WithMany()
            .HasForeignKey(p => p.InventarioItemId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<MovimientoInventario>()
            .HasOne(m => m.Usuario)
            .WithMany()
            .HasForeignKey(m => m.UsuarioId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<CorteCaja>()
            .HasOne(c => c.UsuarioApertura)
            .WithMany()
            .HasForeignKey(c => c.UsuarioAperturaId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<CorteCaja>()
            .HasOne(c => c.UsuarioCierre)
            .WithMany()
            .HasForeignKey(c => c.UsuarioCierreId)
            .OnDelete(DeleteBehavior.NoAction);

        // SolicitudCancelacion FKs — NoAction en todas para evitar ciclos de cascada
        modelBuilder.Entity<SolicitudCancelacion>()
            .HasOne(s => s.Cuenta)
            .WithMany()
            .HasForeignKey(s => s.CuentaId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<SolicitudCancelacion>()
            .HasOne(s => s.Mesa)
            .WithMany()
            .HasForeignKey(s => s.MesaId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<SolicitudCancelacion>()
            .HasOne(s => s.Mesera)
            .WithMany()
            .HasForeignKey(s => s.MeseraId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<SolicitudCancelacion>()
            .HasOne(s => s.Admin)
            .WithMany()
            .HasForeignKey(s => s.AdminId)
            .OnDelete(DeleteBehavior.NoAction);

        // IncidenteCaja FKs — NoAction en todas para evitar ciclos de cascada (PROMPT C.3)
        modelBuilder.Entity<IncidenteCaja>()
            .HasOne(i => i.Turno).WithMany().HasForeignKey(i => i.TurnoId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<IncidenteCaja>()
            .HasOne(i => i.Corte).WithMany().HasForeignKey(i => i.CorteId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<IncidenteCaja>()
            .HasOne(i => i.AutorizadoPor).WithMany().HasForeignKey(i => i.AutorizadoPorId)
            .OnDelete(DeleteBehavior.NoAction);

        // ReglaCrossSell FKs — NoAction + índice único (PROMPT G)
        modelBuilder.Entity<ReglaCrossSell>()
            .HasOne(r => r.ProductoOrigen).WithMany().HasForeignKey(r => r.ProductoOrigenId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<ReglaCrossSell>()
            .HasOne(r => r.ProductoSugerido).WithMany().HasForeignKey(r => r.ProductoSugeridoId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<ReglaCrossSell>()
            .HasIndex(r => new { r.ProductoOrigenId, r.ProductoSugeridoId })
            .IsUnique();

        // ===================================================================
        // DATOS SEMILLA
        // ===================================================================

        // ÁREAS
        modelBuilder.Entity<Area>().HasData(
            new Area { Id = 1, Nombre = "Comedor", Activa = true },
            new Area { Id = 2, Nombre = "Terraza", Activa = true },
            new Area { Id = 3, Nombre = "Barra",   Activa = true }
        );

        // USUARIOS — hashes estáticos para que las migraciones no regeneren diffs
        // Admin PIN: 1234 | Mesera PIN: 0001 | Barman PIN: 0002
        modelBuilder.Entity<Usuario>().HasData(
            new Usuario
            {
                Id = 1, Nombre = "Coronado", Codigo = "ADMIN", Rol = "Admin", Activo = true,
                FechaCreacion = new DateTime(2026, 1, 1),
                PinHash = "$2a$11$KU/QP6s5mK4YUqWEugxt4ed7b.HtQI3SzqTYfBcYv7pz3uIFhRJCa"
            },
            new Usuario
            {
                Id = 2, Nombre = "ABBY GZZ", Codigo = "23", Rol = "Mesera", Activo = true,
                FechaCreacion = new DateTime(2026, 1, 1),
                PinHash = "$2a$11$txNeaEMqmZmifGpvJJ2H2O9ByXgnNkTYbSZpE6lRHJNUi.xbFTwLO"
            },
            new Usuario
            {
                Id = 3, Nombre = "IRIS", Codigo = "28", Rol = "Mesera", Activo = true,
                FechaCreacion = new DateTime(2026, 1, 1),
                PinHash = "$2a$11$txNeaEMqmZmifGpvJJ2H2O9ByXgnNkTYbSZpE6lRHJNUi.xbFTwLO"
            },
            new Usuario
            {
                Id = 4, Nombre = "Barman 1", Codigo = "BAR1", Rol = "Barman", Activo = true,
                FechaCreacion = new DateTime(2026, 1, 1),
                PinHash = "$2a$11$mIXN5YLqK9H3eJQl2ZQi2.E2Cf9VIJBeXgqBNNeBJmO9K/oLws9Ae"
            }
        );

        // CATEGORÍAS
        modelBuilder.Entity<Categoria>().HasData(
            new Categoria { Id =  1, Nombre = "Cervezas",    Orden =  1, ColorHex = "#F4A460", Activa = true },
            new Categoria { Id =  2, Nombre = "Tequilas",    Orden =  2, ColorHex = "#DAA520", Activa = true },
            new Categoria { Id =  3, Nombre = "Refrescos",   Orden =  3, ColorHex = "#DC143C", Activa = true },
            new Categoria { Id =  4, Nombre = "Preparados",  Orden =  4, ColorHex = "#FF6347", Activa = true },
            new Categoria { Id =  5, Nombre = "Ron",         Orden =  5, ColorHex = "#8B4513", Activa = true },
            new Categoria { Id =  6, Nombre = "Wiskys",      Orden =  6, ColorHex = "#A0522D", Activa = true },
            new Categoria { Id =  7, Nombre = "Mezcal",      Orden =  7, ColorHex = "#556B2F", Activa = true },
            new Categoria { Id =  8, Nombre = "Vodkas",      Orden =  8, ColorHex = "#4682B4", Activa = true },
            new Categoria { Id =  9, Nombre = "Brandys",     Orden =  9, ColorHex = "#A52A2A", Activa = true },
            new Categoria { Id = 10, Nombre = "Mezcladores", Orden = 10, ColorHex = "#9370DB", Activa = true },
            new Categoria { Id = 11, Nombre = "Licores",     Orden = 11, ColorHex = "#9932CC", Activa = true },
            new Categoria { Id = 12, Nombre = "Botanas",     Orden = 12, ColorHex = "#F4E04D", Activa = true },
            new Categoria { Id = 13, Nombre = "Clamatos",    Orden = 13, ColorHex = "#B22222", Activa = true },
            new Categoria { Id = 14, Nombre = "Servicios",   Orden = 14, ColorHex = "#708090", Activa = true },
            new Categoria { Id = 15, Nombre = "Cigarros",    Orden = 15, ColorHex = "#696969", Activa = true },
            new Categoria { Id = 16, Nombre = "Cubetas",     Orden = 16, ColorHex = "#4169E1", Activa = true },
            new Categoria { Id = 17, Nombre = "Otros",       Orden = 17, ColorHex = "#778899", Activa = true }
        );

        // MESAS — 50 mesas en comedor
        var mesas = new List<Mesa>();
        for (int i = 1; i <= 50; i++)
            mesas.Add(new Mesa { Id = i, Numero = i.ToString(), AreaId = 1, Capacidad = 4, Activa = true });
        modelBuilder.Entity<Mesa>().HasData(mesas);

        // ===================================================================
        // PRODUCTOS REALES
        // IDs 1-16   Cervezas      (CategoriaId=1)
        // IDs 17-38  Tequilas      (CategoriaId=2)
        // IDs 39-42  Refrescos     (CategoriaId=3)
        // IDs 43-52  Preparados    (CategoriaId=4)
        // IDs 53-62  Ron           (CategoriaId=5)
        // IDs 63-82  Wiskys        (CategoriaId=6)
        // IDs 83-86  Mezcal        (CategoriaId=7)
        // IDs 87-94  Vodkas        (CategoriaId=8)
        // IDs 95-100 Brandys       (CategoriaId=9)
        // IDs 101-103 Mezcladores  (CategoriaId=10)
        // IDs 104-107 Licores      (CategoriaId=11)
        // IDs 108-118 Botanas      (CategoriaId=12)
        // IDs 119-126 Clamatos     (CategoriaId=13)
        // IDs 127-128 Servicios    (CategoriaId=14)
        // IDs 129-132 Cigarros     (CategoriaId=15)
        // IDs 133-145 Cubetas      (CategoriaId=16)
        // ===================================================================
        modelBuilder.Entity<Producto>().HasData(

            // ── CERVEZAS ────────────────────────────────
            new Producto { Id=  1, Nombre="Corona",         CategoriaId=1, Precio=40, TipoVenta="Pieza", Activo=true, Orden= 1 },
            new Producto { Id=  2, Nombre="Tecate",         CategoriaId=1, Precio=35, TipoVenta="Pieza", Activo=true, Orden= 2 },
            new Producto { Id=  3, Nombre="Indio",          CategoriaId=1, Precio=35, TipoVenta="Pieza", Activo=true, Orden= 3 },
            new Producto { Id=  4, Nombre="Victoria",       CategoriaId=1, Precio=40, TipoVenta="Pieza", Activo=true, Orden= 4 },
            new Producto { Id=  5, Nombre="Ambar Corona",   CategoriaId=1, Precio=45, TipoVenta="Pieza", Activo=true, Orden= 5 },
            new Producto { Id=  6, Nombre="Ultra Michelob", CategoriaId=1, Precio=45, TipoVenta="Pieza", Activo=true, Orden= 6 },
            new Producto { Id=  7, Nombre="Carta Blanca",   CategoriaId=1, Precio=45, TipoVenta="Pieza", Activo=true, Orden= 7 },
            new Producto { Id=  8, Nombre="Caguama",        CategoriaId=1, Precio=45, TipoVenta="Pieza", Activo=true, Orden= 8 },
            new Producto { Id=  9, Nombre="Miller Media",   CategoriaId=1, Precio=85, TipoVenta="Pieza", Activo=true, Orden= 9 },
            new Producto { Id= 10, Nombre="Miller Caguama", CategoriaId=1, Precio=47, TipoVenta="Pieza", Activo=true, Orden=10 },
            new Producto { Id= 11, Nombre="XX Lager",       CategoriaId=1, Precio=45, TipoVenta="Pieza", Activo=true, Orden=11 },
            new Producto { Id= 12, Nombre="Bohemia",        CategoriaId=1, Precio=45, TipoVenta="Pieza", Activo=true, Orden=12 },
            new Producto { Id= 13, Nombre="Heineken",       CategoriaId=1, Precio=45, TipoVenta="Pieza", Activo=true, Orden=13 },
            new Producto { Id= 14, Nombre="Modelo",         CategoriaId=1, Precio=42, TipoVenta="Pieza", Activo=true, Orden=14 },
            new Producto { Id= 15, Nombre="Amstel Ultra",   CategoriaId=1, Precio=45, TipoVenta="Pieza", Activo=true, Orden=15 },
            new Producto { Id= 16, Nombre="Tecate Roja",    CategoriaId=1, Precio=35, TipoVenta="Pieza", Activo=true, Orden=16 },

            // ── TEQUILAS (shots) ─────────────────────────
            new Producto { Id= 17, Nombre="Centenario Shot",          CategoriaId=2, Precio=  65, TipoVenta="Shot",    Activo=true, Orden= 1 },
            new Producto { Id= 18, Nombre="Tradicional Shot",         CategoriaId=2, Precio=  65, TipoVenta="Shot",    Activo=true, Orden= 2 },
            new Producto { Id= 19, Nombre="Hornitos Shot",            CategoriaId=2, Precio=  65, TipoVenta="Shot",    Activo=true, Orden= 3 },
            new Producto { Id= 20, Nombre="Codorniz Shot",            CategoriaId=2, Precio=  55, TipoVenta="Shot",    Activo=true, Orden= 4 },
            new Producto { Id= 21, Nombre="Cuervo Especial Shot",     CategoriaId=2, Precio=  65, TipoVenta="Shot",    Activo=true, Orden= 5 },
            new Producto { Id= 22, Nombre="Maestro Dobel Shot",       CategoriaId=2, Precio= 100, TipoVenta="Shot",    Activo=true, Orden= 6 },
            new Producto { Id= 23, Nombre="Don Julio 70 Shot",        CategoriaId=2, Precio= 150, TipoVenta="Shot",    Activo=true, Orden= 7 },
            new Producto { Id= 24, Nombre="Don Julio Rep y Bco Shot", CategoriaId=2, Precio= 100, TipoVenta="Shot",    Activo=true, Orden= 8 },
            new Producto { Id= 25, Nombre="Jimador Shot",             CategoriaId=2, Precio=  55, TipoVenta="Shot",    Activo=true, Orden= 9 },
            new Producto { Id= 26, Nombre="1800 Cristalino Shot",     CategoriaId=2, Precio= 100, TipoVenta="Shot",    Activo=true, Orden=10 },
            new Producto { Id= 27, Nombre="1800 Añe Rep Bco Shot",    CategoriaId=2, Precio=  75, TipoVenta="Shot",    Activo=true, Orden=11 },
            // ── TEQUILAS (botellas) ──────────────────────
            new Producto { Id= 28, Nombre="1800 Botella Rep Bco",          CategoriaId=2, Precio=  850, TipoVenta="Botella", Activo=true, Orden=12 },
            new Producto { Id= 29, Nombre="Centenario Botella",            CategoriaId=2, Precio=  850, TipoVenta="Botella", Activo=true, Orden=13 },
            new Producto { Id= 30, Nombre="Codorniz Botella",              CategoriaId=2, Precio=  750, TipoVenta="Botella", Activo=true, Orden=14 },
            new Producto { Id= 31, Nombre="Cuervo Especial Botella",       CategoriaId=2, Precio=  800, TipoVenta="Botella", Activo=true, Orden=15 },
            new Producto { Id= 32, Nombre="Don Julio 70 Botella",          CategoriaId=2, Precio= 1800, TipoVenta="Botella", Activo=true, Orden=16 },
            new Producto { Id= 33, Nombre="Don Julio Rep y Bco Botella",   CategoriaId=2, Precio= 1200, TipoVenta="Botella", Activo=true, Orden=17 },
            new Producto { Id= 34, Nombre="Hornitos Botella",              CategoriaId=2, Precio=  800, TipoVenta="Botella", Activo=true, Orden=18 },
            new Producto { Id= 35, Nombre="Jimador Botella",               CategoriaId=2, Precio=  750, TipoVenta="Botella", Activo=true, Orden=19 },
            new Producto { Id= 36, Nombre="Maestro Dobel Botella",         CategoriaId=2, Precio= 1700, TipoVenta="Botella", Activo=true, Orden=20 },
            new Producto { Id= 37, Nombre="Tradicional Botella",           CategoriaId=2, Precio=  800, TipoVenta="Botella", Activo=true, Orden=21 },
            new Producto { Id= 38, Nombre="1800 Cristalino Botella",       CategoriaId=2, Precio= 1700, TipoVenta="Botella", Activo=true, Orden=22 },

            // ── REFRESCOS ────────────────────────────────
            new Producto { Id= 39, Nombre="Coca",        CategoriaId=3, Precio=35, TipoVenta="Pieza", Activo=true, Orden=1 },
            new Producto { Id= 40, Nombre="Fresca",      CategoriaId=3, Precio=35, TipoVenta="Pieza", Activo=true, Orden=2 },
            new Producto { Id= 41, Nombre="Agua Mineral",CategoriaId=3, Precio=35, TipoVenta="Pieza", Activo=true, Orden=3 },
            new Producto { Id= 42, Nombre="Agua Natural", CategoriaId=3, Precio=35, TipoVenta="Pieza", Activo=true, Orden=4 },

            // ── PREPARADOS ───────────────────────────────
            new Producto { Id= 43, Nombre="Sangrita Shot",           CategoriaId=4, Precio=  10, TipoVenta="Shot",  Activo=true, Orden= 1 },
            new Producto { Id= 44, Nombre="Limon Concentrado Shot",  CategoriaId=4, Precio=  10, TipoVenta="Shot",  Activo=true, Orden= 2 },
            new Producto { Id= 45, Nombre="Jarabe Nat Grana Shot",   CategoriaId=4, Precio=  15, TipoVenta="Shot",  Activo=true, Orden= 3 },
            new Producto { Id= 46, Nombre="Preparado Vampiro",       CategoriaId=4, Precio=  35, TipoVenta="Pieza", Activo=true, Orden= 4 },
            new Producto { Id= 47, Nombre="Preparado Paloma",        CategoriaId=4, Precio=  20, TipoVenta="Pieza", Activo=true, Orden= 5 },
            new Producto { Id= 48, Nombre="Vaso Chelado Sal y Limon",CategoriaId=4, Precio=  10, TipoVenta="Pieza", Activo=true, Orden= 6 },
            new Producto { Id= 49, Nombre="Limonada Grande",         CategoriaId=4, Precio=  70, TipoVenta="Pieza", Activo=true, Orden= 7 },
            new Producto { Id= 50, Nombre="Limonada Chica",          CategoriaId=4, Precio=  35, TipoVenta="Pieza", Activo=true, Orden= 8 },
            new Producto { Id= 51, Nombre="Shot Petroleo",           CategoriaId=4, Precio=  15, TipoVenta="Shot",  Activo=true, Orden= 9 },
            new Producto { Id= 52, Nombre="Perla Negra",             CategoriaId=4, Precio= 135, TipoVenta="Pieza", Activo=true, Orden=10 },

            // ── RON ──────────────────────────────────────
            new Producto { Id= 53, Nombre="Bacardi Carta Blanca Shot", CategoriaId=5, Precio= 65, TipoVenta="Shot",    Activo=true, Orden=1 },
            new Producto { Id= 54, Nombre="Bacardi Añejo Shot",        CategoriaId=5, Precio= 65, TipoVenta="Shot",    Activo=true, Orden=2 },
            new Producto { Id= 55, Nombre="Capitan Morgan Shot",       CategoriaId=5, Precio= 65, TipoVenta="Shot",    Activo=true, Orden=3 },
            new Producto { Id= 56, Nombre="Bacardi Solera Shot",       CategoriaId=5, Precio= 65, TipoVenta="Shot",    Activo=true, Orden=4 },
            new Producto { Id= 57, Nombre="Matusalem Shot",            CategoriaId=5, Precio= 65, TipoVenta="Shot",    Activo=true, Orden=5 },
            new Producto { Id= 58, Nombre="Bacardi Añejo Botella",     CategoriaId=5, Precio=650, TipoVenta="Botella", Activo=true, Orden=6 },
            new Producto { Id= 59, Nombre="Bacardi Carta Blanca Botella", CategoriaId=5, Precio=750, TipoVenta="Botella", Activo=true, Orden=7 },
            new Producto { Id= 60, Nombre="Bacardi Solera Botella",    CategoriaId=5, Precio=800, TipoVenta="Botella", Activo=true, Orden=8 },
            new Producto { Id= 61, Nombre="Capitan Morgan Botella",    CategoriaId=5, Precio=850, TipoVenta="Botella", Activo=true, Orden=9 },
            new Producto { Id= 62, Nombre="Matusalem Botella",         CategoriaId=5, Precio=850, TipoVenta="Botella", Activo=true, Orden=10 },

            // ── WISKYS (shots) ───────────────────────────
            new Producto { Id= 63, Nombre="Black Label Shot",        CategoriaId=6, Precio= 100, TipoVenta="Shot",    Activo=true, Orden= 1 },
            new Producto { Id= 64, Nombre="Red Label Shot",          CategoriaId=6, Precio=  75, TipoVenta="Shot",    Activo=true, Orden= 2 },
            new Producto { Id= 65, Nombre="Black White Shot",        CategoriaId=6, Precio=  70, TipoVenta="Shot",    Activo=true, Orden= 3 },
            new Producto { Id= 66, Nombre="Buchanans 12 Shot",       CategoriaId=6, Precio= 100, TipoVenta="Shot",    Activo=true, Orden= 4 },
            new Producto { Id= 67, Nombre="Buchanans 18 Shot",       CategoriaId=6, Precio= 170, TipoVenta="Shot",    Activo=true, Orden= 5 },
            new Producto { Id= 68, Nombre="Chivas Regal Shot",       CategoriaId=6, Precio= 100, TipoVenta="Shot",    Activo=true, Orden= 6 },
            new Producto { Id= 69, Nombre="Jack Daniels Shot",       CategoriaId=6, Precio=  85, TipoVenta="Shot",    Activo=true, Orden= 7 },
            new Producto { Id= 70, Nombre="Jack Daniels Honey Shot", CategoriaId=6, Precio=  85, TipoVenta="Shot",    Activo=true, Orden= 8 },
            new Producto { Id= 71, Nombre="Passport Shot",           CategoriaId=6, Precio=  55, TipoVenta="Shot",    Activo=true, Orden= 9 },
            new Producto { Id= 72, Nombre="William Lawson Shot",     CategoriaId=6, Precio=  55, TipoVenta="Shot",    Activo=true, Orden=10 },
            // ── WISKYS (botellas) ────────────────────────
            new Producto { Id= 73, Nombre="Black Label Botella",        CategoriaId=6, Precio= 1700, TipoVenta="Botella", Activo=true, Orden=11 },
            new Producto { Id= 74, Nombre="Red Label Botella",          CategoriaId=6, Precio=  850, TipoVenta="Botella", Activo=true, Orden=12 },
            new Producto { Id= 75, Nombre="Black White Botella",        CategoriaId=6, Precio=  800, TipoVenta="Botella", Activo=true, Orden=13 },
            new Producto { Id= 76, Nombre="Buchanans 12 Botella",       CategoriaId=6, Precio= 1700, TipoVenta="Botella", Activo=true, Orden=14 },
            new Producto { Id= 77, Nombre="Buchanans 18 Botella",       CategoriaId=6, Precio= 2800, TipoVenta="Botella", Activo=true, Orden=15 },
            new Producto { Id= 78, Nombre="Chivas Regal Botella",       CategoriaId=6, Precio= 1700, TipoVenta="Botella", Activo=true, Orden=16 },
            new Producto { Id= 79, Nombre="Jack Daniels Botella",       CategoriaId=6, Precio=  850, TipoVenta="Botella", Activo=true, Orden=17 },
            new Producto { Id= 80, Nombre="Jack Daniels Honey Botella", CategoriaId=6, Precio=  850, TipoVenta="Botella", Activo=true, Orden=18 },
            new Producto { Id= 81, Nombre="Passport Botella",           CategoriaId=6, Precio=  600, TipoVenta="Botella", Activo=true, Orden=19 },
            new Producto { Id= 82, Nombre="William Lawson Botella",     CategoriaId=6, Precio=  600, TipoVenta="Botella", Activo=true, Orden=20 },

            // ── MEZCAL ───────────────────────────────────
            new Producto { Id= 83, Nombre="400 Conejos Shot",    CategoriaId=7, Precio=  75, TipoVenta="Shot",    Activo=true, Orden=1 },
            new Producto { Id= 84, Nombre="Amaras Shot",         CategoriaId=7, Precio=  85, TipoVenta="Shot",    Activo=true, Orden=2 },
            new Producto { Id= 85, Nombre="400 Conejos Botella", CategoriaId=7, Precio= 900, TipoVenta="Botella", Activo=true, Orden=3 },
            new Producto { Id= 86, Nombre="Amaras Botella",      CategoriaId=7, Precio=1000, TipoVenta="Botella", Activo=true, Orden=4 },

            // ── VODKAS ───────────────────────────────────
            new Producto { Id= 87, Nombre="Absolut Shot",      CategoriaId=8, Precio= 65, TipoVenta="Shot",    Activo=true, Orden=1 },
            new Producto { Id= 88, Nombre="Wiborowa Shot",     CategoriaId=8, Precio= 55, TipoVenta="Shot",    Activo=true, Orden=2 },
            new Producto { Id= 89, Nombre="Smirnoff Shot",     CategoriaId=8, Precio= 65, TipoVenta="Shot",    Activo=true, Orden=3 },
            new Producto { Id= 90, Nombre="Oso Negro Shot",    CategoriaId=8, Precio= 65, TipoVenta="Shot",    Activo=true, Orden=4 },
            new Producto { Id= 91, Nombre="Absolut Botella",   CategoriaId=8, Precio=750, TipoVenta="Botella", Activo=true, Orden=5 },
            new Producto { Id= 92, Nombre="Oso Negro Botella", CategoriaId=8, Precio=650, TipoVenta="Botella", Activo=true, Orden=6 },
            new Producto { Id= 93, Nombre="Smirnoff Botella",  CategoriaId=8, Precio=750, TipoVenta="Botella", Activo=true, Orden=7 },
            new Producto { Id= 94, Nombre="Wiborowa Botella",  CategoriaId=8, Precio=750, TipoVenta="Botella", Activo=true, Orden=8 },

            // ── BRANDYS ──────────────────────────────────
            new Producto { Id= 95, Nombre="Torres 10 Shot",    CategoriaId=9, Precio= 75, TipoVenta="Shot",    Activo=true, Orden=1 },
            new Producto { Id= 96, Nombre="Presidente Shot",   CategoriaId=9, Precio= 50, TipoVenta="Shot",    Activo=true, Orden=2 },
            new Producto { Id= 97, Nombre="Don Pedro Shot",    CategoriaId=9, Precio= 50, TipoVenta="Shot",    Activo=true, Orden=3 },
            new Producto { Id= 98, Nombre="Torres 10 Botella", CategoriaId=9, Precio=750, TipoVenta="Botella", Activo=true, Orden=4 },
            new Producto { Id= 99, Nombre="Presidente Botella",CategoriaId=9, Precio=700, TipoVenta="Botella", Activo=true, Orden=5 },
            new Producto { Id=100, Nombre="Don Pedro Botella", CategoriaId=9, Precio=700, TipoVenta="Botella", Activo=true, Orden=6 },

            // ── MEZCLADORES ──────────────────────────────
            new Producto { Id=101, Nombre="Boost Chico",  CategoriaId=10, Precio=45, TipoVenta="Pieza", Activo=true, Orden=1 },
            new Producto { Id=102, Nombre="Boost Grande", CategoriaId=10, Precio=80, TipoVenta="Pieza", Activo=true, Orden=2 },
            new Producto { Id=103, Nombre="Red Bull",     CategoriaId=10, Precio=45, TipoVenta="Pieza", Activo=true, Orden=3 },

            // ── LICORES ──────────────────────────────────
            new Producto { Id=104, Nombre="Baileys Shot",      CategoriaId=11, Precio= 70, TipoVenta="Shot",    Activo=true, Orden=1 },
            new Producto { Id=105, Nombre="Licor 43 Shot",     CategoriaId=11, Precio= 75, TipoVenta="Shot",    Activo=true, Orden=2 },
            new Producto { Id=106, Nombre="Baileys Botella",   CategoriaId=11, Precio=800, TipoVenta="Botella", Activo=true, Orden=3 },
            new Producto { Id=107, Nombre="Licor 43 Botella",  CategoriaId=11, Precio=750, TipoVenta="Botella", Activo=true, Orden=4 },

            // ── BOTANAS ──────────────────────────────────
            new Producto { Id=108, Nombre="Papas Diversas",      CategoriaId=12, Precio=35, TipoVenta="Pieza", Activo=true, Orden= 1 },
            new Producto { Id=109, Nombre="Pistaches",           CategoriaId=12, Precio=38, TipoVenta="Pieza", Activo=true, Orden= 2 },
            new Producto { Id=110, Nombre="Carne Seca",          CategoriaId=12, Precio=48, TipoVenta="Pieza", Activo=true, Orden= 3 },
            new Producto { Id=111, Nombre="Cacahuates",          CategoriaId=12, Precio=35, TipoVenta="Pieza", Activo=true, Orden= 4 },
            new Producto { Id=112, Nombre="Camarones",           CategoriaId=12, Precio=35, TipoVenta="Pieza", Activo=true, Orden= 5 },
            new Producto { Id=113, Nombre="Charales",            CategoriaId=12, Precio=35, TipoVenta="Pieza", Activo=true, Orden= 6 },
            new Producto { Id=114, Nombre="Fritos Diversos",     CategoriaId=12, Precio=35, TipoVenta="Pieza", Activo=true, Orden= 7 },
            new Producto { Id=115, Nombre="Chicharrones",        CategoriaId=12, Precio=35, TipoVenta="Pieza", Activo=true, Orden= 8 },
            new Producto { Id=116, Nombre="Carne Seca Chihuahua",CategoriaId=12, Precio=50, TipoVenta="Pieza", Activo=true, Orden= 9 },
            new Producto { Id=117, Nombre="Takis",               CategoriaId=12, Precio=35, TipoVenta="Pieza", Activo=true, Orden=10 },
            new Producto { Id=118, Nombre="Chips",               CategoriaId=12, Precio=35, TipoVenta="Pieza", Activo=true, Orden=11 },

            // ── CLAMATOS ─────────────────────────────────
            new Producto { Id=119, Nombre="Clamato Chico",          CategoriaId=13, Precio=45, TipoVenta="Pieza", Activo=true, Orden=1 },
            new Producto { Id=120, Nombre="Clamato Grande",         CategoriaId=13, Precio=85, TipoVenta="Pieza", Activo=true, Orden=2 },
            new Producto { Id=121, Nombre="Michelada Chica",        CategoriaId=13, Precio=25, TipoVenta="Pieza", Activo=true, Orden=3 },
            new Producto { Id=122, Nombre="Michelada Grande",       CategoriaId=13, Precio=40, TipoVenta="Pieza", Activo=true, Orden=4 },
            new Producto { Id=123, Nombre="Vaso Chelado Limon y Sal",CategoriaId=13, Precio=10, TipoVenta="Pieza", Activo=true, Orden=5 },
            new Producto { Id=124, Nombre="Clamato Frasco",         CategoriaId=13, Precio=35, TipoVenta="Pieza", Activo=true, Orden=6 },
            new Producto { Id=125, Nombre="Escarchado Sencillo",    CategoriaId=13, Precio= 5, TipoVenta="Pieza", Activo=true, Orden=7 },
            new Producto { Id=126, Nombre="Escarchado con Limon",   CategoriaId=13, Precio=10, TipoVenta="Pieza", Activo=true, Orden=8 },

            // ── SERVICIOS ────────────────────────────────
            new Producto { Id=127, Nombre="Moneda",          CategoriaId=14, Precio=10, TipoVenta="Pieza", Activo=true, Orden=1 },
            new Producto { Id=128, Nombre="Salida de Dinero",CategoriaId=14, Precio= 1, TipoVenta="Pieza", Activo=true, Orden=2 },

            // ── CIGARROS ─────────────────────────────────
            new Producto { Id=129, Nombre="Marlboro Rojo",      CategoriaId=15, Precio= 13, TipoVenta="Pieza", Activo=true, Orden=1 },
            new Producto { Id=130, Nombre="Marlboro Blanco",    CategoriaId=15, Precio= 13, TipoVenta="Pieza", Activo=true, Orden=2 },
            new Producto { Id=131, Nombre="Caja Marlboro Bco",  CategoriaId=15, Precio=130, TipoVenta="Pieza", Activo=true, Orden=3 },
            new Producto { Id=132, Nombre="Caja Marlboro Rojo", CategoriaId=15, Precio=130, TipoVenta="Pieza", Activo=true, Orden=4 },

            // ── CUBETAS ──────────────────────────────────
            new Producto { Id=133, Nombre="Cubeta Corona",       CategoriaId=16, Precio=400, TipoVenta="Pieza", Activo=true, Orden= 1 },
            new Producto { Id=134, Nombre="Cubeta Tecate",       CategoriaId=16, Precio=350, TipoVenta="Pieza", Activo=true, Orden= 2 },
            new Producto { Id=135, Nombre="Cubeta Indio",        CategoriaId=16, Precio=350, TipoVenta="Pieza", Activo=true, Orden= 3 },
            new Producto { Id=136, Nombre="Cubeta Victoria",     CategoriaId=16, Precio=400, TipoVenta="Pieza", Activo=true, Orden= 4 },
            new Producto { Id=137, Nombre="Cubeta XX",           CategoriaId=16, Precio=450, TipoVenta="Pieza", Activo=true, Orden= 5 },
            new Producto { Id=138, Nombre="Cubeta Carta Blanca", CategoriaId=16, Precio=450, TipoVenta="Pieza", Activo=true, Orden= 6 },
            new Producto { Id=139, Nombre="Cubeta Bohemia",      CategoriaId=16, Precio=450, TipoVenta="Pieza", Activo=true, Orden= 7 },
            new Producto { Id=140, Nombre="Cubeta Miller",       CategoriaId=16, Precio=470, TipoVenta="Pieza", Activo=true, Orden= 8 },
            new Producto { Id=141, Nombre="Cubeta Ultra Michelob",CategoriaId=16, Precio=450, TipoVenta="Pieza", Activo=true, Orden= 9 },
            new Producto { Id=142, Nombre="Cubeta Ambar Corona", CategoriaId=16, Precio=450, TipoVenta="Pieza", Activo=true, Orden=10 },
            new Producto { Id=143, Nombre="Cubeta Heineken",     CategoriaId=16, Precio=450, TipoVenta="Pieza", Activo=true, Orden=11 },
            new Producto { Id=144, Nombre="Cubeta Modelo",       CategoriaId=16, Precio=450, TipoVenta="Pieza", Activo=true, Orden=12 },
            new Producto { Id=145, Nombre="Cubeta Amstel Ultra", CategoriaId=16, Precio=450, TipoVenta="Pieza", Activo=true, Orden=13 }
        );

        // CONFIGURACIÓN TICKET (singleton Id=1)
        modelBuilder.Entity<ConfiguracionTicket>().HasData(
            new ConfiguracionTicket
            {
                Id = 1,
                NombreNegocio        = "BAR AVENIDA",
                Direccion            = null,
                Telefono             = null,
                Rfc                  = null,
                MensajePie           = "Gracias por su visita",
                TipoConexion         = "USB",
                NombreImpresoraUsb   = null,
                IpImpresora          = null,
                PuertoImpresora      = 9100,
                AbrirCajonAlCobrar   = true,
                ImpresionHabilitada  = false,
                AnchoTicket          = 32
            }
        );

        // RegistroAperturaCajon — relación sin cascade delete
        modelBuilder.Entity<RegistroAperturaCajon>()
            .HasOne(r => r.Usuario)
            .WithMany()
            .HasForeignKey(r => r.UsuarioId)
            .OnDelete(DeleteBehavior.NoAction);

        // CajaTurno relationships
        modelBuilder.Entity<CajaTurno>()
            .HasOne(t => t.UsuarioApertura)
            .WithMany()
            .HasForeignKey(t => t.UsuarioAperturaId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<CajaTurno>()
            .HasOne(t => t.UsuarioCierre)
            .WithMany()
            .HasForeignKey(t => t.UsuarioCierreId)
            .OnDelete(DeleteBehavior.NoAction);

        // RetiroCaja relationships
        modelBuilder.Entity<RetiroCaja>()
            .HasOne(r => r.Turno)
            .WithMany(t => t.Retiros)
            .HasForeignKey(r => r.TurnoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RetiroCaja>()
            .HasOne(r => r.Usuario)
            .WithMany()
            .HasForeignKey(r => r.UsuarioId)
            .OnDelete(DeleteBehavior.NoAction);

        // CorteCaja — TurnoId FK (nullable para no romper registros existentes)
        modelBuilder.Entity<CorteCaja>()
            .HasOne(c => c.Turno)
            .WithMany(t => t.Cortes)
            .HasForeignKey(c => c.TurnoId)
            .OnDelete(DeleteBehavior.SetNull);

        // Cuenta — cancelación (nullable, sin cascade)
        modelBuilder.Entity<Cuenta>()
            .HasOne(c => c.UsuarioCancelacion)
            .WithMany()
            .HasForeignKey(c => c.UsuarioCancelacionId)
            .OnDelete(DeleteBehavior.NoAction);

        // FORMAS DE PAGO — seed
        modelBuilder.Entity<FormaPago>().HasData(
            new FormaPago { Id = 1, Nombre = "Efectivo",              Codigo = "EFE", ComisionPorcentaje = 0,    ActivaParaCobro = true,  Orden = 1 },
            new FormaPago { Id = 2, Nombre = "Tarjeta",               Codigo = "TAR", ComisionPorcentaje = 5,    ActivaParaCobro = true,  Orden = 2 },
            new FormaPago { Id = 3, Nombre = "Pago mixto",            Codigo = "MIX", ComisionPorcentaje = 0,    ActivaParaCobro = true,  Orden = 3 }
        );

        // SECUENCIA FOLIO — singleton Id=1
        modelBuilder.Entity<SecuenciaFolio>().HasData(
            new SecuenciaFolio { Id = 1, UltimoFolio = 0, PrefijoFolio = "", LongitudMinima = 4 }
        );
    }
}
