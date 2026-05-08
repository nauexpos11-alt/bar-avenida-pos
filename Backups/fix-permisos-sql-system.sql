-- ============================================================================
-- Bar Avenida — Fix de permisos para servicio Windows
-- ----------------------------------------------------------------------------
-- El servicio "Bar Avenida API" corre bajo NT AUTHORITY\SYSTEM por default.
-- Esta cuenta no tenia acceso a la BD BarAvenida y fallaba con error 4060.
--
-- Este script:
--   1. Crea el login NT AUTHORITY\SYSTEM si no existe.
--   2. Crea el usuario en la BD BarAvenida.
--   3. Le otorga db_owner para que pueda leer/escribir/migrar.
--
-- COMO CORRERLO (PowerShell):
--   sqlcmd -S "localhost\MSSQLSERVER01" -E -i "F:\BarAvenida\Backups\fix-permisos-sql-system.sql"
-- ============================================================================

USE master;
GO

-- 1. Crear el login si no existe
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'NT AUTHORITY\SYSTEM')
BEGIN
    CREATE LOGIN [NT AUTHORITY\SYSTEM] FROM WINDOWS;
    PRINT '[OK] Login NT AUTHORITY\SYSTEM creado.';
END
ELSE
BEGIN
    PRINT '[OK] Login NT AUTHORITY\SYSTEM ya existia.';
END
GO

-- 2. Asegurar que tiene permisos a nivel servidor (al menos public, default)
GRANT CONNECT SQL TO [NT AUTHORITY\SYSTEM];
GO

-- 3. Crear el usuario en BarAvenida y darle db_owner
USE BarAvenida;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'NT AUTHORITY\SYSTEM')
BEGIN
    CREATE USER [NT AUTHORITY\SYSTEM] FOR LOGIN [NT AUTHORITY\SYSTEM];
    PRINT '[OK] Usuario NT AUTHORITY\SYSTEM creado en BarAvenida.';
END
ELSE
BEGIN
    PRINT '[OK] Usuario NT AUTHORITY\SYSTEM ya existia en BarAvenida.';
END
GO

ALTER ROLE db_owner ADD MEMBER [NT AUTHORITY\SYSTEM];
GO

PRINT '';
PRINT '============================================';
PRINT '  PERMISOS APLICADOS';
PRINT '============================================';
PRINT 'NT AUTHORITY\SYSTEM ahora tiene db_owner sobre BarAvenida.';
PRINT 'El servicio Windows ya puede conectarse.';
PRINT '';
GO
