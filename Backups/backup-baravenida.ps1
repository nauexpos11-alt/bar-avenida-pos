# ============================================================================
# Bar Avenida - Backup automatico de SQL Server (v1.9.0 - encriptado AES-256)
# ----------------------------------------------------------------------------
# Genera un .bak con timestamp en F:\BarAvenida\Backups\, lo encripta a
# .bak.aes con AES-256-CBC y borra el .bak plano.
# Mantiene los ultimos 7 dias (168 archivos si corre cada hora).
# Borra automatico todo lo mas viejo que 7 dias.
#
# Para restaurar uno encriptado: usar restore-baravenida-encriptado.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

# --- Configuracion ----------------------------------------------------------
$ServidorSql      = "localhost\MSSQLSERVER01"
$NombreBaseDatos  = "BarAvenida"
$CarpetaBackups   = "F:\BarAvenida\Backups"
$DiasRetencion    = 7
$LogFile          = "F:\BarAvenida\Backups\backup.log"

# TODO (futuro): mover esta password a una variable de entorno o DPAPI.
#   Algo como: $BackupPassword = $env:BARAVENIDA_BACKUP_PASSWORD
#   Mientras tanto queda hardcodeada para que el Task Scheduler corra sin
#   depender de profile/env vars del usuario que la creo.
$BackupPassword   = "BarAvenida_Backup_2026!"

# --- Helpers ----------------------------------------------------------------
function Escribir-Log {
    param([string]$Mensaje, [string]$Nivel = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $linea = "[$timestamp] [$Nivel] $Mensaje"
    Write-Host $linea
    Add-Content -Path $LogFile -Value $linea -Encoding UTF8
}

function Encriptar-ArchivoAES {
    # Lee $PathPlano, escribe $PathCifrado con formato:
    #   [16 bytes IV aleatorio][cipher AES-256-CBC PKCS7]
    # Usa SHA256(password) como key de 32 bytes.
    param(
        [string]$PathPlano,
        [string]$PathCifrado,
        [string]$Password
    )

    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $key = $sha256.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Password))
    } finally {
        $sha256.Dispose()
    }

    $iv  = New-Object byte[] 16
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($iv)
    } finally {
        $rng.Dispose()
    }

    $aes = [System.Security.Cryptography.Aes]::Create()
    try {
        $aes.KeySize = 256
        $aes.Key     = $key
        $aes.IV      = $iv
        $aes.Mode    = [System.Security.Cryptography.CipherMode]::CBC
        $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7

        $inBytes   = [System.IO.File]::ReadAllBytes($PathPlano)
        $encryptor = $aes.CreateEncryptor()
        try {
            $cipher = $encryptor.TransformFinalBlock($inBytes, 0, $inBytes.Length)
        } finally {
            $encryptor.Dispose()
        }

        $out = New-Object byte[] (16 + $cipher.Length)
        [Array]::Copy($iv,     0, $out,  0, 16)
        [Array]::Copy($cipher, 0, $out, 16, $cipher.Length)
        [System.IO.File]::WriteAllBytes($PathCifrado, $out)
    } finally {
        $aes.Dispose()
    }
}

# --- Asegurar carpeta -------------------------------------------------------
if (-not (Test-Path $CarpetaBackups)) {
    New-Item -ItemType Directory -Path $CarpetaBackups -Force | Out-Null
}

try {
    $timestamp        = Get-Date -Format "yyyyMMdd_HHmmss"
    $archivoBackup    = Join-Path $CarpetaBackups "BarAvenida_$timestamp.bak"
    $archivoCifrado   = "$archivoBackup.aes"

    Escribir-Log "=========================================="
    Escribir-Log "Iniciando backup de $NombreBaseDatos"
    Escribir-Log "Destino plano:     $archivoBackup"
    Escribir-Log "Destino encriptado: $archivoCifrado"

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

    $tamanioBak = (Get-Item $archivoBackup).Length / 1MB
    Escribir-Log ("BACKUP DATABASE OK. Tamanio plano: {0:N2} MB" -f $tamanioBak)

    # --- Encriptar AES-256 -------------------------------------------------
    Escribir-Log "Encriptando con AES-256-CBC..."
    Encriptar-ArchivoAES -PathPlano $archivoBackup -PathCifrado $archivoCifrado -Password $BackupPassword

    if (-not (Test-Path $archivoCifrado)) {
        throw "No se genero el archivo encriptado: $archivoCifrado"
    }

    $tamanioAes = (Get-Item $archivoCifrado).Length / 1MB
    Escribir-Log ("Encriptacion OK. Tamanio cifrado: {0:N2} MB" -f $tamanioAes)

    # --- Borrar el .bak plano (NO dejar plain text en disco) ---------------
    Remove-Item $archivoBackup -Force
    Escribir-Log "Borrado .bak plano (solo queda el .bak.aes)"

    # --- Limpieza de backups viejos (.bak.aes) -----------------------------
    $limite = (Get-Date).AddDays(-$DiasRetencion)
    $viejos = Get-ChildItem -Path $CarpetaBackups -Filter "BarAvenida_*.bak.aes" |
              Where-Object { $_.LastWriteTime -lt $limite }

    if ($viejos.Count -gt 0) {
        Escribir-Log "Eliminando $($viejos.Count) backups con mas de $DiasRetencion dias..."
        $viejos | Remove-Item -Force
    }

    # --- Limpieza defensiva: cualquier .bak plano residual antiguo ---------
    # (por si quedaron de versiones < v1.9.0 o de un crash mid-encrypt)
    $planosViejos = Get-ChildItem -Path $CarpetaBackups -Filter "BarAvenida_*.bak" |
                    Where-Object { $_.Name -notlike "*.bak.aes" -and $_.LastWriteTime -lt $limite }
    if ($planosViejos.Count -gt 0) {
        Escribir-Log "Eliminando $($planosViejos.Count) .bak planos residuales..."
        $planosViejos | Remove-Item -Force
    }

    # --- Resumen ------------------------------------------------------------
    $todos = Get-ChildItem -Path $CarpetaBackups -Filter "BarAvenida_*.bak.aes"
    $totalMb = [math]::Round(($todos | Measure-Object Length -Sum).Sum / 1MB, 2)
    Escribir-Log "Backups actuales: $($todos.Count) archivos .bak.aes, $totalMb MB en disco"
    Escribir-Log "Backup OK"

    exit 0
}
catch {
    Escribir-Log "ERROR: $_" "ERROR"
    Escribir-Log $_.ScriptStackTrace "ERROR"
    exit 1
}
