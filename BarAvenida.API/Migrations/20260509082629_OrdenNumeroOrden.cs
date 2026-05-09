using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BarAvenida.API.Migrations
{
    /// <inheritdoc />
    public partial class OrdenNumeroOrden : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "NumeroOrden",
                table: "Ordenes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            // Backfill: numerar órdenes históricas por cuenta
            migrationBuilder.Sql(@"
                WITH ordenadas AS (
                    SELECT Id,
                           ROW_NUMBER() OVER (PARTITION BY CuentaId ORDER BY FechaEnvio, Id) AS num
                    FROM Ordenes
                )
                UPDATE Ordenes
                SET NumeroOrden = ordenadas.num
                FROM Ordenes
                INNER JOIN ordenadas ON Ordenes.Id = ordenadas.Id;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NumeroOrden",
                table: "Ordenes");
        }
    }
}
