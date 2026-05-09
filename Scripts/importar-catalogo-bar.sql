-- ============================================================================
-- Bar Avenida - Importar catalogo completo desde Soft Restaurant 8.1.0
-- ----------------------------------------------------------------------------
-- 14 categorias / ~120 productos con precios reales del bar.
--
-- IDEMPOTENTE: se puede ejecutar varias veces. Solo inserta lo que no exista.
-- NO borra ni desactiva productos existentes.
--
-- Ejecutar:
--   sqlcmd -S "localhost\MSSQLSERVER01" -E -d BarAvenida -i "F:\BarAvenida\Scripts\importar-catalogo-bar.sql"
-- ============================================================================

SET NOCOUNT ON;
PRINT 'Importando catalogo Bar Avenida...';

-- ============================================================================
-- 1. CATEGORIAS (14 grupos)
-- ============================================================================
PRINT '[1/2] Creando categorias...';

IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'TEQUILAS')
    INSERT INTO Categorias (Nombre, Orden, ColorHex, Activa) VALUES (N'TEQUILAS',     1, '#d4a017', 1);
IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'REFRESCOS')
    INSERT INTO Categorias (Nombre, Orden, ColorHex, Activa) VALUES (N'REFRESCOS',    2, '#3b82f6', 1);
IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'PREPARADOS')
    INSERT INTO Categorias (Nombre, Orden, ColorHex, Activa) VALUES (N'PREPARADOS',   3, '#22c55e', 1);
IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'RON')
    INSERT INTO Categorias (Nombre, Orden, ColorHex, Activa) VALUES (N'RON',          4, '#a78b00', 1);
IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'WISKYS')
    INSERT INTO Categorias (Nombre, Orden, ColorHex, Activa) VALUES (N'WISKYS',       5, '#c2410c', 1);
IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'MEZCAL')
    INSERT INTO Categorias (Nombre, Orden, ColorHex, Activa) VALUES (N'MEZCAL',       6, '#84cc16', 1);
IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'VODKAS')
    INSERT INTO Categorias (Nombre, Orden, ColorHex, Activa) VALUES (N'VODKAS',       7, '#a855f7', 1);
IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'MEZCLADORES')
    INSERT INTO Categorias (Nombre, Orden, ColorHex, Activa) VALUES (N'MEZCLADORES',  8, '#06b6d4', 1);
IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'LICORES')
    INSERT INTO Categorias (Nombre, Orden, ColorHex, Activa) VALUES (N'LICORES',      9, '#ec4899', 1);
IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'CLAMATOS')
    INSERT INTO Categorias (Nombre, Orden, ColorHex, Activa) VALUES (N'CLAMATOS',    10, '#dc2626', 1);
IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'SERVICIOS')
    INSERT INTO Categorias (Nombre, Orden, ColorHex, Activa) VALUES (N'SERVICIOS',   11, '#6b7280', 1);
IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'CIGARROS')
    INSERT INTO Categorias (Nombre, Orden, ColorHex, Activa) VALUES (N'CIGARROS',    12, '#78716c', 1);
IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'OTROS')
    INSERT INTO Categorias (Nombre, Orden, ColorHex, Activa) VALUES (N'OTROS',       13, '#94a3b8', 1);
IF NOT EXISTS (SELECT 1 FROM Categorias WHERE Nombre = 'CUBETAS')
    INSERT INTO Categorias (Nombre, Orden, ColorHex, Activa) VALUES (N'CUBETAS',     14, '#f59e0b', 1);

-- ============================================================================
-- 2. PRODUCTOS
-- ============================================================================
PRINT '[2/2] Creando productos...';

DECLARE @cat INT;

