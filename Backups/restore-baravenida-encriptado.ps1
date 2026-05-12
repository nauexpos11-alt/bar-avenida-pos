# ============================================================================
# Bar Avenida - Restaurar BD desde un backup ENCRIPTADO (.bak.aes)
# ----------------------------------------------------------------------------
# Uso:
#   .\restore-baravenida-encriptado.ps1 -PathAes "F:\BarAvenida\Backups\BarAvenida_20260511_120000.bak.aes"
#   .\restore-baravenida-encriptado.ps1 -PathAes "...\backup.bak.aes" -Password "BarAvenida_Backup_2026!"
#
# Flujo:
#   1. Lee el .bak.aes, separa IV (16 bytes) y descifra con AES-256-CBC PKCS7.
#   2. Escribe un .bak temporal en %TEMP%.
#   3. Detiene el servicio BarAvenidaAPI.
#   4. RESTORE DATABASE BarAvenida FROM DISK = '...' WITH REPLACE.
#   5. Borra el .bak temporal (no dejar plain text en disco).
#   6. Reinicia el servicio.
#   7. Verifica que el backend responde en http://localhost:7000/api/sistema/hora.
# ============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$PathAes,

    [string]$Password = "BarAvenida_Backup_2026!"
)

$ErrorActionPreference = "Stop"

$ServidorSql      = "localhost\MSSQLSERVER01"
$NombreBaseDatos  = "BarAvenida"
$NombreServicio   = "BarAvenidaAPI"
$UrlHealth        = "http://localhost:7000/api/sistema/hora"

# --- Validaciones -----------------------------------------------------------
if (-not (Test-Path $PathAes)) {
    Write-Host "ERROR: No se encontro $PathAes" -ForegroundColor Red
    exit 1
}

# --- Confirmacion -----------------------------------------------------------
Write-Host ""
Write-Host "  ATENCION: vas a restaurar la BD '$NombreBaseDatos' desde:" -ForegroundColor Yellow
Write-Host "  $PathAes" -ForegroundColor Yellow
Write-Host "  Esto SOBRESCRIBE la BD actual." -ForegroundColor Yellow
Write-Host ""
$confirmar = Read-Host "Restaurar BD BarAvenida desde $PathAes? Esto sobrescribe la BD actual. (S/N)"
if ($confirmar -ne "S" -and $confirmar -ne "s") {
    Write-Host "Cancelado." -ForegroundColor Yellow
    exit 0
}

# --- Desencriptar a un .bak temporal ----------------------------------------
$tempBak = Join-Path $env:TEMP ("BarAvenida_restore_{0}.bak" -f (Get-Date -Format "yyyyMMdd_HHmmss"))
Write-Host ""
Write-Host "Desencriptando a $tempBak ..." -ForegroundColor Cyan

try {
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $key = $sha256.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Password))
    } finally {
        $sha256.Dispose()
    }

    $allBytes = [System.IO.File]::ReadAllBytes($PathAes)
    if ($allBytes.Length -le 16) {
        throw "Archivo cifrado demasiado corto (faltaria el IV)."
    }

    $iv = New-Object byte[] 16
    [Array]::Copy($allBytes, 0, $iv, 0, 16)

    $cipherLen = $allBytes.Length - 16
    $cipher = New-Object byte[] $cipherLen
    [Array]::Copy($allBytes, 16, $cipher, 0, $cipherLen)

    $aes = [System.Security.Cryptography.Aes]::Create()
    try {
        $aes.KeySize = 256
        $aes.Key     = $key
        $aes.IV      = $iv
        $aes.Mode    = [System.Security.Cryptography.CipherMode]::CBC
        $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7

        $decryptor = $aes.CreateDecryptor()
        try {
            $plain = $decryptor.TransformFinalBlock($cipher, 0, $cipher.Length)
        } finally {
            $decryptor.Dispose()
        }
    } finally {
        $aes.Dispose()
    }

    [System.IO.File]::WriteAllBytes($tempBak, $plain)
    Write-Host "Desencriptado OK ($([math]::Round($plain.Length / 1MB, 2)) MB)." -ForegroundColor Green
}
catch {
    Write-Host "ERROR al desencriptar: $_" -ForegroundColor Red
    Write-Host "Verifica que la password sea correcta." -ForegroundColor Yellow
    if (Test-Path $tempBak) { Remove-Item $tempBak -Force -ErrorAction SilentlyContinue }
    exit 1
}

# --- Detener servicio -------------------------------------------------------
Write-Host ""
Write-Host "Deteniendo servicio $NombreServicio ..." -ForegroundColor Cyan
$svc = Get-Service -Name $NombreServicio -ErrorAction SilentlyContinue
if ($svc -ne $null) {
    if ($svc.Status -eq 'Running') {
        Stop-Service -Name $NombreServicio -Force
        Start-Sleep -Seconds 3
    }
} else {
    Write-Host "AVISO: el servicio $NombreServicio no existe. Continuo igual." -ForegroundColor Yellow
}

# --- Restaurar --------------------------------------------------------------
Write-Host ""
Write-Host "Cerrando conexiones a $NombreBaseDatos ..." -ForegroundColor Cyan
$sqlCerrar = "IF DB_ID('$NombreBaseDatos') IS NOT NULL ALTER DATABASE [$NombreBaseDatos] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;"
sqlcmd -S $ServidorSql -E -Q $sqlCerrar -b

Write-Host "Restaurando $NombreBaseDatos ..." -ForegroundColor Cyan
$sqlRestore = @"
RESTORE DATABASE [$NombreBaseDatos]
FROM DISK = N'$tempBak'
WITH REPLACE, STATS = 25;
ALTER DATABASE [$NombreBaseDatos] SET MULTI_USER;
"@

sqlcmd -S $ServidorSql -E -Q $sqlRestore -b
$restoreCode = $LASTEXITCODE

# --- Borrar .bak temporal (siempre) -----------------------------------------
if (Test-Path $tempBak) {
    Remove-Item $tempBak -Force
    Write-Host "Borrado .bak temporal." -ForegroundColor Cyan
}

if ($restoreCode -ne 0) {
    Write-Host ""
    Write-Host "RESTORE FALLO (sqlcmd codigo $restoreCode). Revisa el output arriba." -ForegroundColor Red
    # Intentar reiniciar igual el servicio para no dejar el negocio caido
    if ($svc -ne $null) {
        Start-Service -Name $NombreServicio -ErrorAction SilentlyContinue
    }
    exit 1
}

Write-Host ""
Write-Host "RESTORE COMPLETADO." -ForegroundColor Green

# --- Reiniciar servicio -----------------------------------------------------
if ($svc -ne $null) {
    Write-Host ""
    Write-Host "Iniciando servicio $NombreServicio ..." -ForegroundColor Cyan
    Start-Service -Name $NombreServicio
    Start-Sleep -Seconds 5
}

# --- Verificar backend ------------------------------------------------------
Write-Host ""
Write-Host "Verificando backend en $UrlHealth ..." -ForegroundColor Cyan
$ok = $false
for ($i = 1; $i -le 6; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri $UrlHealth -UseBasicParsing -TimeoutSec 5
        if ($resp.StatusCode -eq 200) {
            $ok = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 5
    }
}

if ($ok) {
    Write-Host ""
    Write-Host "Backend respondiendo OK. Restore terminado." -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "AVISO: el backend no respondio en $UrlHealth despues de varios intentos." -ForegroundColor Yellow
    Write-Host "Revisa F:\BarAvenida\Logs y el servicio $NombreServicio." -ForegroundColor Yellow
    exit 2
}
