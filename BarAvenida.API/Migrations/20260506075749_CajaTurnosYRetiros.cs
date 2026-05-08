using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarAvenida.API.Migrations
{
    /// <inheritdoc />
    public partial class CajaTurnosYRetiros : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "EfectivoEnCaja",
                table: "CortesCaja",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Tipo",
                table: "CortesCaja",
                type: "nvarchar(1)",
                maxLength: 1,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "TotalComision",
                table: "CortesCaja",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalRetiros",
                table: "CortesCaja",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "TurnoId",
                table: "CortesCaja",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CajaTurnos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FechaApertura = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FechaCierre = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UsuarioAperturaId = table.Column<int>(type: "int", nullable: false),
                    UsuarioCierreId = table.Column<int>(type: "int", nullable: true),
                    MontoInicial = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    MontoFinal = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    Estado = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Notas = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CajaTurnos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CajaTurnos_Usuarios_UsuarioAperturaId",
                        column: x => x.UsuarioAperturaId,
                        principalTable: "Usuarios",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CajaTurnos_Usuarios_UsuarioCierreId",
                        column: x => x.UsuarioCierreId,
                        principalTable: "Usuarios",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RetirosCaja",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TurnoId = table.Column<int>(type: "int", nullable: false),
                    UsuarioId = table.Column<int>(type: "int", nullable: false),
                    Fecha = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Monto = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Concepto = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RetirosCaja", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RetirosCaja_CajaTurnos_TurnoId",
                        column: x => x.TurnoId,
                        principalTable: "CajaTurnos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RetirosCaja_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_CortesCaja_TurnoId",
                table: "CortesCaja",
                column: "TurnoId");

            migrationBuilder.CreateIndex(
                name: "IX_CajaTurnos_UsuarioAperturaId",
                table: "CajaTurnos",
                column: "UsuarioAperturaId");

            migrationBuilder.CreateIndex(
                name: "IX_CajaTurnos_UsuarioCierreId",
                table: "CajaTurnos",
                column: "UsuarioCierreId");

            migrationBuilder.CreateIndex(
                name: "IX_RetirosCaja_TurnoId",
                table: "RetirosCaja",
                column: "TurnoId");

            migrationBuilder.CreateIndex(
                name: "IX_RetirosCaja_UsuarioId",
                table: "RetirosCaja",
                column: "UsuarioId");

            migrationBuilder.AddForeignKey(
                name: "FK_CortesCaja_CajaTurnos_TurnoId",
                table: "CortesCaja",
                column: "TurnoId",
                principalTable: "CajaTurnos",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CortesCaja_CajaTurnos_TurnoId",
                table: "CortesCaja");

            migrationBuilder.DropTable(
                name: "RetirosCaja");

            migrationBuilder.DropTable(
                name: "CajaTurnos");

            migrationBuilder.DropIndex(
                name: "IX_CortesCaja_TurnoId",
                table: "CortesCaja");

            migrationBuilder.DropColumn(
                name: "EfectivoEnCaja",
                table: "CortesCaja");

            migrationBuilder.DropColumn(
                name: "Tipo",
                table: "CortesCaja");

            migrationBuilder.DropColumn(
                name: "TotalComision",
                table: "CortesCaja");

            migrationBuilder.DropColumn(
                name: "TotalRetiros",
                table: "CortesCaja");

            migrationBuilder.DropColumn(
                name: "TurnoId",
                table: "CortesCaja");
        }
    }
}
