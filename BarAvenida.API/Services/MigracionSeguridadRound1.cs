using BarAvenida.API.Data;
using Microsoft.EntityFrameworkCore;

namespace BarAvenida.API.Services;

/// <summary>
/// Aplica el esquema de seguridad v1.9.0 (Round 1) via SQL raw,
/// si las columnas/tablas aún no existen. Idempotente.
///
/// Se ejecuta UNA VEZ al arrancar, después de Database.Migrate().
///
/// NOTA: Esto evita reescribir el ModelSnapshot de EF. Si en el futuro
/// se quiere migración formal, generar con:
///     dotnet ef migrations add SeguridadRound1
/// y borrar este servicio.
/// </summary>
public static class MigracionSeguridadRound1
{
    public static async Task AplicarAsync(BarAvenidaDbContext db, ILogger? log = null)
    {
        // ── 1. Columnas nuevas en Usuarios ────────────────────────────────
        await db.Database.ExecuteSqlRawAsync(@"
IF COL_LENGTH('Usuarios', 'IntentosFallidos') IS NULL
    ALTER TABLE Usuarios ADD IntentosFallidos int NOT NULL CONSTRAINT DF_Usuarios_IntentosFallidos DEFAULT 0;

IF COL_LENGTH('Usuarios', 'BloqueadoHasta') IS NULL
    ALTER TABLE Usuarios ADD BloqueadoHasta datetime2 NULL;

IF COL_LENGTH('Usuarios', 'UltimoLoginExitoso') IS NULL
    ALTER TABLE Usuarios ADD UltimoLoginExitoso datetime2 NULL;

IF COL_LENGTH('Usuarios', 'UltimoIntentoFallido') IS NULL
    ALTER TABLE Usuarios ADD UltimoIntentoFallido datetime2 NULL;
");

        // ── 2. Tabla EventosAuditoria ─────────────────────────────────────
        await db.Database.ExecuteSqlRawAsync(@"
IF OBJECT_ID(N'EventosAuditoria', N'U') IS NULL
BEGIN
    CREATE TABLE EventosAuditoria (
        Id              int IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Fecha           datetime2 NOT NULL,
        Categoria       nvarchar(40) NOT NULL,
        Tipo            nvarchar(60) NOT NULL,
        UsuarioId       int NULL,
        UsuarioNombre   nvarchar(80) NOT NULL DEFAULT '',
        Descripcion     nvarchar(500) NOT NULL,
        IpOrigen        nvarchar(64) NULL,
        Detalles        nvarchar(max) NULL
    );

    CREATE INDEX IX_EventosAuditoria_Fecha       ON EventosAuditoria (Fecha DESC);
    CREATE INDEX IX_EventosAuditoria_Categoria   ON EventosAuditoria (Categoria);
    CREATE INDEX IX_EventosAuditoria_Tipo        ON EventosAuditoria (Tipo);
    CREATE INDEX IX_EventosAuditoria_UsuarioId   ON EventosAuditoria (UsuarioId);
END
");

        log?.LogInformation("Seguridad v1.9.0 (Round 1) — esquema aplicado / verificado");
    }
}
