using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace BarAvenida.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Areas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nombre = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Activa = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Areas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Categorias",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nombre = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Orden = table.Column<int>(type: "int", nullable: false),
                    ColorHex = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Activa = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categorias", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Sensores",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdHardware = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Ubicacion = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Tipo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    EnLinea = table.Column<bool>(type: "bit", nullable: false),
                    UltimoHeartbeat = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Activo = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sensores", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Usuarios",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nombre = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Codigo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PinHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Rol = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Activo = table.Column<bool>(type: "bit", nullable: false),
                    FechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Usuarios", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Mesas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Numero = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    AreaId = table.Column<int>(type: "int", nullable: false),
                    Capacidad = table.Column<int>(type: "int", nullable: false),
                    Activa = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Mesas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Mesas_Areas_AreaId",
                        column: x => x.AreaId,
                        principalTable: "Areas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "InventarioItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Marca = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    TipoUnidad = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CantidadActual = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    StockMinimo = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    PesoEnvaseVacio = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    PesoEnvaseLleno = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    MetodoControl = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SensorId = table.Column<int>(type: "int", nullable: true),
                    UltimaActualizacion = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Activo = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventarioItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventarioItems_Sensores_SensorId",
                        column: x => x.SensorId,
                        principalTable: "Sensores",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "LecturasSensor",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SensorId = table.Column<int>(type: "int", nullable: false),
                    Valor = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Fecha = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LecturasSensor", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LecturasSensor_Sensores_SensorId",
                        column: x => x.SensorId,
                        principalTable: "Sensores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CortesCaja",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FechaApertura = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FechaCierre = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UsuarioAperturaId = table.Column<int>(type: "int", nullable: false),
                    UsuarioCierreId = table.Column<int>(type: "int", nullable: true),
                    MontoInicial = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    TotalEfectivo = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    TotalTarjeta = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    TotalTransferencia = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    TotalVentas = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    CuentasCobradas = table.Column<int>(type: "int", nullable: false),
                    Notas = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Estado = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CortesCaja", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CortesCaja_Usuarios_UsuarioAperturaId",
                        column: x => x.UsuarioAperturaId,
                        principalTable: "Usuarios",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CortesCaja_Usuarios_UsuarioCierreId",
                        column: x => x.UsuarioCierreId,
                        principalTable: "Usuarios",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Cuentas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MesaId = table.Column<int>(type: "int", nullable: false),
                    MeseraId = table.Column<int>(type: "int", nullable: false),
                    NumeroPersonas = table.Column<int>(type: "int", nullable: false),
                    NombreCliente = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    FechaApertura = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FechaCierre = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Estado = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Subtotal = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Descuento = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Total = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    MetodoPago = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Folio = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cuentas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cuentas_Mesas_MesaId",
                        column: x => x.MesaId,
                        principalTable: "Mesas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Cuentas_Usuarios_MeseraId",
                        column: x => x.MeseraId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MovimientosInventario",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InventarioItemId = table.Column<int>(type: "int", nullable: false),
                    Tipo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Cantidad = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    CantidadAnterior = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    CantidadNueva = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Motivo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    UsuarioId = table.Column<int>(type: "int", nullable: true),
                    OrdenId = table.Column<int>(type: "int", nullable: true),
                    Fecha = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MovimientosInventario", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MovimientosInventario_InventarioItems_InventarioItemId",
                        column: x => x.InventarioItemId,
                        principalTable: "InventarioItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MovimientosInventario_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Productos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CategoriaId = table.Column<int>(type: "int", nullable: false),
                    Precio = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    TipoVenta = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CantidadDescuento = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    InventarioItemId = table.Column<int>(type: "int", nullable: true),
                    Activo = table.Column<bool>(type: "bit", nullable: false),
                    Orden = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Productos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Productos_Categorias_CategoriaId",
                        column: x => x.CategoriaId,
                        principalTable: "Categorias",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Productos_InventarioItems_InventarioItemId",
                        column: x => x.InventarioItemId,
                        principalTable: "InventarioItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Ordenes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CuentaId = table.Column<int>(type: "int", nullable: false),
                    FechaEnvio = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FechaListo = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Estado = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    EsAgregado = table.Column<bool>(type: "bit", nullable: false),
                    Observaciones = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Ordenes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Ordenes_Cuentas_CuentaId",
                        column: x => x.CuentaId,
                        principalTable: "Cuentas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrdenDetalles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrdenId = table.Column<int>(type: "int", nullable: false),
                    ProductoId = table.Column<int>(type: "int", nullable: false),
                    Cantidad = table.Column<int>(type: "int", nullable: false),
                    PrecioUnitario = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Subtotal = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Notas = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrdenDetalles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrdenDetalles_Ordenes_OrdenId",
                        column: x => x.OrdenId,
                        principalTable: "Ordenes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrdenDetalles_Productos_ProductoId",
                        column: x => x.ProductoId,
                        principalTable: "Productos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Areas",
                columns: new[] { "Id", "Activa", "Nombre" },
                values: new object[,]
                {
                    { 1, true, "Comedor" },
                    { 2, true, "Terraza" },
                    { 3, true, "Barra" }
                });

            migrationBuilder.InsertData(
                table: "Categorias",
                columns: new[] { "Id", "Activa", "ColorHex", "Nombre", "Orden" },
                values: new object[,]
                {
                    { 1, true, "#F4A460", "Cervezas", 1 },
                    { 2, true, "#DAA520", "Tequilas", 2 },
                    { 3, true, "#DC143C", "Refrescos", 3 },
                    { 4, true, "#FF6347", "Preparados", 4 },
                    { 5, true, "#8B4513", "Ron", 5 },
                    { 6, true, "#A0522D", "Wiskys", 6 },
                    { 7, true, "#556B2F", "Mezcal", 7 },
                    { 8, true, "#4682B4", "Vodkas", 8 },
                    { 9, true, "#A52A2A", "Brandys", 9 },
                    { 10, true, "#9370DB", "Mezcladores", 10 },
                    { 11, true, "#9932CC", "Licores", 11 },
                    { 12, true, "#F4E04D", "Botanas", 12 },
                    { 13, true, "#B22222", "Clamatos", 13 },
                    { 14, true, "#708090", "Servicios", 14 },
                    { 15, true, "#696969", "Cigarros", 15 },
                    { 16, true, "#4169E1", "Cubetas", 16 },
                    { 17, true, "#778899", "Otros", 17 }
                });

            migrationBuilder.InsertData(
                table: "Usuarios",
                columns: new[] { "Id", "Activo", "Codigo", "FechaCreacion", "Nombre", "PinHash", "Rol" },
                values: new object[,]
                {
                    { 1, true, "ADMIN", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "Coronado", "$2a$11$KU/QP6s5mK4YUqWEugxt4ed7b.HtQI3SzqTYfBcYv7pz3uIFhRJCa", "Admin" },
                    { 2, true, "23", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "ABBY GZZ", "$2a$11$txNeaEMqmZmifGpvJJ2H2O9ByXgnNkTYbSZpE6lRHJNUi.xbFTwLO", "Mesera" },
                    { 3, true, "28", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "IRIS", "$2a$11$txNeaEMqmZmifGpvJJ2H2O9ByXgnNkTYbSZpE6lRHJNUi.xbFTwLO", "Mesera" },
                    { 4, true, "BAR1", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), "Barman 1", "$2a$11$mIXN5YLqK9H3eJQl2ZQi2.E2Cf9VIJBeXgqBNNeBJmO9K/oLws9Ae", "Barman" }
                });

            migrationBuilder.InsertData(
                table: "Mesas",
                columns: new[] { "Id", "Activa", "AreaId", "Capacidad", "Numero" },
                values: new object[,]
                {
                    { 1, true, 1, 4, "1" },
                    { 2, true, 1, 4, "2" },
                    { 3, true, 1, 4, "3" },
                    { 4, true, 1, 4, "4" },
                    { 5, true, 1, 4, "5" },
                    { 6, true, 1, 4, "6" },
                    { 7, true, 1, 4, "7" },
                    { 8, true, 1, 4, "8" },
                    { 9, true, 1, 4, "9" },
                    { 10, true, 1, 4, "10" },
                    { 11, true, 1, 4, "11" },
                    { 12, true, 1, 4, "12" },
                    { 13, true, 1, 4, "13" },
                    { 14, true, 1, 4, "14" },
                    { 15, true, 1, 4, "15" },
                    { 16, true, 1, 4, "16" },
                    { 17, true, 1, 4, "17" },
                    { 18, true, 1, 4, "18" },
                    { 19, true, 1, 4, "19" },
                    { 20, true, 1, 4, "20" },
                    { 21, true, 1, 4, "21" },
                    { 22, true, 1, 4, "22" },
                    { 23, true, 1, 4, "23" },
                    { 24, true, 1, 4, "24" },
                    { 25, true, 1, 4, "25" },
                    { 26, true, 1, 4, "26" },
                    { 27, true, 1, 4, "27" },
                    { 28, true, 1, 4, "28" },
                    { 29, true, 1, 4, "29" },
                    { 30, true, 1, 4, "30" },
                    { 31, true, 1, 4, "31" },
                    { 32, true, 1, 4, "32" },
                    { 33, true, 1, 4, "33" },
                    { 34, true, 1, 4, "34" },
                    { 35, true, 1, 4, "35" },
                    { 36, true, 1, 4, "36" },
                    { 37, true, 1, 4, "37" },
                    { 38, true, 1, 4, "38" },
                    { 39, true, 1, 4, "39" },
                    { 40, true, 1, 4, "40" },
                    { 41, true, 1, 4, "41" },
                    { 42, true, 1, 4, "42" },
                    { 43, true, 1, 4, "43" },
                    { 44, true, 1, 4, "44" },
                    { 45, true, 1, 4, "45" },
                    { 46, true, 1, 4, "46" },
                    { 47, true, 1, 4, "47" },
                    { 48, true, 1, 4, "48" },
                    { 49, true, 1, 4, "49" },
                    { 50, true, 1, 4, "50" }
                });

            migrationBuilder.InsertData(
                table: "Productos",
                columns: new[] { "Id", "Activo", "CantidadDescuento", "CategoriaId", "InventarioItemId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[,]
                {
                    { 1, true, 1m, 1, null, "Corona", 1, 40m, "Pieza" },
                    { 2, true, 1m, 1, null, "Tecate", 2, 40m, "Pieza" },
                    { 3, true, 1m, 1, null, "Indio", 3, 35m, "Pieza" },
                    { 4, true, 1m, 1, null, "Victoria", 4, 40m, "Pieza" },
                    { 5, true, 1m, 1, null, "Ambar Corona", 5, 45m, "Pieza" },
                    { 6, true, 1m, 1, null, "Ultra Michelob", 6, 50m, "Pieza" },
                    { 7, true, 1m, 1, null, "Carta Blanca", 7, 35m, "Pieza" },
                    { 8, true, 1m, 1, null, "Caguama", 8, 80m, "Pieza" },
                    { 9, true, 1m, 1, null, "Miller Media", 9, 45m, "Pieza" },
                    { 10, true, 1m, 1, null, "Miller Caguama", 10, 85m, "Pieza" },
                    { 11, true, 1m, 1, null, "XX Lager", 11, 40m, "Pieza" },
                    { 12, true, 1m, 1, null, "Bohemia", 12, 45m, "Pieza" },
                    { 13, true, 1m, 1, null, "Heineken", 13, 50m, "Pieza" },
                    { 14, true, 1m, 1, null, "Modelo", 14, 45m, "Pieza" },
                    { 15, true, 1m, 1, null, "Amstel Ultra", 15, 50m, "Pieza" },
                    { 16, true, 1m, 1, null, "Tecate Roja", 16, 40m, "Pieza" },
                    { 20, true, 1m, 2, null, "Cuervo Especial Shot", 1, 50m, "Shot" },
                    { 21, true, 1m, 2, null, "Cuervo Especial Botella", 2, 750m, "Botella" },
                    { 22, true, 1m, 2, null, "Centenario Reposado Shot", 3, 70m, "Shot" },
                    { 23, true, 1m, 2, null, "Centenario Reposado Botella", 4, 900m, "Botella" },
                    { 24, true, 1m, 2, null, "Hornitos Shot", 5, 65m, "Shot" },
                    { 25, true, 1m, 2, null, "Hornitos Botella", 6, 850m, "Botella" },
                    { 26, true, 1m, 2, null, "Tradicional Shot", 7, 75m, "Shot" },
                    { 27, true, 1m, 2, null, "Tradicional Botella", 8, 950m, "Botella" },
                    { 28, true, 1m, 2, null, "Don Julio 70 Shot", 9, 120m, "Shot" },
                    { 29, true, 1m, 2, null, "Don Julio 70 Botella", 10, 1500m, "Botella" },
                    { 30, true, 1m, 2, null, "Maestro Dobel Shot", 11, 110m, "Shot" },
                    { 31, true, 1m, 2, null, "Maestro Dobel Botella", 12, 1400m, "Botella" },
                    { 32, true, 1m, 2, null, "Jimador Shot", 13, 60m, "Shot" },
                    { 33, true, 1m, 2, null, "1800 Cristalino Shot", 14, 130m, "Shot" },
                    { 40, true, 1m, 3, null, "Coca", 1, 30m, "Pieza" },
                    { 41, true, 1m, 3, null, "Fresca", 2, 30m, "Pieza" },
                    { 42, true, 1m, 3, null, "Agua Mineral", 3, 30m, "Pieza" },
                    { 43, true, 1m, 3, null, "Agua Natural", 4, 25m, "Pieza" },
                    { 50, true, 1m, 5, null, "Bacardi Carta Blanca Shot", 1, 60m, "Shot" },
                    { 51, true, 1m, 5, null, "Bacardi Carta Blanca Botella", 2, 800m, "Botella" },
                    { 52, true, 1m, 5, null, "Bacardi Añejo Shot", 3, 70m, "Shot" },
                    { 53, true, 1m, 5, null, "Capitan Morgan Shot", 4, 75m, "Shot" },
                    { 54, true, 1m, 5, null, "Capitan Morgan Botella", 5, 900m, "Botella" },
                    { 55, true, 1m, 5, null, "Bacardi Solera Shot", 6, 80m, "Shot" },
                    { 56, true, 1m, 5, null, "Bacardi Solera Botella", 7, 950m, "Botella" },
                    { 57, true, 1m, 5, null, "Matusalem Botella", 8, 1100m, "Botella" },
                    { 60, true, 1m, 6, null, "Buchanans 12 Shot", 1, 130m, "Shot" },
                    { 61, true, 1m, 6, null, "Buchanans 12 Botella", 2, 1800m, "Botella" },
                    { 62, true, 1m, 6, null, "Buchanans 18 Shot", 3, 200m, "Shot" },
                    { 63, true, 1m, 6, null, "Buchanans 18 Botella", 4, 2800m, "Botella" },
                    { 64, true, 1m, 6, null, "Jack Daniels Shot", 5, 130m, "Shot" },
                    { 65, true, 1m, 6, null, "Jack Daniels Botella", 6, 1800m, "Botella" },
                    { 66, true, 1m, 6, null, "Jack Daniels Honey Shot", 7, 140m, "Shot" },
                    { 67, true, 1m, 6, null, "Black Label Shot", 8, 150m, "Shot" },
                    { 68, true, 1m, 6, null, "Black Label Botella", 9, 2100m, "Botella" },
                    { 69, true, 1m, 6, null, "Red Label Shot", 10, 110m, "Shot" },
                    { 70, true, 1m, 6, null, "Red Label Botella", 11, 1500m, "Botella" },
                    { 71, true, 1m, 6, null, "Chivas Regal Shot", 12, 130m, "Shot" },
                    { 72, true, 1m, 6, null, "Black White Shot", 13, 100m, "Shot" },
                    { 73, true, 1m, 6, null, "William Lawson Shot", 14, 90m, "Shot" },
                    { 74, true, 1m, 6, null, "Passport Shot", 15, 85m, "Shot" },
                    { 80, true, 1m, 7, null, "Cuatrocientos Conejos Shot", 1, 90m, "Shot" },
                    { 81, true, 1m, 7, null, "Cuatrocientos Conejos Botella", 2, 1100m, "Botella" },
                    { 82, true, 1m, 7, null, "Amaras Reposado Shot", 3, 100m, "Shot" },
                    { 90, true, 1m, 8, null, "Smirnoff Shot", 1, 70m, "Shot" },
                    { 91, true, 1m, 8, null, "Smirnoff Tamarindo Shot", 2, 75m, "Shot" },
                    { 92, true, 1m, 8, null, "Absolut Shot", 3, 90m, "Shot" },
                    { 93, true, 1m, 8, null, "Wiborowa Shot", 4, 70m, "Shot" },
                    { 94, true, 1m, 8, null, "Oso Negro Shot", 5, 60m, "Shot" },
                    { 100, true, 1m, 9, null, "Torres 10 Shot", 1, 80m, "Shot" },
                    { 101, true, 1m, 9, null, "Don Pedro Shot", 2, 60m, "Shot" },
                    { 102, true, 1m, 9, null, "Presidente Shot", 3, 65m, "Shot" },
                    { 110, true, 1m, 11, null, "Baileys Shot", 1, 90m, "Shot" },
                    { 111, true, 1m, 11, null, "Licor 43 Shot", 2, 90m, "Shot" },
                    { 120, true, 1m, 13, null, "Clamato Chico", 1, 60m, "Pieza" },
                    { 121, true, 1m, 13, null, "Clamato Grande", 2, 90m, "Pieza" },
                    { 122, true, 1m, 13, null, "Michelada Chica", 3, 70m, "Pieza" },
                    { 123, true, 1m, 13, null, "Michelada Grande", 4, 100m, "Pieza" },
                    { 130, true, 1m, 4, null, "Vampiro", 1, 100m, "Pieza" },
                    { 131, true, 1m, 4, null, "Paloma", 2, 90m, "Pieza" },
                    { 132, true, 1m, 4, null, "Limonada Grande", 3, 60m, "Pieza" },
                    { 133, true, 1m, 4, null, "Limonada Chica", 4, 40m, "Pieza" },
                    { 134, true, 1m, 4, null, "Sangrita Shot", 5, 35m, "Shot" },
                    { 135, true, 1m, 4, null, "Limon Concentrado Shot", 6, 25m, "Shot" },
                    { 140, true, 1m, 15, null, "Cigarro Blanco", 1, 100m, "Pieza" },
                    { 141, true, 1m, 15, null, "Cigarro Rojo", 2, 100m, "Pieza" },
                    { 150, true, 1m, 12, null, "Cacahuates", 1, 50m, "Pieza" },
                    { 151, true, 1m, 12, null, "Papas Diversas", 2, 60m, "Pieza" },
                    { 152, true, 1m, 12, null, "Pistaches", 3, 70m, "Pieza" },
                    { 153, true, 1m, 12, null, "Carne Seca", 4, 90m, "Pieza" },
                    { 154, true, 1m, 12, null, "Charales", 5, 60m, "Pieza" },
                    { 155, true, 1m, 12, null, "Camarones", 6, 120m, "Pieza" },
                    { 156, true, 1m, 12, null, "Chicharrones", 7, 70m, "Pieza" },
                    { 160, true, 1m, 14, null, "Billar Hora", 1, 100m, "Pieza" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_CortesCaja_UsuarioAperturaId",
                table: "CortesCaja",
                column: "UsuarioAperturaId");

            migrationBuilder.CreateIndex(
                name: "IX_CortesCaja_UsuarioCierreId",
                table: "CortesCaja",
                column: "UsuarioCierreId");

            migrationBuilder.CreateIndex(
                name: "IX_Cuentas_MesaId",
                table: "Cuentas",
                column: "MesaId");

            migrationBuilder.CreateIndex(
                name: "IX_Cuentas_MeseraId",
                table: "Cuentas",
                column: "MeseraId");

            migrationBuilder.CreateIndex(
                name: "IX_InventarioItems_SensorId",
                table: "InventarioItems",
                column: "SensorId");

            migrationBuilder.CreateIndex(
                name: "IX_LecturasSensor_SensorId",
                table: "LecturasSensor",
                column: "SensorId");

            migrationBuilder.CreateIndex(
                name: "IX_Mesas_AreaId",
                table: "Mesas",
                column: "AreaId");

            migrationBuilder.CreateIndex(
                name: "IX_Mesas_Numero",
                table: "Mesas",
                column: "Numero",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MovimientosInventario_InventarioItemId",
                table: "MovimientosInventario",
                column: "InventarioItemId");

            migrationBuilder.CreateIndex(
                name: "IX_MovimientosInventario_UsuarioId",
                table: "MovimientosInventario",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_OrdenDetalles_OrdenId",
                table: "OrdenDetalles",
                column: "OrdenId");

            migrationBuilder.CreateIndex(
                name: "IX_OrdenDetalles_ProductoId",
                table: "OrdenDetalles",
                column: "ProductoId");

            migrationBuilder.CreateIndex(
                name: "IX_Ordenes_CuentaId",
                table: "Ordenes",
                column: "CuentaId");

            migrationBuilder.CreateIndex(
                name: "IX_Productos_CategoriaId",
                table: "Productos",
                column: "CategoriaId");

            migrationBuilder.CreateIndex(
                name: "IX_Productos_InventarioItemId",
                table: "Productos",
                column: "InventarioItemId");

            migrationBuilder.CreateIndex(
                name: "IX_Sensores_IdHardware",
                table: "Sensores",
                column: "IdHardware",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_Codigo",
                table: "Usuarios",
                column: "Codigo",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CortesCaja");

            migrationBuilder.DropTable(
                name: "LecturasSensor");

            migrationBuilder.DropTable(
                name: "MovimientosInventario");

            migrationBuilder.DropTable(
                name: "OrdenDetalles");

            migrationBuilder.DropTable(
                name: "Ordenes");

            migrationBuilder.DropTable(
                name: "Productos");

            migrationBuilder.DropTable(
                name: "Cuentas");

            migrationBuilder.DropTable(
                name: "Categorias");

            migrationBuilder.DropTable(
                name: "InventarioItems");

            migrationBuilder.DropTable(
                name: "Mesas");

            migrationBuilder.DropTable(
                name: "Usuarios");

            migrationBuilder.DropTable(
                name: "Sensores");

            migrationBuilder.DropTable(
                name: "Areas");
        }
    }
}
