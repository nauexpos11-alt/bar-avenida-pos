# ============================================================================
# Bar Avenida - Preparar NAU (PC admin de Coronado en casa)
# Instala/configura todo lo necesario para correr release-total.ps1 desde aqui.
#
# Uso (PowerShell ADMINISTRADOR):
#   powershell -ExecutionPolicy Bypass -File preparar-nau.ps1
# ============================================================================

$ErrorActionPreference = "Continue"

$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Write-Host "Hay que correr esto como Administrador." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Magenta
Write-Host "  PREPARAR NAU PARA RELEASES BAR AVENIDA" -ForegroundColor Magenta
Write-Host "================================================" -ForegroundColor Magenta
Write-Host ""

# ──────────────────────────────────────────────────────────
# 1. ExecutionPolicy para npm.ps1
# ──────────────────────────────────────────────────────────
Write-Host "[1/5] Fixing ExecutionPolicy para npm.ps1..." -ForegroundColor Yellow
$current = Get-ExecutionPolicy -Scope CurrentUser
Write-Host "  Politica actual (CurrentUser): $current" -ForegroundColor Gray
if ($current -eq "Undefined" -or $current -eq "Restricted") {
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    Write-Host "  [OK] Cambiada a RemoteSigned (CurrentUser)" -ForegroundColor Green
} else {
    Write-Host "  [OK] Ya esta en $current (no se cambia)" -ForegroundColor Green
}
Write-Host ""

# ──────────────────────────────────────────────────────────
# 2. Git safe.directory
# ──────────────────────────────────────────────────────────
Write-Host "[2/5] Configurando git safe.directory..." -ForegroundColor Yellow
git config --global --add safe.directory E:/bar-avenida-pos 2>&1 | Out-Null
git config --global --add safe.directory "E:\bar-avenida-pos" 2>&1 | Out-Null
Write-Host "  [OK] E:/bar-avenida-pos como safe.directory" -ForegroundColor Green
Write-Host ""

# ──────────────────────────────────────────────────────────
# 3. GitHub CLI
# ──────────────────────────────────────────────────────────
Write-Host "[3/5] Verificando GitHub CLI..." -ForegroundColor Yellow

# El comando 'gh' puede no estar en PATH si recien se instalo. Buscar manualmente.
$ghPaths = @(
    "C:\Program Files\GitHub CLI\gh.exe",
    "C:\Program Files (x86)\GitHub CLI\gh.exe",
    "$env:LOCALAPPDATA\Programs\GitHub CLI\gh.exe"
)
$ghExe = $ghPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $ghExe) {
    Write-Host "  GitHub CLI no encontrado. Instalando via winget..." -ForegroundColor Yellow
    winget install --id GitHub.cli --silent --accept-source-agreements --accept-package-agreements
    Start-Sleep -Seconds 3
    $ghExe = $ghPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if ($ghExe) {
    Write-Host "  [OK] $ghExe" -ForegroundColor Green
    $version = & $ghExe --version 2>&1 | Select-Object -First 1
    Write-Host "  $version" -ForegroundColor Gray

    # Refrescar PATH de la sesion actual
    $env:PATH = "$env:PATH;$(Split-Path $ghExe -Parent)"

    # Chequear auth
    $authStatus = & $ghExe auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [INFO] gh NO esta autenticado. Lanzando 'gh auth login'..." -ForegroundColor Yellow
        Write-Host "  Sigue las instrucciones que aparecen (escoge GitHub.com, HTTPS, Login with a web browser)" -ForegroundColor Gray
        & $ghExe auth login
    } else {
        Write-Host "  [OK] gh autenticado" -ForegroundColor Green
    }
} else {
    Write-Host "  [FAIL] No se pudo instalar GitHub CLI." -ForegroundColor Red
    Write-Host "  Instalalo manualmente desde https://cli.github.com/" -ForegroundColor Yellow
}
Write-Host ""

# ──────────────────────────────────────────────────────────
# 4. Inno Setup (lo auto-instalara compilar-instalador.ps1 si falta)
# ──────────────────────────────────────────────────────────
Write-Host "[4/5] Verificando Inno Setup..." -ForegroundColor Yellow
$isccPaths = @(
    "C:\Program Files (x86)\Inno Setup 6\iscc.exe",
    "C:\Program Files\Inno Setup 6\iscc.exe",
    "C:\Users\$env:USERNAME\AppData\Local\Programs\Inno Setup 6\iscc.exe"
)
$iscc = $isccPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($iscc) {
    Write-Host "  [OK] $iscc" -ForegroundColor Green
} else {
    Write-Host "  No encontrado. Instalando via winget..." -ForegroundColor Yellow
    winget install --id JRSoftware.InnoSetup --silent --accept-source-agreements --accept-package-agreements
    Start-Sleep -Seconds 3
    $iscc = $isccPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($iscc) {
        Write-Host "  [OK] $iscc" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] No se pudo instalar Inno Setup. Hazlo manual:" -ForegroundColor Red
        Write-Host "  https://jrsoftware.org/isinfo.php" -ForegroundColor Yellow
    }
}
Write-Host ""

# ──────────────────────────────────────────────────────────
# 5. Resumen final
# ──────────────────────────────────────────────────────────
Write-Host "[5/5] Resumen final..." -ForegroundColor Yellow
Write-Host ""

Write-Host "  .NET SDK:    " -NoNewline
try {
    $v = & dotnet --version 2>&1
    Write-Host $v -ForegroundColor Green
} catch { Write-Host "[FALTA]" -ForegroundColor Red }

Write-Host "  Node:        " -NoNewline
try {
    $v = & node --version 2>&1
    Write-Host $v -ForegroundColor Green
} catch { Write-Host "[FALTA]" -ForegroundColor Red }

Write-Host "  npm:         " -NoNewline
try {
    $v = & npm --version 2>&1
    Write-Host $v -ForegroundColor Green
} catch { Write-Host "[FALTA o ExecutionPolicy aun bloquea]" -ForegroundColor Red }

Write-Host "  GitHub CLI:  " -NoNewline
if ($ghExe) { Write-Host "$($ghExe.Split('\')[-1]) en $($ghExe.Substring(0, [Math]::Min(50, $ghExe.Length)))..." -ForegroundColor Green }
else { Write-Host "[FALTA]" -ForegroundColor Red }

Write-Host "  Inno Setup:  " -NoNewline
if ($iscc) { Write-Host "OK" -ForegroundColor Green } else { Write-Host "[FALTA]" -ForegroundColor Red }

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  NAU PREPARADO" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "PROXIMO PASO - lanzar primera release:" -ForegroundColor Yellow
Write-Host "  E:\bar-avenida-pos\Scripts\release-total.ps1 -Version 1.2.0" -ForegroundColor Cyan
Write-Host ""
Write-Host "Nota: si npm o gh siguen sin reconocerse, CIERRA esta PowerShell" -ForegroundColor Gray
Write-Host "y abre una NUEVA para que el PATH se refresque." -ForegroundColor Gray
Write-Host ""