-- ── TEQUILAS ────────────────────────────────────────────────────────────────
SET @cat = (SELECT Id FROM Categorias WHERE Nombre = N'TEQUILAS');
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'1800 AÑEJO REP BCO SHOT'        AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'1800 AÑEJO REP BCO SHOT',        @cat,    75.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'1800 BOTELLA REP BCO'           AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'1800 BOTELLA REP BCO',           @cat,   850.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'1800 CRISTALINO BOTELLA'        AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'1800 CRISTALINO BOTELLA',        @cat,  1700.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'1800 CRISTALINO SHOT'           AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'1800 CRISTALINO SHOT',           @cat,   100.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CENTENARIO BOTELLA'             AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CENTENARIO BOTELLA',             @cat,   850.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CENTENARIO SHOT'                AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CENTENARIO SHOT',                @cat,    65.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CODORNIZ BOTELLA'               AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CODORNIZ BOTELLA',               @cat,   750.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CODORNIZ SHOT'                  AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CODORNIZ SHOT',                  @cat,    55.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CUERVO ESPECIAL BOTELLA'        AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CUERVO ESPECIAL BOTELLA',        @cat,   800.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CUERVO ESPECIAL SHOT'           AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CUERVO ESPECIAL SHOT',           @cat,    65.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'DON JULIO 70 BOTELLA'           AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'DON JULIO 70 BOTELLA',           @cat,  1800.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'DON JULIO 70 SHOT'              AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'DON JULIO 70 SHOT',              @cat,   150.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'DON JULIO REP Y BCO BOTELLA'    AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'DON JULIO REP Y BCO BOTELLA',    @cat,  1200.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'DON JULIO REP Y BCO SHOT'       AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'DON JULIO REP Y BCO SHOT',       @cat,   100.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'HORNITOS BOTELLA'               AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'HORNITOS BOTELLA',               @cat,   800.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'HORNITOS SHOT'                  AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'HORNITOS SHOT',                  @cat,    65.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'JIMADOR BOTELLA'                AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'JIMADOR BOTELLA',                @cat,   750.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'JIMADOR SHOT'                   AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'JIMADOR SHOT',                   @cat,    55.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'MAESTRO DOBEL BOTELLA'          AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'MAESTRO DOBEL BOTELLA',          @cat,  1700.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'MAESTRO DOBEL SHOT'             AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'MAESTRO DOBEL SHOT',             @cat,   100.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'TRADICIONAL BOTELLA'            AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'TRADICIONAL BOTELLA',            @cat,   800.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'TRADICIONAL SHOT'               AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'TRADICIONAL SHOT',               @cat,    65.00, 'Shot',    1, 1, 0);

-- ── REFRESCOS ───────────────────────────────────────────────────────────────
SET @cat = (SELECT Id FROM Categorias WHERE Nombre = N'REFRESCOS');
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'AGUA MINERAL'                   AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'AGUA MINERAL',                   @cat,    35.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'AGUA NATURAL'                   AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'AGUA NATURAL',                   @cat,    35.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'COCA'                           AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'COCA',                           @cat,    35.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'FRESCA'                         AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'FRESCA',                         @cat,    35.00, 'Pieza', 1, 1, 0);

-- ── PREPARADOS ──────────────────────────────────────────────────────────────
SET @cat = (SELECT Id FROM Categorias WHERE Nombre = N'PREPARADOS');
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'JARABE NAT - GRANA SHOT'        AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'JARABE NAT - GRANA SHOT',        @cat,    15.00, 'Shot',  1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'LIMON CONCENTRADO SHOT'         AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'LIMON CONCENTRADO SHOT',         @cat,    10.00, 'Shot',  1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'LIMONADA CHICA'                 AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'LIMONADA CHICA',                 @cat,    35.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'LIMONADA GRANDE'                AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'LIMONADA GRANDE',                @cat,    70.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'PERLA NEGRA'                    AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'PERLA NEGRA',                    @cat,   135.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'PREPARADO PALOMA'               AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'PREPARADO PALOMA',               @cat,    20.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'PREPARADO VAMPIRO'              AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'PREPARADO VAMPIRO',              @cat,    35.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'SANGRITA SHOT'                  AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'SANGRITA SHOT',                  @cat,    10.00, 'Shot',  1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'SHOT PETROLEO'                  AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'SHOT PETROLEO',                  @cat,    15.00, 'Shot',  1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'VASO CHELADO SAL Y LIMON'       AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'VASO CHELADO SAL Y LIMON',       @cat,    10.00, 'Pieza', 1, 1, 0);

