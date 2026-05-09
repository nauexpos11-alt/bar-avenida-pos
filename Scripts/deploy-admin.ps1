# ============================================================================
# Bar Avenida — Deploy del Admin Web
# ----------------------------------------------------------------------------
# Pasos automaticos:
#   1. Limpia dist y wwwroot/admin viejo
#   2. Build del Admin (vite build → outDir = wwwroot/admin)
#   3. Republica el backend (incluye el wwwroot/admin)
#   4. Reinicia el servicio Windows
#
# Uso (PowerShell admin):
#   F:\BarAvenida\Scripts\deploy-admin.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Write-Host "Hay que correr esto como Administrador." -ForegroundColor Red
    exit 1
}

$AdminDir      = "F:\BarAvenida\BarAvenida.Admin"
$ApiDir        = "F:\BarAvenida\BarAvenida.API"
$WwwrootApi    = Join-Path $ApiDir "wwwroot\admin"
$ProdServerWww = "C:\Program Files\Bar Avenida\Server\wwwroot"
$tieneProd     = Test-Path "C:\Program Files\Bar Avenida\Server\BarAvenida.API.exe"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY ADMIN WEB" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Limpiar
Write-Host "[1/3] Limpiando wwwroot/admin..." -ForegroundColor Yellow
Remove-Item -Recurse -Force (Join-Path $AdminDir "dist") -ErrorAction SilentlyContinue
if (Test-Path $WwwrootApi) {
    Remove-Item -Recurse -Force $WwwrootApi
}
Write-Host "[OK] Limpieza" -ForegroundColor Green
Write-Host ""

# 2. Build directo a wwwroot/admin via vite outDir
Write-Host "[2/3] Compilando Admin con Vite (outDir = wwwroot/admin)..." -ForegroundColor Yellow
Push-Location $AdminDir
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build de Admin fallo." -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "[OK] Admin compilado, $((Get-ChildItem $WwwrootApi -Recurse -File).Count) archivos en $WwwrootApi" -ForegroundColor Green
Write-Host ""

# 2.5 Mirror a Program Files (donde corre el servicio Windows real)
if ($tieneProd) {
    Write-Host "[2.5/3] Copiando wwwroot/admin a Program Files..." -ForegroundColor Yellow
    Stop-Service -Name "BarAvenidaAPI" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    $dstProd = Join-Path $ProdServerWww "admin"
    if (Test-Path $dstProd) { Remove-Item -Recurse -Force $dstProd }
    New-Item -ItemType Directory -Path $dstProd -Force | Out-Null
    Copy-Item -Recurse -Force "$WwwrootApi\*" $dstProd
    Write-Host "[OK] Mirror a Program Files completo" -ForegroundColor Green
    Write-Host ""
}

# 3. Republicar backend + reiniciar servicio
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
Write-Host "  Admin web accesible en:" -ForegroundColor Cyan
Write-Host "    Local:  http://localhost:7000/admin/" -ForegroundColor White
Write-Host "    Red:    http://192.168.100.10:7000/admin/" -ForegroundColor White
Write-Host ""
Write-Host "  Para abrir el Admin desktop:" -ForegroundColor Yellow
Write-Host "    Doble-click en el icono 'Bar Avenida Admin' del escritorio" -ForegroundColor Gray
Write-Host ""
