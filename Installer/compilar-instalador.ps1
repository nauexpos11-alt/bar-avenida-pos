# ============================================================================
# Bar Avenida — Compilar instalador del servidor
# Auto-detecta si esta en F:\BarAvenida (PC bar) o E:\bar-avenida-pos (PC admin).
# Auto-instala Inno Setup via winget si no esta.
# ============================================================================

$ErrorActionPreference = "Stop"

function Escribir-Log {
    param([string]$Msg, [string]$Color = "White")
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Msg" -ForegroundColor $Color
}

# Auto-detectar la raiz del repo (donde esta este script)
$InstallerDir = $PSScriptRoot
$RepoRoot     = Split-Path $InstallerDir -Parent
$ApiDir       = Join-Path $RepoRoot "BarAvenida.API"
$PublishDir   = Join-Path $ApiDir "publish-installer"
$DistDir      = Join-Path $InstallerDir "dist"

Escribir-Log "Repo detectado:   $RepoRoot" "Cyan"
Escribir-Log "Installer dir:    $InstallerDir" "Cyan"
Escribir-Log "Backend publish:  $PublishDir" "Cyan"

# --- 1. Verificar/instalar Inno Setup ----------------------------------------
$isccPaths = @(
    "C:\Program Files (x86)\Inno Setup 6\iscc.exe",
    "C:\Program Files\Inno Setup 6\iscc.exe",
    "C:\Users\$env:USERNAME\AppData\Local\Programs\Inno Setup 6\iscc.exe"
)

$iscc = $isccPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $iscc) {
    Escribir-Log "Inno Setup no encontrado. Instalando via winget..." "Yellow"
    winget install --id JRSoftware.InnoSetup --silent --accept-source-agreements --accept-package-agreements
    Start-Sleep -Seconds 3
    $iscc = $isccPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if (-not $iscc) {
    Escribir-Log "ERROR: Inno Setup no se pudo instalar automaticamente." "Red"
    Escribir-Log "Instala manualmente desde: https://jrsoftware.org/isinfo.php" "Yellow"
    Escribir-Log "Luego vuelve a correr este script." "Yellow"
    Read-Host "Presiona Enter para salir"
    exit 1
}

Escribir-Log "Inno Setup: $iscc" "Green"

# --- 2. Verificar que el backend fue publicado --------------------------------
if (-not (Test-Path "$PublishDir\BarAvenida.API.exe")) {
    Escribir-Log "Backend no publicado. Ejecutando dotnet publish..." "Yellow"
    Push-Location $ApiDir
    try {
        # Limpiar bin/obj para evitar MSB4018 con SDK 10.x preview
        Remove-Item -Recurse -Force "bin", "obj" -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force $PublishDir -ErrorAction SilentlyContinue

        dotnet publish -c Release -r win-x64 --self-contained true -o publish-installer
    } finally {
        Pop-Location
    }
    if ($LASTEXITCODE -ne 0) {
        Escribir-Log "ERROR: dotnet publish fallo." "Red"
        exit 1
    }
    Escribir-Log "Backend publicado correctamente." "Green"
} else {
    Escribir-Log "Backend ya publicado: $PublishDir" "Green"
}

# --- 3. Compilar el instalador -----------------------------------------------
Escribir-Log "Compilando instalador con Inno Setup..." "Cyan"
Push-Location $InstallerDir
try {
    & $iscc "BarAvenidaServer.iss"
} finally {
    Pop-Location
}

if ($LASTEXITCODE -eq 0) {
    $exe = Get-ChildItem $DistDir -Filter "Bar Avenida Server Setup *.exe" -ErrorAction SilentlyContinue |
           Sort-Object LastWriteTime -Descending |
           Select-Object -First 1
    if ($exe) {
        $sizeMB = [math]::Round($exe.Length / 1MB, 0)
        Escribir-Log "" "White"
        Escribir-Log "========================================" "Green"
        Escribir-Log "  INSTALADOR GENERADO EXITOSAMENTE" "Green"
        Escribir-Log "========================================" "Green"
        Escribir-Log "  Archivo: $($exe.FullName)" "White"
        Escribir-Log "  Tamano:  $sizeMB MB" "White"
        Escribir-Log "========================================" "Green"
    }
} else {
    Escribir-Log "ERROR: iscc salio con codigo $LASTEXITCODE" "Red"
    exit 1
}
