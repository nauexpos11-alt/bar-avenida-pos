-- ============================================================================
-- Bar Avenida — Limpieza pre-produccion
-- ----------------------------------------------------------------------------
-- Borra TODOS los datos transaccionales de prueba (cuentas, ordenes, cierres,
-- alertas, solicitudes, etc.) pero CONSERVA:
--   - Catalogo de productos (Productos, Categorias)
--   - Mesas y Areas
--   - Usuarios (los reales se dan de alta despues desde el Admin)
--   - Formas de pago
--   - Configuracion de ticket
--   - Reglas de cross-sell (PROMPT G)
--   - Sensores/Inventario base
--
-- COMO CORRERLO:
--   sqlcmd -S "localhost\MSSQLSERVER01" -E -d BarAvenida -i "F:\BarAvenida\Backups\limpieza-pre-produccion.sql"
--
-- ANTES DE CORRER: hacer un backup manual
--   .\backup-baravenida.ps1
-- ============================================================================

USE BarAvenida;
GO

PRINT '============================================';
PRINT '  LIMPIEZA PRE-PRODUCCION BAR AVENIDA';
PRINT '============================================';
PRINT '';

-- Mostrar conteos antes
PRINT 'CONTEOS ANTES DE LA LIMPIEZA:';
SELECT 'Cuentas'                AS Tabla, COUNT(*) AS Filas FROM Cuentas
UNION ALL SELECT 'Ordenes',                COUNT(*) FROM Ordenes
UNION ALL SELECT 'OrdenDetalles',          COUNT(*) FROM OrdenDetalles
UNION ALL SELECT 'SolicitudesCancelacion', COUNT(*) FROM SolicitudesCancelacion
UNION ALL SELECT 'IncidentesCaja',         COUNT(*) FROM IncidentesCaja
UNION ALL SELECT 'CortesCaja',             COUNT(*) FROM CortesCaja
UNION ALL SELECT 'CajaTurnos',             COUNT(*) FROM CajaTurnos
UNION ALL SELECT 'RetirosCaja',            COUNT(*) FROM RetirosCaja
UNION ALL SELECT 'RegistrosAperturaCajon', COUNT(*) FROM RegistrosAperturaCajon
UNION ALL SELECT 'MovimientosInventario',  COUNT(*) FROM MovimientosInventario
UNION ALL SELECT 'LecturasSensor',         COUNT(*) FROM LecturasSensor;

PRINT '';
PRINT 'Iniciando limpieza...';
PRINT '';

BEGIN TRANSACTION;

