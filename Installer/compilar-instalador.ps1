# ============================================================================
# Bar Avenida — Compilar instalador del servidor
# ----------------------------------------------------------------------------
# Requiere: Inno Setup 6+ instalado (jrsoftware.org/isinfo.php)
# Corre COMO ADMINISTRADOR para que Inno Setup pueda instalarse correctamente.
#
# Uso:
#   Clic derecho -> "Ejecutar con PowerShell" (como Admin)
#   O desde terminal admin:  .\compilar-instalador.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

function Escribir-Log {
    param([string]$Msg, [string]$Color = "White")
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Msg" -ForegroundColor $Color
}

Set-Location $PSScriptRoot

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
$publishDir = "F:\BarAvenida\BarAvenida.API\publish-installer"
if (-not (Test-Path "$publishDir\BarAvenida.API.exe")) {
    Escribir-Log "Backend no publicado. Ejecutando dotnet publish..." "Yellow"
    Push-Location "F:\BarAvenida\BarAvenida.API"
    dotnet publish -c Release -r win-x64 --self-contained true -o publish-installer
    Pop-Location
    if ($LASTEXITCODE -ne 0) {
        Escribir-Log "ERROR: dotnet publish fallo." "Red"
        exit 1
    }
    Escribir-Log "Backend publicado correctamente." "Green"
} else {
    Escribir-Log "Backend ya publicado: $publishDir" "Green"
}

# --- 3. Compilar el instalador -----------------------------------------------
Escribir-Log "Compilando instalador..." "Cyan"
& $iscc "F:\BarAvenida\Installer\BarAvenidaServer.iss"

if ($LASTEXITCODE -eq 0) {
    $exe = "F:\BarAvenida\Installer\dist\Bar Avenida Server Setup 1.0.0.exe"
    if (Test-Path $exe) {
        $sizeMB = [math]::Round((Get-Item $exe).Length / 1MB, 0)
        Escribir-Log "" "White"
        Escribir-Log "========================================" "Green"
        Escribir-Log "  INSTALADOR GENERADO EXITOSAMENTE" "Green"
        Escribir-Log "========================================" "Green"
        Escribir-Log "  Archivo: $exe" "White"
        Escribir-Log "  Tamano:  $sizeMB MB" "White"
        Escribir-Log "========================================" "Green"
    }
} else {
    Escribir-Log "ERROR: iscc salio con codigo $LASTEXITCODE" "Red"
    exit 1
}