-- ── RON ─────────────────────────────────────────────────────────────────────
SET @cat = (SELECT Id FROM Categorias WHERE Nombre = N'RON');
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BACARDI AÑEJO BOTELLA'          AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BACARDI AÑEJO BOTELLA',          @cat,   650.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BACARDI AÑEJO SHOT'             AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BACARDI AÑEJO SHOT',             @cat,    65.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BACARDI CARTA BLANCA BOTELLA'   AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BACARDI CARTA BLANCA BOTELLA',   @cat,   750.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BACARDI CARTA BLANCA SHOT'      AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BACARDI CARTA BLANCA SHOT',      @cat,    65.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BACARDI SOLERA BOTELLA'         AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BACARDI SOLERA BOTELLA',         @cat,   800.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BACARDI SOLERA SHOT'            AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BACARDI SOLERA SHOT',            @cat,    65.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CAPITAN MORGAN BOTELLA'         AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CAPITAN MORGAN BOTELLA',         @cat,   850.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CAPITAN MORGAN SHOT'            AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CAPITAN MORGAN SHOT',            @cat,    65.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'MATUSALEM BOTELLA'              AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'MATUSALEM BOTELLA',              @cat,   850.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'MATUSALEM SHOT'                 AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'MATUSALEM SHOT',                 @cat,    65.00, 'Shot',    1, 1, 0);

-- ── WISKYS ──────────────────────────────────────────────────────────────────
SET @cat = (SELECT Id FROM Categorias WHERE Nombre = N'WISKYS');
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BLACK LABEL BOTELLA'            AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BLACK LABEL BOTELLA',            @cat,  1700.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BLACK LABEL SHOT'               AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BLACK LABEL SHOT',               @cat,   100.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BLACK WHITE BOTELLA'            AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BLACK WHITE BOTELLA',            @cat,   800.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BLACK WHITE SHOT'               AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BLACK WHITE SHOT',               @cat,    70.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BUCHANANS 12 BOTELLA'           AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BUCHANANS 12 BOTELLA',           @cat,  1700.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BUCHANANS 12 SHOT'              AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BUCHANANS 12 SHOT',              @cat,   100.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BUCHANANS 18 BOTELLA'           AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BUCHANANS 18 BOTELLA',           @cat,  2800.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BUCHANANS 18 SHOT'              AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BUCHANANS 18 SHOT',              @cat,   170.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CHIVAS REGAL BOTELLA'           AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CHIVAS REGAL BOTELLA',           @cat,  1700.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CHIVAS REGAL SHOT'              AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CHIVAS REGAL SHOT',              @cat,   100.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'JACK DANIELS BOTELLA'           AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'JACK DANIELS BOTELLA',           @cat,   850.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'JACK DANIELS HONEY BOTELLA'     AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'JACK DANIELS HONEY BOTELLA',     @cat,   850.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'JACK DANIELS HONEY SHOT'        AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'JACK DANIELS HONEY SHOT',        @cat,    85.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'JACK DANIELS SHOT'              AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'JACK DANIELS SHOT',              @cat,    85.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'PASSPORT BOTELLA'               AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'PASSPORT BOTELLA',               @cat,   600.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'PASSPORT SHOT'                  AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'PASSPORT SHOT',                  @cat,    55.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'RED LABEL BOTELLA'              AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'RED LABEL BOTELLA',              @cat,   850.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'RED LABEL SHOT'                 AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'RED LABEL SHOT',                 @cat,    75.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'WILLIAM LAWSON BOTELLA'         AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'WILLIAM LAWSON BOTELLA',         @cat,   600.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'WILLIAM LAWSON SHOT'            AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'WILLIAM LAWSON SHOT',            @cat,    55.00, 'Shot',    1, 1, 0);

