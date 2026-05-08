using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarAvenida.API.Migrations
{
    /// <inheritdoc />
    public partial class AgregarAreaACuenta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Area",
                table: "Cuentas",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Area",
                table: "Cuentas");
        }
    }
}
