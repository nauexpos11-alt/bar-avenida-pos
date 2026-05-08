using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace BarAvenida.API.Migrations
{
    /// <inheritdoc />
    public partial class ProductosReales : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 150);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 151);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 152);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 153);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 154);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 155);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 156);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 160);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 2,
                column: "Precio",
                value: 35m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 6,
                column: "Precio",
                value: 45m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 7,
                column: "Precio",
                value: 45m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 8,
                column: "Precio",
                value: 45m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 9,
                column: "Precio",
                value: 85m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 10,
                column: "Precio",
                value: 47m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 11,
                column: "Precio",
                value: 45m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 13,
                column: "Precio",
                value: 45m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 14,
                column: "Precio",
                value: 42m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 15,
                column: "Precio",
                value: 45m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 16,
                column: "Precio",
                value: 35m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 20,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Codorniz Shot", 4, 55m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 21,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Cuervo Especial Shot", 5, 65m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 22,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Maestro Dobel Shot", 6, 100m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 23,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Don Julio 70 Shot", 7, 150m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 24,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Don Julio Rep y Bco Shot", 8, 100m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 25,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Jimador Shot", 9, 55m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 26,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "1800 Cristalino Shot", 10, 100m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 27,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "1800 Añe Rep Bco Shot", 11, 75m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 28,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "1800 Botella Rep Bco", 12, 850m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 29,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Centenario Botella", 13, 850m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 30,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Codorniz Botella", 14, 750m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 31,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Cuervo Especial Botella", 15, 800m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 32,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Don Julio 70 Botella", 16, 1800m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 33,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Don Julio Rep y Bco Botella", 17, 1200m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 40,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Fresca", 2, 35m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 41,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Agua Mineral", 3, 35m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 42,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Agua Natural", 4, 35m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 43,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 4, "Sangrita Shot", 1, 10m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 50,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 4, "Limonada Chica", 8, 35m, "Pieza" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 51,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 4, "Shot Petroleo", 9, 15m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 52,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 4, "Perla Negra", 10, 135m, "Pieza" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 53,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Bacardi Carta Blanca Shot", 1, 65m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 54,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Bacardi Añejo Shot", 2, 65m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 55,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Capitan Morgan Shot", 3, 65m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 56,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Bacardi Solera Shot", 4, 65m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 57,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Matusalem Shot", 5, 65m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 60,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 5, "Bacardi Solera Botella", 8, 800m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 61,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio" },
                values: new object[] { 5, "Capitan Morgan Botella", 9, 850m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 62,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 5, "Matusalem Botella", 10, 850m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 63,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Black Label Shot", 1, 100m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 64,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Red Label Shot", 2, 75m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 65,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Black White Shot", 3, 70m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 66,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Buchanans 12 Shot", 4, 100m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 67,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Buchanans 18 Shot", 5, 170m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 68,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Chivas Regal Shot", 6, 100m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 69,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Jack Daniels Shot", 7, 85m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 70,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Jack Daniels Honey Shot", 8, 85m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 71,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Passport Shot", 9, 55m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 72,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "William Lawson Shot", 10, 55m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 73,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Black Label Botella", 11, 1700m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 74,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Red Label Botella", 12, 850m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 80,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 6, "Jack Daniels Honey Botella", 18, 850m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 81,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio" },
                values: new object[] { 6, "Passport Botella", 19, 600m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 82,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 6, "William Lawson Botella", 20, 600m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 90,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Oso Negro Shot", 4, 65m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 91,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Absolut Botella", 5, 750m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 92,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Oso Negro Botella", 6, 650m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 93,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Smirnoff Botella", 7, 750m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 94,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Wiborowa Botella", 8, 750m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 100,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Don Pedro Botella", 6, 700m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 101,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 10, "Boost Chico", 1, 45m, "Pieza" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 102,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 10, "Boost Grande", 2, 80m, "Pieza" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 110,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 12, "Carne Seca", 3, 48m, "Pieza" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 111,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 12, "Cacahuates", 4, 35m, "Pieza" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 120,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Clamato Grande", 2, 85m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 121,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Michelada Chica", 3, 25m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 122,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Michelada Grande", 4, 40m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 123,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Vaso Chelado Limon y Sal", 5, 10m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 130,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio" },
                values: new object[] { 15, "Marlboro Blanco", 2, 13m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 131,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio" },
                values: new object[] { 15, "Caja Marlboro Bco", 3, 130m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 132,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio" },
                values: new object[] { 15, "Caja Marlboro Rojo", 4, 130m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 133,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio" },
                values: new object[] { 16, "Cubeta Corona", 1, 400m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 134,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 16, "Cubeta Tecate", 2, 350m, "Pieza" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 135,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 16, "Cubeta Indio", 3, 350m, "Pieza" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 140,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio" },
                values: new object[] { 16, "Cubeta Miller", 8, 470m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 141,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio" },
                values: new object[] { 16, "Cubeta Ultra Michelob", 9, 450m });

            migrationBuilder.InsertData(
                table: "Productos",
                columns: new[] { "Id", "Activo", "CantidadDescuento", "CategoriaId", "InventarioItemId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[,]
                {
                    { 17, true, 1m, 2, null, "Centenario Shot", 1, 65m, "Shot" },
                    { 18, true, 1m, 2, null, "Tradicional Shot", 2, 65m, "Shot" },
                    { 19, true, 1m, 2, null, "Hornitos Shot", 3, 65m, "Shot" },
                    { 34, true, 1m, 2, null, "Hornitos Botella", 18, 800m, "Botella" },
                    { 35, true, 1m, 2, null, "Jimador Botella", 19, 750m, "Botella" },
                    { 36, true, 1m, 2, null, "Maestro Dobel Botella", 20, 1700m, "Botella" },
                    { 37, true, 1m, 2, null, "Tradicional Botella", 21, 800m, "Botella" },
                    { 38, true, 1m, 2, null, "1800 Cristalino Botella", 22, 1700m, "Botella" },
                    { 39, true, 1m, 3, null, "Coca", 1, 35m, "Pieza" },
                    { 44, true, 1m, 4, null, "Limon Concentrado Shot", 2, 10m, "Shot" },
                    { 45, true, 1m, 4, null, "Jarabe Nat Grana Shot", 3, 15m, "Shot" },
                    { 46, true, 1m, 4, null, "Preparado Vampiro", 4, 35m, "Pieza" },
                    { 47, true, 1m, 4, null, "Preparado Paloma", 5, 20m, "Pieza" },
                    { 48, true, 1m, 4, null, "Vaso Chelado Sal y Limon", 6, 10m, "Pieza" },
                    { 49, true, 1m, 4, null, "Limonada Grande", 7, 70m, "Pieza" },
                    { 58, true, 1m, 5, null, "Bacardi Añejo Botella", 6, 650m, "Botella" },
                    { 59, true, 1m, 5, null, "Bacardi Carta Blanca Botella", 7, 750m, "Botella" },
                    { 75, true, 1m, 6, null, "Black White Botella", 13, 800m, "Botella" },
                    { 76, true, 1m, 6, null, "Buchanans 12 Botella", 14, 1700m, "Botella" },
                    { 77, true, 1m, 6, null, "Buchanans 18 Botella", 15, 2800m, "Botella" },
                    { 78, true, 1m, 6, null, "Chivas Regal Botella", 16, 1700m, "Botella" },
                    { 79, true, 1m, 6, null, "Jack Daniels Botella", 17, 850m, "Botella" },
                    { 83, true, 1m, 7, null, "400 Conejos Shot", 1, 75m, "Shot" },
                    { 84, true, 1m, 7, null, "Amaras Shot", 2, 85m, "Shot" },
                    { 85, true, 1m, 7, null, "400 Conejos Botella", 3, 900m, "Botella" },
                    { 86, true, 1m, 7, null, "Amaras Botella", 4, 1000m, "Botella" },
                    { 87, true, 1m, 8, null, "Absolut Shot", 1, 65m, "Shot" },
                    { 88, true, 1m, 8, null, "Wiborowa Shot", 2, 55m, "Shot" },
                    { 89, true, 1m, 8, null, "Smirnoff Shot", 3, 65m, "Shot" },
                    { 95, true, 1m, 9, null, "Torres 10 Shot", 1, 75m, "Shot" },
                    { 96, true, 1m, 9, null, "Presidente Shot", 2, 50m, "Shot" },
                    { 97, true, 1m, 9, null, "Don Pedro Shot", 3, 50m, "Shot" },
                    { 98, true, 1m, 9, null, "Torres 10 Botella", 4, 750m, "Botella" },
                    { 99, true, 1m, 9, null, "Presidente Botella", 5, 700m, "Botella" },
                    { 103, true, 1m, 10, null, "Red Bull", 3, 45m, "Pieza" },
                    { 104, true, 1m, 11, null, "Baileys Shot", 1, 70m, "Shot" },
                    { 105, true, 1m, 11, null, "Licor 43 Shot", 2, 75m, "Shot" },
                    { 106, true, 1m, 11, null, "Baileys Botella", 3, 800m, "Botella" },
                    { 107, true, 1m, 11, null, "Licor 43 Botella", 4, 750m, "Botella" },
                    { 108, true, 1m, 12, null, "Papas Diversas", 1, 35m, "Pieza" },
                    { 109, true, 1m, 12, null, "Pistaches", 2, 38m, "Pieza" },
                    { 112, true, 1m, 12, null, "Camarones", 5, 35m, "Pieza" },
                    { 113, true, 1m, 12, null, "Charales", 6, 35m, "Pieza" },
                    { 114, true, 1m, 12, null, "Fritos Diversos", 7, 35m, "Pieza" },
                    { 115, true, 1m, 12, null, "Chicharrones", 8, 35m, "Pieza" },
                    { 116, true, 1m, 12, null, "Carne Seca Chihuahua", 9, 50m, "Pieza" },
                    { 117, true, 1m, 12, null, "Takis", 10, 35m, "Pieza" },
                    { 118, true, 1m, 12, null, "Chips", 11, 35m, "Pieza" },
                    { 119, true, 1m, 13, null, "Clamato Chico", 1, 45m, "Pieza" },
                    { 124, true, 1m, 13, null, "Clamato Frasco", 6, 35m, "Pieza" },
                    { 125, true, 1m, 13, null, "Escarchado Sencillo", 7, 5m, "Pieza" },
                    { 126, true, 1m, 13, null, "Escarchado con Limon", 8, 10m, "Pieza" },
                    { 127, true, 1m, 14, null, "Moneda", 1, 10m, "Pieza" },
                    { 128, true, 1m, 14, null, "Salida de Dinero", 2, 1m, "Pieza" },
                    { 129, true, 1m, 15, null, "Marlboro Rojo", 1, 13m, "Pieza" },
                    { 136, true, 1m, 16, null, "Cubeta Victoria", 4, 400m, "Pieza" },
                    { 137, true, 1m, 16, null, "Cubeta XX", 5, 450m, "Pieza" },
                    { 138, true, 1m, 16, null, "Cubeta Carta Blanca", 6, 450m, "Pieza" },
                    { 139, true, 1m, 16, null, "Cubeta Bohemia", 7, 450m, "Pieza" },
                    { 142, true, 1m, 16, null, "Cubeta Ambar Corona", 10, 450m, "Pieza" },
                    { 143, true, 1m, 16, null, "Cubeta Heineken", 11, 450m, "Pieza" },
                    { 144, true, 1m, 16, null, "Cubeta Modelo", 12, 450m, "Pieza" },
                    { 145, true, 1m, 16, null, "Cubeta Amstel Ultra", 13, 450m, "Pieza" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 18);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 19);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 34);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 35);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 36);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 37);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 38);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 39);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 44);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 45);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 46);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 47);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 48);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 49);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 58);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 59);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 75);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 76);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 77);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 78);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 79);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 83);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 84);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 85);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 86);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 87);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 88);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 89);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 95);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 96);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 97);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 98);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 99);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 103);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 104);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 105);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 106);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 107);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 108);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 109);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 112);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 113);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 114);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 115);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 116);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 117);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 118);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 119);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 124);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 125);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 126);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 127);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 128);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 129);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 136);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 137);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 138);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 139);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 142);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 143);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 144);

            migrationBuilder.DeleteData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 145);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 2,
                column: "Precio",
                value: 40m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 6,
                column: "Precio",
                value: 50m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 7,
                column: "Precio",
                value: 35m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 8,
                column: "Precio",
                value: 80m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 9,
                column: "Precio",
                value: 45m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 10,
                column: "Precio",
                value: 85m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 11,
                column: "Precio",
                value: 40m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 13,
                column: "Precio",
                value: 50m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 14,
                column: "Precio",
                value: 45m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 15,
                column: "Precio",
                value: 50m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 16,
                column: "Precio",
                value: 40m);

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 20,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Cuervo Especial Shot", 1, 50m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 21,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Cuervo Especial Botella", 2, 750m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 22,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Centenario Reposado Shot", 3, 70m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 23,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Centenario Reposado Botella", 4, 900m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 24,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Hornitos Shot", 5, 65m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 25,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Hornitos Botella", 6, 850m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 26,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Tradicional Shot", 7, 75m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 27,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Tradicional Botella", 8, 950m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 28,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Don Julio 70 Shot", 9, 120m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 29,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Don Julio 70 Botella", 10, 1500m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 30,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Maestro Dobel Shot", 11, 110m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 31,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Maestro Dobel Botella", 12, 1400m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 32,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Jimador Shot", 13, 60m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 33,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "1800 Cristalino Shot", 14, 130m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 40,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Coca", 1, 30m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 41,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Fresca", 2, 30m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 42,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Agua Mineral", 3, 30m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 43,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 3, "Agua Natural", 4, 25m, "Pieza" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 50,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 5, "Bacardi Carta Blanca Shot", 1, 60m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 51,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 5, "Bacardi Carta Blanca Botella", 2, 800m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 52,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 5, "Bacardi Añejo Shot", 3, 70m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 53,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Capitan Morgan Shot", 4, 75m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 54,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Capitan Morgan Botella", 5, 900m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 55,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Bacardi Solera Shot", 6, 80m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 56,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Bacardi Solera Botella", 7, 950m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 57,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Matusalem Botella", 8, 1100m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 60,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 6, "Buchanans 12 Shot", 1, 130m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 61,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio" },
                values: new object[] { 6, "Buchanans 12 Botella", 2, 1800m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 62,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 6, "Buchanans 18 Shot", 3, 200m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 63,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Buchanans 18 Botella", 4, 2800m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 64,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Jack Daniels Shot", 5, 130m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 65,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Jack Daniels Botella", 6, 1800m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 66,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Jack Daniels Honey Shot", 7, 140m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 67,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Black Label Shot", 8, 150m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 68,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Black Label Botella", 9, 2100m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 69,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Red Label Shot", 10, 110m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 70,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Red Label Botella", 11, 1500m, "Botella" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 71,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Chivas Regal Shot", 12, 130m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 72,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Black White Shot", 13, 100m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 73,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "William Lawson Shot", 14, 90m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 74,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Passport Shot", 15, 85m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 80,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 7, "Cuatrocientos Conejos Shot", 1, 90m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 81,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio" },
                values: new object[] { 7, "Cuatrocientos Conejos Botella", 2, 1100m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 82,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 7, "Amaras Reposado Shot", 3, 100m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 90,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Smirnoff Shot", 1, 70m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 91,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Smirnoff Tamarindo Shot", 2, 75m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 92,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Absolut Shot", 3, 90m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 93,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Wiborowa Shot", 4, 70m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 94,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Oso Negro Shot", 5, 60m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 100,
                columns: new[] { "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { "Torres 10 Shot", 1, 80m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 101,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 9, "Don Pedro Shot", 2, 60m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 102,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 9, "Presidente Shot", 3, 65m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 110,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 11, "Baileys Shot", 1, 90m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 111,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 11, "Licor 43 Shot", 2, 90m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 120,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Clamato Chico", 1, 60m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 121,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Clamato Grande", 2, 90m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 122,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Michelada Chica", 3, 70m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 123,
                columns: new[] { "Nombre", "Orden", "Precio" },
                values: new object[] { "Michelada Grande", 4, 100m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 130,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio" },
                values: new object[] { 4, "Vampiro", 1, 100m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 131,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio" },
                values: new object[] { 4, "Paloma", 2, 90m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 132,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio" },
                values: new object[] { 4, "Limonada Grande", 3, 60m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 133,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio" },
                values: new object[] { 4, "Limonada Chica", 4, 40m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 134,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 4, "Sangrita Shot", 5, 35m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 135,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[] { 4, "Limon Concentrado Shot", 6, 25m, "Shot" });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 140,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio" },
                values: new object[] { 15, "Cigarro Blanco", 1, 100m });

            migrationBuilder.UpdateData(
                table: "Productos",
                keyColumn: "Id",
                keyValue: 141,
                columns: new[] { "CategoriaId", "Nombre", "Orden", "Precio" },
                values: new object[] { 15, "Cigarro Rojo", 2, 100m });

            migrationBuilder.InsertData(
                table: "Productos",
                columns: new[] { "Id", "Activo", "CantidadDescuento", "CategoriaId", "InventarioItemId", "Nombre", "Orden", "Precio", "TipoVenta" },
                values: new object[,]
                {
                    { 150, true, 1m, 12, null, "Cacahuates", 1, 50m, "Pieza" },
                    { 151, true, 1m, 12, null, "Papas Diversas", 2, 60m, "Pieza" },
                    { 152, true, 1m, 12, null, "Pistaches", 3, 70m, "Pieza" },
                    { 153, true, 1m, 12, null, "Carne Seca", 4, 90m, "Pieza" },
                    { 154, true, 1m, 12, null, "Charales", 5, 60m, "Pieza" },
                    { 155, true, 1m, 12, null, "Camarones", 6, 120m, "Pieza" },
                    { 156, true, 1m, 12, null, "Chicharrones", 7, 70m, "Pieza" },
                    { 160, true, 1m, 14, null, "Billar Hora", 1, 100m, "Pieza" }
                });
        }
    }
}
