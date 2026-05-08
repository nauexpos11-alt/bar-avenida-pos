using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarAvenida.API.Migrations
{
    /// <inheritdoc />
    public partial class ReglasCrossSell : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ReglasCrossSell",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProductoOrigenId = table.Column<int>(type: "int", nullable: false),
                    ProductoSugeridoId = table.Column<int>(type: "int", nullable: false),
                    Prioridad = table.Column<int>(type: "int", nullable: false),
                    Activo = table.Column<bool>(type: "bit", nullable: false),
                    FechaCreacion = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReglasCrossSell", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReglasCrossSell_Productos_ProductoOrigenId",
                        column: x => x.ProductoOrigenId,
                        principalTable: "Productos",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ReglasCrossSell_Productos_ProductoSugeridoId",
                        column: x => x.ProductoSugeridoId,
                        principalTable: "Productos",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReglasCrossSell_ProductoOrigenId_ProductoSugeridoId",
                table: "ReglasCrossSell",
                columns: new[] { "ProductoOrigenId", "ProductoSugeridoId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReglasCrossSell_ProductoSugeridoId",
                table: "ReglasCrossSell",
                column: "ProductoSugeridoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReglasCrossSell");
        }
    }
}