BEGIN TRY
    -- 1. Solicitudes de cancelacion (FK a Cuenta y OrdenDetalle)
    DELETE FROM SolicitudesCancelacion;
    PRINT '  [OK] SolicitudesCancelacion limpia';

    -- 2. Detalles de orden (FK a Orden y Producto)
    DELETE FROM OrdenDetalles;
    PRINT '  [OK] OrdenDetalles limpia';

    -- 3. Ordenes (FK a Cuenta)
    DELETE FROM Ordenes;
    PRINT '  [OK] Ordenes limpia';

    -- 4. Cuentas (FK a Mesa y Usuario)
    DELETE FROM Cuentas;
    PRINT '  [OK] Cuentas limpia';

    -- 5. Incidentes de caja (FK a CorteCaja, CajaTurno, Usuario)
    DELETE FROM IncidentesCaja;
    PRINT '  [OK] IncidentesCaja limpia';

    -- 6. Retiros de caja (FK a CajaTurno y Usuario)
    DELETE FROM RetirosCaja;
    PRINT '  [OK] RetirosCaja limpia';

    -- 7. Registros de apertura de cajon (FK a Cuenta, Usuario)
    DELETE FROM RegistrosAperturaCajon;
    PRINT '  [OK] RegistrosAperturaCajon limpia';

    -- 8. Cortes de caja (FK a CajaTurno y Usuario)
    DELETE FROM CortesCaja;
    PRINT '  [OK] CortesCaja limpia';

    -- 9. Turnos de caja (FK a Usuario)
    DELETE FROM CajaTurnos;
    PRINT '  [OK] CajaTurnos limpia';

    -- 10. Movimientos de inventario (FK a InventarioItem y Usuario)
    DELETE FROM MovimientosInventario;
    PRINT '  [OK] MovimientosInventario limpia';

    -- 11. Lecturas de sensor (FK a Sensor)
    DELETE FROM LecturasSensor;
    PRINT '  [OK] LecturasSensor limpia';

    -- 12. Resetear secuencias de folio para que arranque desde 1
    UPDATE SecuenciasFolio
    SET UltimoFolio = 0
    WHERE 1=1;
    PRINT '  [OK] SecuenciasFolio reseteadas a 0';

    -- 13. Resetear identidades (auto-increment) de las tablas limpiadas
    DBCC CHECKIDENT ('OrdenDetalles',           RESEED, 0);
    DBCC CHECKIDENT ('Ordenes',                 RESEED, 0);
    DBCC CHECKIDENT ('Cuentas',                 RESEED, 0);
    DBCC CHECKIDENT ('SolicitudesCancelacion',  RESEED, 0);
    DBCC CHECKIDENT ('IncidentesCaja',          RESEED, 0);
    DBCC CHECKIDENT ('RetirosCaja',             RESEED, 0);
    DBCC CHECKIDENT ('CortesCaja',              RESEED, 0);
    DBCC CHECKIDENT ('CajaTurnos',              RESEED, 0);
    DBCC CHECKIDENT ('RegistrosAperturaCajon',  RESEED, 0);
    DBCC CHECKIDENT ('MovimientosInventario',   RESEED, 0);
    DBCC CHECKIDENT ('LecturasSensor',          RESEED, 0);
    PRINT '  [OK] Identidades reseteadas';

    COMMIT TRANSACTION;
    PRINT '';
    PRINT '============================================';
    PRINT '  LIMPIEZA COMPLETADA - COMMIT OK';
    PRINT '============================================';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '';
    PRINT '*** ERROR EN LA LIMPIEZA - ROLLBACK ***';
    PRINT ERROR_MESSAGE();
    THROW;
END CATCH;

PRINT '';
PRINT 'CONTEOS DESPUES DE LA LIMPIEZA:';
SELECT 'Cuentas'                AS Tabla, COUNT(*) AS Filas FROM Cuentas
UNION ALL SELECT 'Ordenes',                COUNT(*) FROM Ordenes
UNION ALL SELECT 'OrdenDetalles',          COUNT(*) FROM OrdenDetalles
UNION ALL SELECT 'SolicitudesCancelacion', COUNT(*) FROM SolicitudesCancelacion
UNION ALL SELECT 'IncidentesCaja',         COUNT(*) FROM IncidentesCaja
UNION ALL SELECT 'CortesCaja',             COUNT(*) FROM CortesCaja
UNION ALL SELECT 'CajaTurnos',             COUNT(*) FROM CajaTurnos;

PRINT '';
PRINT 'CONTEOS DE LO QUE SE CONSERVO:';
SELECT 'Productos'           AS Tabla, COUNT(*) AS Filas FROM Productos
UNION ALL SELECT 'Categorias',         COUNT(*) FROM Categorias
UNION ALL SELECT 'Mesas',              COUNT(*) FROM Mesas
UNION ALL SELECT 'Areas',              COUNT(*) FROM Areas
UNION ALL SELECT 'Usuarios',           COUNT(*) FROM Usuarios
UNION ALL SELECT 'FormasPago',         COUNT(*) FROM FormasPago
UNION ALL SELECT 'ReglasCrossSell',    COUNT(*) FROM ReglasCrossSell
UNION ALL SELECT 'InventarioItems',    COUNT(*) FROM InventarioItems
UNION ALL SELECT 'Sensores',           COUNT(*) FROM Sensores;

PRINT '';
PRINT 'BD lista para produccion. Reinicia el backend para que el detector';
PRINT 'de alertas deje de gritar mesas viejas.';
GO
