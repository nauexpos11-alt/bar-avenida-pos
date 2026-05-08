# ============================================================================
# Bar Avenida — Deploy del KDS Web
# ----------------------------------------------------------------------------
# Pasos automaticos:
#   1. Build del KDS (vite build)
#   2. Copia dist/ a wwwroot/kds/ del backend
#   3. Republica el backend
#   4. Reinicia el servicio Windows
#
# Uso (PowerShell admin):
#   F:\BarAvenida\Scripts\deploy-kds.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Write-Host "Hay que correr esto como Administrador." -ForegroundColor Red
    exit 1
}

$KdsDir      = "F:\BarAvenida\BarAvenida.KDS"
$ApiDir      = "F:\BarAvenida\BarAvenida.API"
$WwwrootApi  = Join-Path $ApiDir "wwwroot\kds"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY KDS WEB" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Limpiar dist viejo y wwwroot/kds para evitar archivos basura.
# Vite escribe directo a wwwroot/kds (segun su outDir).
Write-Host "[1/3] Limpiando dist viejo y wwwroot/kds..." -ForegroundColor Yellow
Remove-Item -Recurse -Force (Join-Path $KdsDir "dist") -ErrorAction SilentlyContinue
if (Test-Path $WwwrootApi) {
    Remove-Item -Recurse -Force $WwwrootApi
}
Write-Host "[OK] Limpieza" -ForegroundColor Green
Write-Host ""

# Build directo a wwwroot/kds via vite outDir
Write-Host "[2/3] Compilando KDS con Vite (outDir = wwwroot/kds)..." -ForegroundColor Yellow
Push-Location $KdsDir
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build de KDS fallo." -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "[OK] KDS compilado, $((Get-ChildItem $WwwrootApi -Recurse -File).Count) archivos en $WwwrootApi" -ForegroundColor Green
Write-Host ""

# 3. Republicar backend
Write-Host "[3/3] Republicando backend y reiniciando servicio..." -ForegroundColor Yellow
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

Write-Host "=========================================" -ForegroundColor Green
Write-Host "  DEPLOY COMPLETADO" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  KDS web accesible en:" -ForegroundColor Cyan
Write-Host "    Local:  http://localhost:7000/kds" -ForegroundColor White
Write-Host "    Red:    http://192.168.100.10:7000/kds" -ForegroundColor White
Write-Host ""
Write-Host "  Para abrir el KDS desktop:" -ForegroundColor Yellow
Write-Host "    Doble-click en el icono 'Bar Avenida KDS' del escritorio" -ForegroundColor Gray
Write-Host ""
