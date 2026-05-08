# ============================================================================
# Bar Avenida - Preparar PC para operacion (casa o bar)
# ----------------------------------------------------------------------------
# Configura todo lo necesario para que las tablets/celulares se conecten
# desde cualquier red WiFi:
#   1. Abre firewall puerto 7000 desde la red local
#   2. Detecta IP local actual de la PC
#   3. Actualiza .env de Tablet/KDS con esa IP
#   4. Recompila y redeploya Tablet + KDS
#   5. Imprime las URLs que las meseras deben usar
#   6. Verifica conectividad
#
# Uso (PowerShell admin):
#   F:\BarAvenida\Scripts\preparar-pc.ps1
#
# Cuando ejecutar:
# - Antes de probar en tu casa
# - Al llegar al bar y conectar a la WiFi del bar (importante)
# - Cualquier vez que la IP de la PC cambie
# ============================================================================

$ErrorActionPreference = "Stop"

$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Write-Host "Hay que correr esto como Administrador." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Magenta
Write-Host "  PREPARAR PC BAR AVENIDA" -ForegroundColor Magenta
Write-Host "================================================" -ForegroundColor Magenta
Write-Host ""

# ============================================================================
# 1. Detectar IP local
# ============================================================================
Write-Host "[1/6] Detectando IP local..." -ForegroundColor Yellow

$ipLocal = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
        $_.PrefixOrigin -in @('Dhcp','Manual') -and
        $_.IPAddress -notlike "169.254.*" -and
        $_.IPAddress -ne "127.0.0.1"
    } |
    Sort-Object InterfaceMetric |
    Select-Object -First 1).IPAddress

if (-not $ipLocal) {
    Write-Host "[ERROR] No se detecto IP local. Conecta a WiFi/Ethernet primero." -ForegroundColor Red
    exit 1
}

Write-Host "[OK] IP local detectada: $ipLocal" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 2. Configurar firewall puerto 7000
# ============================================================================
Write-Host "[2/6] Configurando firewall (puerto 7000 entrante)..." -ForegroundColor Yellow

$reglaNombre = "Bar Avenida API (puerto 7000)"
Get-NetFirewallRule -DisplayName $reglaNombre -ErrorAction SilentlyContinue | Remove-NetFirewallRule

New-NetFirewallRule -DisplayName $reglaNombre `
    -Direction Inbound -Action Allow -Protocol TCP -LocalPort 7000 `
    -Profile Any -Enabled True | Out-Null

Write-Host "[OK] Firewall abierto en puerto 7000 desde cualquier red" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 3. Actualizar .env de Tablet con la IP detectada
# ============================================================================
Write-Host "[3/6] Actualizando configuracion de Tablet/KDS para IP $ipLocal..." -ForegroundColor Yellow

$tabletEnv = "F:\BarAvenida\BarAvenida.Tablet\.env"
$kdsEnv    = "F:\BarAvenida\BarAvenida.KDS\.env"
$adminEnv  = "F:\BarAvenida\BarAvenida.Admin\.env"

@"
VITE_API_URL=http://$ipLocal:7000
"@ | Set-Content -Path $tabletEnv -Encoding UTF8

@"
VITE_API_URL=http://$ipLocal:7000
"@ | Set-Content -Path $kdsEnv -Encoding UTF8

@"
VITE_API_URL=http://$ipLocal:7000
"@ | Set-Content -Path $adminEnv -Encoding UTF8

Write-Host "[OK] .env actualizados a http://${ipLocal}:7000" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 4. Recompilar Tablet + KDS + Admin (los frontends usan VITE_API_URL en build)
# ============================================================================
Write-Host "[4/6] Recompilando frontends con la IP nueva..." -ForegroundColor Yellow

# IMPORTANTE: el servicio Windows corre desde C:\Program Files\Bar Avenida\Server\.
# Hay que copiar el wwwroot a las DOS ubicaciones (la de desarrollo y la de produccion).
$prodServerWww = "C:\Program Files\Bar Avenida\Server\wwwroot"
$tieneProdServer = Test-Path $prodServerWww

function CopiarFrontendDist {
    param([string]$SrcDist, [string]$NombreFrontend)
    $dst1 = "F:\BarAvenida\BarAvenida.API\wwwroot\$NombreFrontend"
    Remove-Item -Recurse -Force $dst1 -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Path $dst1 -Force | Out-Null
    Copy-Item -Recurse -Force "$SrcDist\*" $dst1

    if ($script:tieneProdServer) {
        $dst2 = "$script:prodServerWww\$NombreFrontend"
        Remove-Item -Recurse -Force $dst2 -ErrorAction SilentlyContinue
        New-Item -ItemType Directory -Path $dst2 -Force | Out-Null
        Copy-Item -Recurse -Force "$SrcDist\*" $dst2
    }
}

