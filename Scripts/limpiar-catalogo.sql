-- ============================================================================
-- Bar Avenida - Limpiar duplicados y errores del catalogo
-- ----------------------------------------------------------------------------
-- 1. Desactiva productos duplicados con encoding malo (AÃ' en lugar de Ñ)
-- 2. Desactiva el producto "CACA" de prueba
-- 3. Corrige precio de Centenario Shot ($45 -> $65)
--
-- IMPORTANTE: usa Activo=0 (desactivacion) en lugar de DELETE
-- para no romper referencias de ventas anteriores.
--
-- Ejecutar:
--   sqlcmd -S "localhost\MSSQLSERVER01" -E -d BarAvenida -i "F:\BarAvenida\Scripts\limpiar-catalogo.sql"
-- ============================================================================

SET NOCOUNT ON;
PRINT 'Limpiando catalogo Bar Avenida...';

DECLARE @desact INT = 0
DECLARE @corregidos INT = 0

-- ============================================================================
-- 1. Desactivar productos con encoding corrupto (AÃ' en lugar de Ñ)
-- ============================================================================
PRINT '[1/3] Desactivando productos con encoding corrupto...';

UPDATE Productos SET Activo = 0
WHERE Nombre LIKE '%AÃ''%' OR Nombre LIKE '%AÃ%' COLLATE Latin1_General_BIN
SET @desact = @@ROWCOUNT
PRINT '  Desactivados: ' + CAST(@desact AS VARCHAR)

-- ============================================================================
-- 2. Desactivar producto "CACA" de prueba
-- ============================================================================
PRINT '[2/3] Desactivando producto de prueba CACA...';

UPDATE Productos SET Activo = 0
WHERE Nombre = 'CACA' OR Nombre = 'caca'
SET @desact = @@ROWCOUNT
PRINT '  Desactivados: ' + CAST(@desact AS VARCHAR)

-- ============================================================================
-- 3. Corregir precio de Centenario Shot ($45 -> $65)
-- ============================================================================
PRINT '[3/3] Corrigiendo precio de Centenario Shot...';

UPDATE Productos SET Precio = 65.00
WHERE Nombre LIKE '%Centenario Shot%' AND Activo = 1 AND Precio = 45.00
SET @corregidos = @@ROWCOUNT
PRINT '  Corregidos: ' + CAST(@corregidos AS VARCHAR)

-- ============================================================================
-- RESUMEN
-- ============================================================================
PRINT ''
PRINT '================================================'
PRINT '  LIMPIEZA COMPLETADA'
PRINT '================================================'

DECLARE @totalProds INT = (SELECT COUNT(*) FROM Productos WHERE Activo = 1);
PRINT 'Productos activos despues de limpiar: ' + CAST(@totalProds AS VARCHAR)
PRINT ''

PRINT 'Resumen por categoria:'
SELECT c.Nombre AS Categoria, COUNT(p.Id) AS Productos
FROM Categorias c
LEFT JOIN Productos p ON p.CategoriaId = c.Id AND p.Activo = 1
WHERE c.Activa = 1
GROUP BY c.Nombre, c.Orden
ORDER BY c.Orden;

GO
