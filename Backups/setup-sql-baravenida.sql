-- ============================================================================
-- Bar Avenida - Setup SQL Server preventivo (corre ANTES del primer arranque)
-- ----------------------------------------------------------------------------
-- El servicio Windows BarAvenidaAPI corre como NT AUTHORITY\SYSTEM.
-- Este script garantiza que SYSTEM tenga todo lo necesario para:
--   1. Crear la BD BarAvenida (si no existe) cuando arranca el backend
--   2. Aplicar migraciones EF
--   3. Leer/escribir libremente
--
-- Idempotente: corre tantas veces como quieras, sin romper nada.
--
-- Uso (lo invoca el instalador automaticamente):
--   sqlcmd -S "localhost\MSSQLSERVER01" -E -i setup-sql-baravenida.sql -b
-- ============================================================================

USE master;
GO

-- 1. Crear el login SYSTEM si no existe
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'NT AUTHORITY\SYSTEM')
BEGIN
    CREATE LOGIN [NT AUTHORITY\SYSTEM] FROM WINDOWS;
    PRINT '[OK] Login NT AUTHORITY\SYSTEM creado.';
END
ELSE
BEGIN
    PRINT '[INFO] Login NT AUTHORITY\SYSTEM ya existia.';
END
GO

-- 2. Permisos a nivel servidor: que pueda crear BD + manejar permisos
GRANT CONNECT SQL TO [NT AUTHORITY\SYSTEM];
ALTER SERVER ROLE [dbcreator]     ADD MEMBER [NT AUTHORITY\SYSTEM];
ALTER SERVER ROLE [securityadmin] ADD MEMBER [NT AUTHORITY\SYSTEM];
PRINT '[OK] SYSTEM tiene dbcreator + securityadmin a nivel servidor.';
GO

-- 3. Si la BD BarAvenida YA existe (segunda corrida, update), darle db_owner
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = N'BarAvenida')
BEGIN
    USE BarAvenida;

    IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'NT AUTHORITY\SYSTEM')
    BEGIN
        CREATE USER [NT AUTHORITY\SYSTEM] FOR LOGIN [NT AUTHORITY\SYSTEM];
        PRINT '[OK] Usuario SYSTEM creado en BD BarAvenida.';
    END

    ALTER ROLE db_owner ADD MEMBER [NT AUTHORITY\SYSTEM];
    PRINT '[OK] SYSTEM es db_owner sobre BarAvenida.';
END
ELSE
BEGIN
    PRINT '[INFO] BD BarAvenida aun no existe — el backend la creara al arrancar.';
END
GO

PRINT '';
PRINT '============================================';
PRINT '  SQL SETUP COMPLETADO';
PRINT '  El servicio BarAvenidaAPI puede arrancar.';
PRINT '============================================';
GO