# Tablet
Push-Location F:\BarAvenida\BarAvenida.Tablet
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npm run build | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "Build Tablet fallo" -ForegroundColor Red; exit 1 }
CopiarFrontendDist "F:\BarAvenida\BarAvenida.Tablet\dist" "tablet"
Pop-Location
Write-Host "[OK] Tablet recompilada" -ForegroundColor Green

# KDS
Push-Location F:\BarAvenida\BarAvenida.KDS
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npm run build | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "Build KDS fallo" -ForegroundColor Red; exit 1 }
if (Test-Path "F:\BarAvenida\BarAvenida.KDS\dist") {
    CopiarFrontendDist "F:\BarAvenida\BarAvenida.KDS\dist" "kds"
}
Pop-Location
Write-Host "[OK] KDS recompilado" -ForegroundColor Green

# Admin
Push-Location F:\BarAvenida\BarAvenida.Admin
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npm run build | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "Build Admin fallo" -ForegroundColor Red; exit 1 }
if (Test-Path "F:\BarAvenida\BarAvenida.Admin\dist") {
    CopiarFrontendDist "F:\BarAvenida\BarAvenida.Admin\dist" "admin"
}
Pop-Location
Write-Host "[OK] Admin recompilado" -ForegroundColor Green

if ($tieneProdServer) {
    Write-Host "[OK] Frontends copiados tambien a Program Files (donde corre el servicio real)" -ForegroundColor Green
}
Write-Host ""

# ============================================================================
# 5. Republicar backend y reiniciar servicio
# ============================================================================
Write-Host "[5/6] Republicando backend y reiniciando servicio..." -ForegroundColor Yellow
Stop-Service -Name "BarAvenidaAPI" -Force -ErrorAction SilentlyContinue
Push-Location F:\BarAvenida\BarAvenida.API
Remove-Item -Recurse -Force bin\Release -ErrorAction SilentlyContinue
dotnet publish -c Release -o bin\Release\net8.0\publish | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "Publish fallo" -ForegroundColor Red; exit 1 }
Pop-Location
Start-Service -Name "BarAvenidaAPI"
Start-Sleep -Seconds 3

$svc = Get-Service -Name "BarAvenidaAPI"
if ($svc.Status -ne "Running") {
    Write-Host "[ERROR] Servicio no arranco" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Servicio Running" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 6. Verificar conectividad desde la propia PC
# ============================================================================
Write-Host "[6/6] Verificando que el sistema responde..." -ForegroundColor Yellow

try {
    $r = Invoke-WebRequest "http://${ipLocal}:7000/admin/" -UseBasicParsing -TimeoutSec 5
    if ($r.StatusCode -eq 200) {
        Write-Host "[OK] http://${ipLocal}:7000/admin/ responde 200" -ForegroundColor Green
    }
} catch {
    Write-Host "[FAIL] http://${ipLocal}:7000/admin/ no responde: $_" -ForegroundColor Red
}

try {
    $r = Invoke-WebRequest "http://${ipLocal}:7000/api/sistema/hora" -UseBasicParsing -TimeoutSec 5
    Write-Host "[OK] /api/sistema/hora responde" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] /api/sistema/hora no responde" -ForegroundColor Red
}

# ============================================================================
# RESUMEN FINAL
# ============================================================================
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  PC LISTA PARA OPERACION" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "IP de esta PC: " -NoNewline
Write-Host $ipLocal -ForegroundColor Cyan
Write-Host ""
Write-Host "URLs para conectar tablets/celulares (deben estar en la MISMA WiFi):" -ForegroundColor Yellow
Write-Host ""
Write-Host "  TABLET MESERAS:    http://${ipLocal}:7000/tablet/" -ForegroundColor Cyan
Write-Host "  ADMIN WEB:         http://${ipLocal}:7000/admin/"  -ForegroundColor Cyan
Write-Host "  KDS BARMAN:        http://${ipLocal}:7000/kds"     -ForegroundColor Cyan
Write-Host ""
Write-Host "PASOS PARA INSTALAR EN CELULAR DE MESERA:" -ForegroundColor Yellow
Write-Host "  1. Conectar al MISMO WiFi que esta PC" -ForegroundColor Gray
Write-Host "  2. Abrir Chrome y entrar a: http://${ipLocal}:7000/tablet/" -ForegroundColor Gray
Write-Host "  3. Menu Chrome (...) -> 'Anadir a pantalla de inicio'" -ForegroundColor Gray
Write-Host ""
Write-Host "Si las tablets/celulares no pueden conectarse:" -ForegroundColor Yellow
Write-Host "  - Verifica que esten en la MISMA red WiFi (no 5GHz vs 2.4GHz separados)" -ForegroundColor Gray
Write-Host "  - Verifica router: 'AP Isolation' debe estar DESACTIVADO" -ForegroundColor Gray
Write-Host "  - Vuelve a correr este script si la IP de la PC cambia" -ForegroundColor Gray
Write-Host ""
