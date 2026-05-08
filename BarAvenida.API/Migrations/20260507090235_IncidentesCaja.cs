using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarAvenida.API.Migrations
{
    /// <inheritdoc />
    public partial class IncidentesCaja : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "IncidentesCaja",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TurnoId = table.Column<int>(type: "int", nullable: false),
                    CorteId = table.Column<int>(type: "int", nullable: true),
                    Tipo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Severidad = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Diferencia = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    EfectivoEsperado = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    EfectivoContado = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Justificacion = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    AutorizadoPorId = table.Column<int>(type: "int", nullable: true),
                    FechaRegistro = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IncidentesCaja", x => x.Id);
                    table.ForeignKey(
                        name: "FK_IncidentesCaja_CajaTurnos_TurnoId",
                        column: x => x.TurnoId,
                        principalTable: "CajaTurnos",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_IncidentesCaja_CortesCaja_CorteId",
                        column: x => x.CorteId,
                        principalTable: "CortesCaja",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_IncidentesCaja_Usuarios_AutorizadoPorId",
                        column: x => x.AutorizadoPorId,
                        principalTable: "Usuarios",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_IncidentesCaja_AutorizadoPorId",
                table: "IncidentesCaja",
                column: "AutorizadoPorId");

            migrationBuilder.CreateIndex(
                name: "IX_IncidentesCaja_CorteId",
                table: "IncidentesCaja",
                column: "CorteId");

            migrationBuilder.CreateIndex(
                name: "IX_IncidentesCaja_TurnoId",
                table: "IncidentesCaja",
                column: "TurnoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IncidentesCaja");
        }
    }
}
