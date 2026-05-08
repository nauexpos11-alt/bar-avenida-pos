# ============================================================================
# Bar Avenida — Restaurar BD desde un backup
# ----------------------------------------------------------------------------
# Uso:
#   .\restore-baravenida.ps1                       (lista los .bak disponibles)
#   .\restore-baravenida.ps1 -Backup "BarAvenida_20260507_120000.bak"
# ============================================================================

param(
    [string]$Backup
)

$ErrorActionPreference = "Stop"

$ServidorSql      = "localhost\MSSQLSERVER01"
$NombreBaseDatos  = "BarAvenida"
$CarpetaBackups   = "F:\BarAvenida\Backups"

# --- Si no se paso archivo, listar disponibles -------------------------------
if (-not $Backup) {
    Write-Host ""
    Write-Host "Backups disponibles en $CarpetaBackups :" -ForegroundColor Cyan
    Write-Host ""
    Get-ChildItem -Path $CarpetaBackups -Filter "BarAvenida_*.bak" |
        Sort-Object LastWriteTime -Descending |
        Select-Object @{N='Archivo';E={$_.Name}},
                      @{N='Fecha';E={$_.LastWriteTime}},
                      @{N='Tamanio (MB)';E={[math]::Round($_.Length/1MB,2)}} |
        Format-Table -AutoSize
    Write-Host ""
    Write-Host "Para restaurar uno, corre:" -ForegroundColor Yellow
    Write-Host "  .\restore-baravenida.ps1 -Backup `"NOMBRE_DEL_ARCHIVO.bak`"" -ForegroundColor Cyan
    Write-Host ""
    exit 0
}

# --- Validar archivo ---------------------------------------------------------
$rutaBackup = Join-Path $CarpetaBackups $Backup
if (-not (Test-Path $rutaBackup)) {
    Write-Host "ERROR: No se encontro $rutaBackup" -ForegroundColor Red
    exit 1
}

# --- Confirmacion ------------------------------------------------------------
Write-Host ""
Write-Host "  PELIGRO: vas a SOBRESCRIBIR la BD '$NombreBaseDatos' con el backup:" -ForegroundColor Yellow
Write-Host "  $rutaBackup" -ForegroundColor Yellow
Write-Host ""
$confirmar = Read-Host "Escribe 'SI' para continuar"
if ($confirmar -ne "SI") {
    Write-Host "Cancelado." -ForegroundColor Yellow
    exit 0
}

# --- Restaurar ---------------------------------------------------------------
Write-Host ""
Write-Host "Cerrando conexiones a $NombreBaseDatos..." -ForegroundColor Cyan
$sqlCerrar = "ALTER DATABASE [$NombreBaseDatos] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;"
sqlcmd -S $ServidorSql -E -Q $sqlCerrar -b

Write-Host "Restaurando..." -ForegroundColor Cyan
$sqlRestore = @"
RESTORE DATABASE [$NombreBaseDatos]
FROM DISK = N'$rutaBackup'
WITH REPLACE, STATS = 25;
ALTER DATABASE [$NombreBaseDatos] SET MULTI_USER;
"@

sqlcmd -S $ServidorSql -E -Q $sqlRestore -b

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "RESTORE COMPLETADO." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "RESTORE FALLO. Revisa el output de sqlcmd." -ForegroundColor Red
    exit 1
}
