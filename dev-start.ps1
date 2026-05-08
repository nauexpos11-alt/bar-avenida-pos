# ============================================
# Bar Avenida POS - Launcher de desarrollo
# Levanta backend + tablet + admin en 3 ventanas
# Uso: cd F:\BarAvenida ; .\dev-start.ps1
# Flag: -Reset  (limpia bin/obj del backend antes)
# ============================================

param(
    [switch]$Reset
)

$root = "F:\BarAvenida"

Write-Host ""
Write-Host "Bar Avenida POS - dev launcher" -ForegroundColor Yellow
Write-Host ""

# 1. Matar instancia previa del backend si existe
$proc = Get-Process -Name "BarAvenida.API" -ErrorAction SilentlyContinue
if ($proc) {
    Write-Host "[!] Matando proceso BarAvenida.API previo..." -ForegroundColor DarkYellow
    $proc | Stop-Process -Force
    Start-Sleep -Seconds 1
}

# 2. Reset cache si se pidio
if ($Reset) {
    Write-Host "[*] Limpiando bin/obj del backend..." -ForegroundColor DarkCyan
    Remove-Item -Recurse -Force "$root\BarAvenida.API\bin","$root\BarAvenida.API\obj" -ErrorAction SilentlyContinue
}

# 3. Backend en ventana nueva
Write-Host "[OK] Lanzando BACKEND (puerto 7000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root\BarAvenida.API' ; Write-Host '== BACKEND ==' -ForegroundColor Yellow ; dotnet run"

Start-Sleep -Seconds 2

# 4. Tablet en ventana nueva
Write-Host "[OK] Lanzando TABLET (puerto 3002)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root\BarAvenida.Tablet' ; Write-Host '== TABLET ==' -ForegroundColor Yellow ; npm run dev"

Start-Sleep -Seconds 1

# 5. Admin en ventana nueva
Write-Host "[OK] Lanzando ADMIN..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$root\BarAvenida.Admin' ; Write-Host '== ADMIN ==' -ForegroundColor Yellow ; npm run dev"

Write-Host ""
Write-Host "Tres ventanas lanzadas. Espera ~10s a que arranquen." -ForegroundColor Cyan
Write-Host ""
Write-Host "URLs:" -ForegroundColor Gray
Write-Host "   Backend  : https://localhost:7000/swagger" -ForegroundColor Gray
Write-Host "   Tablet   : http://localhost:3002" -ForegroundColor Gray
Write-Host "   Admin    : ver puerto en su ventana, suele ser 5173 o 3000" -ForegroundColor Gray
Write-Host ""
Write-Host "Para apagar todo: cierra las 3 ventanas, o:" -ForegroundColor DarkGray
Write-Host "   taskkill /F /IM BarAvenida.API.exe /T" -ForegroundColor DarkGray
Write-Host "   Get-Process node ^| Stop-Process -Force" -ForegroundColor DarkGray
Write-Host ""