-- ── MEZCAL ──────────────────────────────────────────────────────────────────
SET @cat = (SELECT Id FROM Categorias WHERE Nombre = N'MEZCAL');
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'400 CONEJOS BOTELLA'            AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'400 CONEJOS BOTELLA',            @cat,   900.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'400 CONEJOS SHOT'               AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'400 CONEJOS SHOT',               @cat,    75.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'AMARAS BOTELLA'                 AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'AMARAS BOTELLA',                 @cat,  1000.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'AMARAS SHOT'                    AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'AMARAS SHOT',                    @cat,    85.00, 'Shot',    1, 1, 0);

-- ── VODKAS ──────────────────────────────────────────────────────────────────
SET @cat = (SELECT Id FROM Categorias WHERE Nombre = N'VODKAS');
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'ABSOLUT BOTELLA'                AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'ABSOLUT BOTELLA',                @cat,   750.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'ABSOLUT SHOT'                   AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'ABSOLUT SHOT',                   @cat,    65.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'OSO NEGRO BOTELLA'              AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'OSO NEGRO BOTELLA',              @cat,   650.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'OSO NEGRO SHOT'                 AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'OSO NEGRO SHOT',                 @cat,    65.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'SMIRNOFF SHOT'                  AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'SMIRNOFF SHOT',                  @cat,    65.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'SMIRNOFF BOTELLA'               AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'SMIRNOFF BOTELLA',               @cat,   750.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'WIBOROWA BOTELLA'               AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'WIBOROWA BOTELLA',               @cat,   750.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'WIBOROWA SHOT'                  AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'WIBOROWA SHOT',                  @cat,    55.00, 'Shot',    1, 1, 0);

-- ── MEZCLADORES ─────────────────────────────────────────────────────────────
SET @cat = (SELECT Id FROM Categorias WHERE Nombre = N'MEZCLADORES');
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BOOST CHICO'                    AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BOOST CHICO',                    @cat,    45.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BOOST GRANDE'                   AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BOOST GRANDE',                   @cat,    80.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'RED BULL'                       AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'RED BULL',                       @cat,    58.00, 'Pieza', 1, 1, 0);

-- ── LICORES ─────────────────────────────────────────────────────────────────
SET @cat = (SELECT Id FROM Categorias WHERE Nombre = N'LICORES');
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BAILEYS BOTELLA'                AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BAILEYS BOTELLA',                @cat,   800.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BAILEYS SHOT'                   AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BAILEYS SHOT',                   @cat,    70.00, 'Shot',    1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'LICOR 43 BOTELLA'               AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'LICOR 43 BOTELLA',               @cat,   750.00, 'Botella', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'LICOR 43 SHOT'                  AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'LICOR 43 SHOT',                  @cat,    75.00, 'Shot',    1, 1, 0);

-- ── CLAMATOS ────────────────────────────────────────────────────────────────
SET @cat = (SELECT Id FROM Categorias WHERE Nombre = N'CLAMATOS');
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CLAMATO CHICO'                  AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CLAMATO CHICO',                  @cat,    45.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CLAMATO FRASCO'                 AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CLAMATO FRASCO',                 @cat,    35.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CLAMATO GRANDE'                 AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CLAMATO GRANDE',                 @cat,    85.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'ESCARCHADO CON LIMON'           AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'ESCARCHADO CON LIMON',           @cat,    10.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'ESCARCHADO SENCILLO'            AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'ESCARCHADO SENCILLO',            @cat,     5.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'MICHELADA CHICA'                AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'MICHELADA CHICA',                @cat,    25.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'MICHELADA GRANDE'               AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'MICHELADA GRANDE',               @cat,    40.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'VASO CHELADO LIMON Y SAL'       AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'VASO CHELADO LIMON Y SAL',       @cat,    10.00, 'Pieza', 1, 1, 0);

