# Recompilar KDS Electron e instalar
$ErrorActionPreference = "Stop"

# 1. Cerrar KDS si esta abierto
Write-Host "[1/3] Cerrando KDS si esta corriendo..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -like "*Bar Avenida KDS*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 2. Build del .exe
Write-Host "[2/3] Compilando KDS Desktop..." -ForegroundColor Yellow
Push-Location F:\BarAvenida\BarAvenida.KDS.Desktop
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build fallo." -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "[OK] KDS Desktop compilado" -ForegroundColor Green

# 3. Lanzar el instalador
Write-Host "[3/3] Lanzando instalador del KDS..." -ForegroundColor Yellow
$setup = "F:\BarAvenida\BarAvenida.KDS.Desktop\dist\Bar Avenida KDS Setup 1.1.0.exe"
if (Test-Path $setup) {
    Write-Host "Abre el wizard del instalador. Sigue siguiente, sigueinte, instalar." -ForegroundColor Cyan
    Start-Process $setup
} else {
    Write-Host "ERROR: no se encontro $setup" -ForegroundColor Red
    exit 1
}
