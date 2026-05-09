-- ============================================================================
-- Bar Avenida - Reset del usuario ADMIN
-- ----------------------------------------------------------------------------
-- 1. Diagnostica usuarios actuales
-- 2. Asegura que existe el usuario "ADMIN" con Rol="Admin", Activo=1
-- 3. Resetea su PIN a "1234" (hash BCrypt valido pre-generado)
-- 4. Verifica al final
--
-- Uso:
--   sqlcmd -S "localhost\MSSQLSERVER01" -E -d BarAvenida -i "F:\BarAvenida\Scripts\reset-admin-pin.sql"
-- ============================================================================

SET NOCOUNT ON;

PRINT '============================================================'
PRINT 'DIAGNOSTICO ANTES DEL RESET'
PRINT '============================================================'

SELECT
    Id,
    Codigo,
    Nombre,
    Rol,
    Activo,
    LEN(PinHash) AS PinHashLen,
    LEFT(PinHash, 4) AS HashPrefix
FROM Usuarios
ORDER BY Id;

PRINT '';
PRINT '============================================================'
PRINT 'APLICANDO FIX...'
PRINT '============================================================'

-- Hash BCrypt valido del PIN "1234" (pre-generado, formato $2b$ es compatible con BCrypt.Net-Next 4.x)
DECLARE @hashNuevo NVARCHAR(100) = '$2b$11$4AM.Vao6Za/J4yqeL/lA6e45xPMJ2WhRKgWGLUuPUb5d1H0/V7sra'

-- Si no existe el usuario ADMIN, crearlo
IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Codigo = 'ADMIN')
BEGIN
    INSERT INTO Usuarios (Codigo, Nombre, Rol, Activo, PinHash, FechaCreacion)
    VALUES ('ADMIN', 'Coronado', 'Admin', 1, @hashNuevo, GETDATE())
    PRINT 'Usuario ADMIN CREADO con PIN=1234'
END
ELSE
BEGIN
    UPDATE Usuarios
    SET Rol     = 'Admin',
        Activo  = 1,
        PinHash = @hashNuevo
    WHERE Codigo = 'ADMIN'
    PRINT 'Usuario ADMIN ACTUALIZADO: Rol=Admin, Activo=1, PIN=1234'
END

-- Tambien asegurar que el usuario que sabemos funciona (codigo 12, nau) tenga su rol claro
-- (no le cambiamos el PIN porque ya lo conoce: 1111)
UPDATE Usuarios SET Rol = ISNULL(NULLIF(Rol,''), 'Mesera') WHERE Codigo IN ('12','11','23')

PRINT '';
PRINT '============================================================'
PRINT 'VERIFICACION DESPUES DEL RESET'
PRINT '============================================================'

SELECT
    Id,
    Codigo,
    Nombre,
    Rol,
    Activo,
    LEFT(PinHash, 7) AS HashStart,
    CASE WHEN LEN(PinHash) >= 60 THEN 'OK' ELSE 'INVALIDO' END AS HashStatus
FROM Usuarios
ORDER BY Id;

PRINT '';
PRINT '============================================================'
PRINT '  LISTO - Probar login con:'
PRINT '  Codigo: ADMIN    PIN: 1234'
PRINT '============================================================'
