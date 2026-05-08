using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarAvenida.API.Migrations
{
    /// <inheritdoc />
    public partial class CancelacionCuenta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "FechaCancelacion",
                table: "Cuentas",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MotivoCancelacion",
                table: "Cuentas",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UsuarioCancelacionId",
                table: "Cuentas",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Cuentas_UsuarioCancelacionId",
                table: "Cuentas",
                column: "UsuarioCancelacionId");

            migrationBuilder.AddForeignKey(
                name: "FK_Cuentas_Usuarios_UsuarioCancelacionId",
                table: "Cuentas",
                column: "UsuarioCancelacionId",
                principalTable: "Usuarios",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Cuentas_Usuarios_UsuarioCancelacionId",
                table: "Cuentas");

            migrationBuilder.DropIndex(
                name: "IX_Cuentas_UsuarioCancelacionId",
                table: "Cuentas");

            migrationBuilder.DropColumn(
                name: "FechaCancelacion",
                table: "Cuentas");

            migrationBuilder.DropColumn(
                name: "MotivoCancelacion",
                table: "Cuentas");

            migrationBuilder.DropColumn(
                name: "UsuarioCancelacionId",
                table: "Cuentas");
        }
    }
}
