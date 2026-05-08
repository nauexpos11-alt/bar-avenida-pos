# ============================================================================
# Bar Avenida — Deploy de la Tablet PWA
# ----------------------------------------------------------------------------
# Pasos automaticos:
#   1. Build de la Tablet (vite build)
#   2. Copia dist/ a wwwroot/tablet/ del backend
#   3. Republica el backend (incluye el wwwroot/tablet)
#   4. Reinicia el servicio Windows
#
# Uso (PowerShell admin):
#   F:\BarAvenida\Scripts\deploy-tablet.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Write-Host "Hay que correr esto como Administrador." -ForegroundColor Red
    exit 1
}

$TabletDir   = "F:\BarAvenida\BarAvenida.Tablet"
$ApiDir      = "F:\BarAvenida\BarAvenida.API"
$DistDir     = Join-Path $TabletDir "dist"
$WwwrootApi  = Join-Path $ApiDir   "wwwroot\tablet"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY TABLET PWA" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Build Tablet ─────────────────────────────────────────────────────────
Write-Host "[1/4] Compilando Tablet con Vite..." -ForegroundColor Yellow
Push-Location $TabletDir
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build de Tablet fallo." -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "[OK] Tablet compilada en $DistDir" -ForegroundColor Green
Write-Host ""

# ── 2. Copiar dist a wwwroot/tablet ─────────────────────────────────────────
Write-Host "[2/4] Copiando dist/ a wwwroot\tablet del backend..." -ForegroundColor Yellow
if (Test-Path $WwwrootApi) {
    Remove-Item -Recurse -Force $WwwrootApi
}
New-Item -ItemType Directory -Path $WwwrootApi -Force | Out-Null
Copy-Item -Recurse -Force "$DistDir\*" $WwwrootApi
Write-Host "[OK] $((Get-ChildItem $WwwrootApi -Recurse -File).Count) archivos copiados" -ForegroundColor Green
Write-Host ""

# ── 3. Detener servicio + republicar backend ────────────────────────────────
Write-Host "[3/4] Republicando backend..." -ForegroundColor Yellow
Stop-Service -Name "BarAvenidaAPI" -Force -ErrorAction SilentlyContinue
Push-Location $ApiDir
Remove-Item -Recurse -Force bin\Release -ErrorAction SilentlyContinue
dotnet publish -c Release -o bin\Release\net8.0\publish
if ($LASTEXITCODE -ne 0) {
    Write-Host "Publish fallo." -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "[OK] Backend republicado" -ForegroundColor Green
Write-Host ""

# ── 4. Arrancar servicio ────────────────────────────────────────────────────
Write-Host "[4/4] Arrancando servicio..." -ForegroundColor Yellow
Start-Service -Name "BarAvenidaAPI"
Start-Sleep -Seconds 3
$svc = Get-Service -Name "BarAvenidaAPI"
if ($svc.Status -eq "Running") {
    Write-Host "[OK] Servicio Running" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Servicio no arranco. Status: $($svc.Status)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ── Resumen ─────────────────────────────────────────────────────────────────
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  DEPLOY COMPLETADO" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  La Tablet PWA esta accesible en:" -ForegroundColor Cyan
Write-Host "    Local:  http://localhost:7000/tablet/" -ForegroundColor White
Write-Host "    Red:    http://192.168.100.10:7000/tablet/" -ForegroundColor White
Write-Host ""
Write-Host "  Para probarla en celulares de meseras:" -ForegroundColor Yellow
Write-Host "    1. Conectar al WiFi del bar" -ForegroundColor Gray
Write-Host "    2. Abrir Chrome y entrar a la URL Red" -ForegroundColor Gray
Write-Host "    3. Menu Chrome -> 'Anadir a pantalla de inicio'" -ForegroundColor Gray
Write-Host ""
