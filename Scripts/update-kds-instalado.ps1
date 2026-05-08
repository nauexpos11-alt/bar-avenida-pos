# Recompilar KDS Desktop (solo unpacked, sin instalador) y copiar encima de la version instalada.
# Evita el problema de 7-Zip con antivirus.
$ErrorActionPreference = "Stop"

$Origen  = "F:\BarAvenida\BarAvenida.KDS.Desktop\dist\win-unpacked"
$Destino = "G:\App Bar Avenida\Bar Avenida KDS"

# 1. Cerrar KDS si esta abierto
Write-Host "[1/4] Cerrando KDS..." -ForegroundColor Yellow
Get-Process | Where-Object { $_.ProcessName -like "*Bar Avenida KDS*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 2. Build unpacked (no instalador)
Write-Host "[2/4] Compilando KDS Desktop (unpacked)..." -ForegroundColor Yellow
Push-Location F:\BarAvenida\BarAvenida.KDS.Desktop
Remove-Item -Recurse -Force dist\win-unpacked -ErrorAction SilentlyContinue
npm run build:dir
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build fallo." -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "[OK] KDS Desktop compilado" -ForegroundColor Green

# 3. Copiar encima de la version instalada
Write-Host "[3/4] Copiando archivos encima de la version instalada..." -ForegroundColor Yellow
if (-not (Test-Path $Destino)) {
    Write-Host "ERROR: no existe $Destino. Instala primero el Setup 1.1.0.exe." -ForegroundColor Red
    exit 1
}
Copy-Item -Recurse -Force "$Origen\*" $Destino
Write-Host "[OK] Archivos copiados a $Destino" -ForegroundColor Green

# 4. Limpiar storage del Electron del KDS para evitar caches viejos
Write-Host "[4/4] Limpiando storage del Electron del KDS..." -ForegroundColor Yellow
Remove-Item -Recurse -Force "$env:APPDATA\Bar Avenida KDS" -ErrorAction SilentlyContinue
Write-Host "[OK] Storage limpio" -ForegroundColor Green

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  KDS ACTUALIZADO" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Abre el icono 'Bar Avenida KDS' del escritorio para validar." -ForegroundColor Cyan
