# ============================================================================
# Bar Avenida — Backup automatico de SQL Server
# ----------------------------------------------------------------------------
# Genera un .bak con timestamp en F:\BarAvenida\Backups\
# Mantiene los ultimos 7 dias (168 archivos si corre cada hora).
# Borra automatico todo lo mas viejo que 7 dias.
# ============================================================================

$ErrorActionPreference = "Stop"

# --- Configuracion ----------------------------------------------------------
$ServidorSql      = "localhost\MSSQLSERVER01"
$NombreBaseDatos  = "BarAvenida"
$CarpetaBackups   = "F:\BarAvenida\Backups"
$DiasRetencion    = 7
$LogFile          = "F:\BarAvenida\Backups\backup.log"

# --- Helpers ----------------------------------------------------------------
function Escribir-Log {
    param([string]$Mensaje, [string]$Nivel = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $linea = "[$timestamp] [$Nivel] $Mensaje"
    Write-Host $linea
    Add-Content -Path $LogFile -Value $linea -Encoding UTF8
}

# --- Asegurar carpeta -------------------------------------------------------
if (-not (Test-Path $CarpetaBackups)) {
    New-Item -ItemType Directory -Path $CarpetaBackups -Force | Out-Null
}

try {
    $timestamp        = Get-Date -Format "yyyyMMdd_HHmmss"
    $archivoBackup    = Join-Path $CarpetaBackups "BarAvenida_$timestamp.bak"

    Escribir-Log "=========================================="
    Escribir-Log "Iniciando backup de $NombreBaseDatos"
    Escribir-Log "Destino: $archivoBackup"

    # --- Ejecutar BACKUP DATABASE ------------------------------------------
    $sqlBackup = @"
BACKUP DATABASE [$NombreBaseDatos]
TO DISK = N'$archivoBackup'
WITH NOFORMAT, INIT,
     NAME = N'BarAvenida-Full Backup $timestamp',
     SKIP, NOREWIND, NOUNLOAD,
     COMPRESSION,
     STATS = 25;
"@

    sqlcmd -S $ServidorSql -E -Q $sqlBackup -b
    if ($LASTEXITCODE -ne 0) {
        throw "sqlcmd salio con codigo $LASTEXITCODE"
    }

    $tamanio = (Get-Item $archivoBackup).Length / 1MB
    Escribir-Log ("Backup completado. Tamanio: {0:N2} MB" -f $tamanio)

    # --- Limpieza de backups viejos ----------------------------------------
    $limite = (Get-Date).AddDays(-$DiasRetencion)
    $viejos = Get-ChildItem -Path $CarpetaBackups -Filter "BarAvenida_*.bak" |
              Where-Object { $_.LastWriteTime -lt $limite }

    if ($viejos.Count -gt 0) {
        Escribir-Log "Eliminando $($viejos.Count) backups con mas de $DiasRetencion dias..."
        $viejos | Remove-Item -Force
    }

    # --- Resumen ------------------------------------------------------------
    $todos = Get-ChildItem -Path $CarpetaBackups -Filter "BarAvenida_*.bak"
    $totalMb = [math]::Round(($todos | Measure-Object Length -Sum).Sum / 1MB, 2)
    Escribir-Log "Backups actuales: $($todos.Count) archivos, $totalMb MB en disco"
    Escribir-Log "Backup OK"

    exit 0
}
catch {
    Escribir-Log "ERROR: $_" "ERROR"
    Escribir-Log $_.ScriptStackTrace "ERROR"
    exit 1
}
