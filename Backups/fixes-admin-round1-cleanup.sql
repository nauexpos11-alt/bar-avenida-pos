-- ============================================================================
-- FIXES Admin Round 1 — limpieza de datos
-- ----------------------------------------------------------------------------
-- 1. Cancela la mesa M1 fantasma (de las pruebas de ABBY).
-- 2. Borra el producto "Cerveza Heineken Test" (id 1003).
--
-- Uso:
--   sqlcmd -S "localhost\MSSQLSERVER01" -E -d BarAvenida -i "F:\BarAvenida\Backups\fixes-admin-round1-cleanup.sql"
-- ============================================================================

USE BarAvenida;
GO

PRINT '== FIX-4: Cerrar mesa M1 fantasma ==';
DECLARE @cuentasFantasma INT = (
    SELECT COUNT(*)
    FROM Cuentas
    WHERE MesaId = 1
      AND Estado = 'Abierta'
      AND Total = 0
);
PRINT CONCAT('Cuentas fantasma encontradas: ', @cuentasFantasma);

UPDATE Cuentas
SET Estado            = 'Cancelada',
    FechaCancelacion  = GETDATE(),
    MotivoCancelacion = 'Mesa fantasma de pruebas - cleanup automatico'
WHERE MesaId = 1
  AND Estado = 'Abierta'
  AND Total  = 0;
PRINT '[OK] Cuentas fantasma de Mesa 1 canceladas';

PRINT '';
PRINT '== FIX-7: Borrar producto Heineken Test ==';
DECLARE @prodTest INT = (SELECT COUNT(*) FROM Productos WHERE Id = 1003);
PRINT CONCAT('Producto 1003 encontrado: ', @prodTest);

DELETE FROM Productos WHERE Id = 1003 AND Nombre LIKE '%Test%';
PRINT '[OK] Producto Heineken Test eliminado';

PRINT '';
PRINT '[OK] Limpieza completa.';
GO