-- ── SERVICIOS ───────────────────────────────────────────────────────────────
SET @cat = (SELECT Id FROM Categorias WHERE Nombre = N'SERVICIOS');
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'MONEDA'                         AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'MONEDA',                         @cat,    10.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'SALIDA DE DINERO'               AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'SALIDA DE DINERO',               @cat,     1.00, 'Pieza', 1, 1, 0);

-- ── CIGARROS ────────────────────────────────────────────────────────────────
SET @cat = (SELECT Id FROM Categorias WHERE Nombre = N'CIGARROS');
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CAJA MARLBORO BCO'              AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CAJA MARLBORO BCO',              @cat,   130.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CAJA MARLBORO ROJO'             AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CAJA MARLBORO ROJO',             @cat,   130.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'MARLBORO BLANCO'                AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'MARLBORO BLANCO',                @cat,    13.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'MARLBORO ROJO'                  AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'MARLBORO ROJO',                  @cat,    13.00, 'Pieza', 1, 1, 0);

-- ── OTROS ───────────────────────────────────────────────────────────────────
SET @cat = (SELECT Id FROM Categorias WHERE Nombre = N'OTROS');
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'BILLAR HORA'                    AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'BILLAR HORA',                    @cat,    60.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'LIMONADA'                       AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'LIMONADA',                       @cat,    70.00, 'Pieza', 1, 1, 0);

-- ── CUBETAS ─────────────────────────────────────────────────────────────────
SET @cat = (SELECT Id FROM Categorias WHERE Nombre = N'CUBETAS');
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CUBETA AMBAR CORONA'            AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CUBETA AMBAR CORONA',            @cat,   450.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CUBETA AMSTEL ULTRA'            AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CUBETA AMSTEL ULTRA',            @cat,   450.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CUBETA BOHEMIA'                 AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CUBETA BOHEMIA',                 @cat,   450.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CUBETA CARTA BLANCA'            AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CUBETA CARTA BLANCA',            @cat,   450.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CUBETA CORONA'                  AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CUBETA CORONA',                  @cat,   400.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CUBETA HEINEKEN'                AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CUBETA HEINEKEN',                @cat,   450.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CUBETA INDIO'                   AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CUBETA INDIO',                   @cat,   350.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CUBETA MILLER'                  AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CUBETA MILLER',                  @cat,   470.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CUBETA MODELO'                  AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CUBETA MODELO',                  @cat,   450.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CUBETA TECATE'                  AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CUBETA TECATE',                  @cat,   350.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CUBETA ULTRA MICHELOB'          AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CUBETA ULTRA MICHELOB',          @cat,   450.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CUBETA VICTORIA'                AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CUBETA VICTORIA',                @cat,   400.00, 'Pieza', 1, 1, 0);
IF NOT EXISTS (SELECT 1 FROM Productos WHERE Nombre = N'CUBETA XX'                      AND CategoriaId = @cat)
    INSERT INTO Productos (Nombre, CategoriaId, Precio, TipoVenta, CantidadDescuento, Activo, Orden) VALUES (N'CUBETA XX',                      @cat,   450.00, 'Pieza', 1, 1, 0);

-- ============================================================================
-- RESUMEN
-- ============================================================================
PRINT '';
PRINT '================================================';
PRINT '  IMPORTACION COMPLETADA';
PRINT '================================================';

DECLARE @totalCats INT = (SELECT COUNT(*) FROM Categorias WHERE Activa = 1);
DECLARE @totalProds INT = (SELECT COUNT(*) FROM Productos WHERE Activo = 1);

PRINT 'Categorias activas: ' + CAST(@totalCats AS VARCHAR);
PRINT 'Productos activos:  ' + CAST(@totalProds AS VARCHAR);
PRINT '';

SELECT c.Nombre AS Categoria, COUNT(p.Id) AS [Productos]
FROM Categorias c
LEFT JOIN Productos p ON p.CategoriaId = c.Id AND p.Activo = 1
WHERE c.Activa = 1
GROUP BY c.Nombre, c.Orden
ORDER BY c.Orden;
