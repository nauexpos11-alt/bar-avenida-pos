using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace BarAvenida.API.Migrations
{
    /// <inheritdoc />
    public partial class CatalogosYSeguridad : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FormasPago",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nombre = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Codigo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ComisionPorcentaje = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    ActivaParaCobro = table.Column<bool>(type: "bit", nullable: false),
                    Orden = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FormasPago", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SecuenciasFolio",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UltimoFolio = table.Column<int>(type: "int", nullable: false),
                    PrefijoFolio = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    LongitudMinima = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SecuenciasFolio", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "FormasPago",
                columns: new[] { "Id", "ActivaParaCobro", "Codigo", "ComisionPorcentaje", "Nombre", "Orden" },
                values: new object[,]
                {
                    { 1, true, "EFE", 0m, "Efectivo", 1 },
                    { 2, true, "TAR", 5m, "Tarjeta", 2 },
                    { 3, true, "MIX", 0m, "Pago mixto", 3 }
                });

            migrationBuilder.InsertData(
                table: "SecuenciasFolio",
                columns: new[] { "Id", "LongitudMinima", "PrefijoFolio", "UltimoFolio" },
                values: new object[] { 1, 4, "", 0 });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FormasPago");

            migrationBuilder.DropTable(
                name: "SecuenciasFolio");
        }
    }
}
