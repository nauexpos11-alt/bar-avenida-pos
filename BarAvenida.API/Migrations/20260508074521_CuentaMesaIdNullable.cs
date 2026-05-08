using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarAvenida.API.Migrations
{
    /// <inheritdoc />
    public partial class CuentaMesaIdNullable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Cuentas_Mesas_MesaId",
                table: "Cuentas");

            migrationBuilder.AlterColumn<int>(
                name: "MesaId",
                table: "SolicitudesCancelacion",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<int>(
                name: "MesaId",
                table: "Cuentas",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddForeignKey(
                name: "FK_Cuentas_Mesas_MesaId",
                table: "Cuentas",
                column: "MesaId",
                principalTable: "Mesas",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Cuentas_Mesas_MesaId",
                table: "Cuentas");

            migrationBuilder.AlterColumn<int>(
                name: "MesaId",
                table: "SolicitudesCancelacion",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "MesaId",
                table: "Cuentas",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Cuentas_Mesas_MesaId",
                table: "Cuentas",
                column: "MesaId",
                principalTable: "Mesas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
