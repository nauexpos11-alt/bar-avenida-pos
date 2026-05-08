using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarAvenida.API.Migrations
{
    /// <inheritdoc />
    public partial class CobroImpresionCajon : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TotalTransferencia",
                table: "CortesCaja");

            migrationBuilder.AddColumn<decimal>(
                name: "Cambio",
                table: "Cuentas",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ComisionTarjeta",
                table: "Cuentas",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "FechaImpresion",
                table: "Cuentas",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MontoEfectivo",
                table: "Cuentas",
                type: "decimal(10,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MontoTarjeta",
                table: "Cuentas",
                type: "decimal(10,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RazonSocialCliente",
                table: "Cuentas",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RfcCliente",
                table: "Cuentas",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "TicketImpreso",
                table: "Cuentas",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "ConfiguracionesTicket",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NombreNegocio = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Direccion = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Telefono = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Rfc = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    MensajePie = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    TipoConexion = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NombreImpresoraUsb = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    IpImpresora = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    PuertoImpresora = table.Column<int>(type: "int", nullable: false),
                    AbrirCajonAlCobrar = table.Column<bool>(type: "bit", nullable: false),
                    ImpresionHabilitada = table.Column<bool>(type: "bit", nullable: false),
                    AnchoTicket = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConfiguracionesTicket", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RegistrosAperturaCajon",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UsuarioId = table.Column<int>(type: "int", nullable: false),
                    Fecha = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Motivo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CuentaId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RegistrosAperturaCajon", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RegistrosAperturaCajon_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id");
                });

            migrationBuilder.InsertData(
                table: "ConfiguracionesTicket",
                columns: new[] { "Id", "AbrirCajonAlCobrar", "AnchoTicket", "Direccion", "ImpresionHabilitada", "IpImpresora", "MensajePie", "NombreImpresoraUsb", "NombreNegocio", "PuertoImpresora", "Rfc", "Telefono", "TipoConexion" },
                values: new object[] { 1, true, 32, null, false, null, "Gracias por su visita", null, "BAR AVENIDA", 9100, null, null, "USB" });

            migrationBuilder.CreateIndex(
                name: "IX_RegistrosAperturaCajon_UsuarioId",
                table: "RegistrosAperturaCajon",
                column: "UsuarioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConfiguracionesTicket");

            migrationBuilder.DropTable(
                name: "RegistrosAperturaCajon");

            migrationBuilder.DropColumn(
                name: "Cambio",
                table: "Cuentas");

            migrationBuilder.DropColumn(
                name: "ComisionTarjeta",
                table: "Cuentas");

            migrationBuilder.DropColumn(
                name: "FechaImpresion",
                table: "Cuentas");

            migrationBuilder.DropColumn(
                name: "MontoEfectivo",
                table: "Cuentas");

            migrationBuilder.DropColumn(
                name: "MontoTarjeta",
                table: "Cuentas");

            migrationBuilder.DropColumn(
                name: "RazonSocialCliente",
                table: "Cuentas");

            migrationBuilder.DropColumn(
                name: "RfcCliente",
                table: "Cuentas");

            migrationBuilder.DropColumn(
                name: "TicketImpreso",
                table: "Cuentas");

            migrationBuilder.AddColumn<decimal>(
                name: "TotalTransferencia",
                table: "CortesCaja",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);
        }
    }
}
