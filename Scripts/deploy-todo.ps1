# ============================================================================
# Bar Avenida - Deploy completo en cascada
# ----------------------------------------------------------------------------
# Compila y deploya TODO en orden:
#   1. Tablet PWA  -> wwwroot/tablet
#   2. Admin Web   -> wwwroot/admin
#   3. KDS Web     -> wwwroot/kds
#   4. Backend     -> publish + restart servicio
#
# Uso (PowerShell admin):
#   F:\BarAvenida\Scripts\deploy-todo.ps1
#
# Si quieres deployar solo uno, llama al script especifico:
#   F:\BarAvenida\Scripts\deploy-admin.ps1
#   F:\BarAvenida\Scripts\deploy-tablet.ps1
#   F:\BarAvenida\Scripts\deploy-kds.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Write-Host "Hay que correr esto como Administrador." -ForegroundColor Red
    exit 1
}

$ApiDir        = "F:\BarAvenida\BarAvenida.API"
$ProdServerWww = "C:\Program Files\Bar Avenida\Server\wwwroot"
$tieneProd     = Test-Path "C:\Program Files\Bar Avenida\Server\BarAvenida.API.exe"
$inicio        = Get-Date

Write-Host ""
Write-Host "================================================" -ForegroundColor Magenta
Write-Host "  DEPLOY COMPLETO BAR AVENIDA" -ForegroundColor Magenta
Write-Host "================================================" -ForegroundColor Magenta
if ($tieneProd) {
    Write-Host "  + Mirror a Program Files (servicio Windows)" -ForegroundColor Magenta
} else {
    Write-Host "  (sin Program Files: solo deploy de desarrollo)" -ForegroundColor DarkGray
}
Write-Host ""

# ----------------------------------------------------------------------------
# Helper: copia el wwwroot/<frontend> de F:\ a C:\Program Files\...
# ----------------------------------------------------------------------------
function Mirror-A-ProgramFiles {
    param([string]$NombreFrontend)
    if (-not $tieneProd) { return }
    $src = Join-Path $ApiDir "wwwroot\$NombreFrontend"
    $dst = Join-Path $ProdServerWww $NombreFrontend
    if (-not (Test-Path $src)) {
        Write-Host "[WARN] No se encontro $src - skip mirror" -ForegroundColor Yellow
        return
    }
    if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
    New-Item -ItemType Directory -Path $dst -Force | Out-Null
    Copy-Item -Recurse -Force "$src\*" $dst
    Write-Host "       -> mirror $NombreFrontend a Program Files OK" -ForegroundColor DarkGreen
}

# ----------------------------------------------------------------------------
# 0. Detener servicio una vez al inicio
# ----------------------------------------------------------------------------
Write-Host "[0/5] Deteniendo servicio para evitar locks..." -ForegroundColor Yellow
Stop-Service -Name "BarAvenidaAPI" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "[OK] Servicio detenido" -ForegroundColor Green
Write-Host ""

# ----------------------------------------------------------------------------
# 1. Tablet PWA
# ----------------------------------------------------------------------------
Write-Host "[1/5] Compilando Tablet PWA..." -ForegroundColor Yellow
Push-Location F:\BarAvenida\BarAvenida.Tablet
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
$wwTablet = Join-Path $ApiDir "wwwroot\tablet"
if (Test-Path $wwTablet) { Remove-Item -Recurse -Force $wwTablet }
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Tablet build fallo" -ForegroundColor Red; Pop-Location; exit 1 }
# Vite del Tablet escribe a dist/, hay que copiar a wwwroot/tablet
New-Item -ItemType Directory -Path $wwTablet -Force | Out-Null
Copy-Item -Recurse -Force "dist\*" $wwTablet
Pop-Location
Mirror-A-ProgramFiles "tablet"
Write-Host "[OK] Tablet compilado" -ForegroundColor Green
Write-Host ""

# ----------------------------------------------------------------------------
# 2. Admin Web
# ----------------------------------------------------------------------------
Write-Host "[2/5] Compilando Admin Web..." -ForegroundColor Yellow
Push-Location F:\BarAvenida\BarAvenida.Admin
$wwAdmin = Join-Path $ApiDir "wwwroot\admin"
if (Test-Path $wwAdmin) { Remove-Item -Recurse -Force $wwAdmin }
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Admin build fallo" -ForegroundColor Red; Pop-Location; exit 1 }
Pop-Location
Mirror-A-ProgramFiles "admin"
Write-Host "[OK] Admin compilado" -ForegroundColor Green
Write-Host ""

# ----------------------------------------------------------------------------
# 3. KDS Web
# ----------------------------------------------------------------------------
Write-Host "[3/5] Compilando KDS Web..." -ForegroundColor Yellow
Push-Location F:\BarAvenida\BarAvenida.KDS
$wwKds = Join-Path $ApiDir "wwwroot\kds"
if (Test-Path $wwKds) { Remove-Item -Recurse -Force $wwKds }
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "KDS build fallo" -ForegroundColor Red; Pop-Location; exit 1 }
Pop-Location
Mirror-A-ProgramFiles "kds"
Write-Host "[OK] KDS compilado" -ForegroundColor Green
Write-Host ""

# ----------------------------------------------------------------------------
# 4. Backend
# ----------------------------------------------------------------------------
Write-Host "[4/5] Republicando backend..." -ForegroundColor Yellow
Push-Location $ApiDir
Remove-Item -Recurse -Force bin\Release -ErrorAction SilentlyContinue
dotnet publish -c Release -o bin\Release\net8.0\publish
if ($LASTEXITCODE -ne 0) { Write-Host "Backend publish fallo" -ForegroundColor Red; Pop-Location; exit 1 }
Pop-Location

# 4.5 Copiar binario nuevo a Program Files (donde corre el servicio Windows)
# Excluye appsettings.json y web.config para preservar config de produccion.
if ($tieneProd) {
    Write-Host "       -> copiando binario nuevo a Program Files..." -ForegroundColor DarkYellow
    $publishDir = Join-Path $ApiDir "bin\Release\net8.0\publish"
    $prodDir    = "C:\Program Files\Bar Avenida\Server"

    # robocopy: /MIR mirror, /XF excluye archivos sensibles, /XD excluye wwwroot (ya copiado)
    robocopy $publishDir $prodDir /MIR /NFL /NDL /NJH /NJS /NP `
        /XF appsettings.json appsettings.Production.json web.config `
        /XD wwwroot Logs | Out-Null

    # robocopy retorna 0 = no copy needed, 1 = copied OK, 2-7 = OK con warnings, >=8 = error
    if ($LASTEXITCODE -ge 8) {
        Write-Host "[ERROR] robocopy fallo con codigo $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
    Write-Host "       -> binario copiado a Program Files OK (rc=$LASTEXITCODE)" -ForegroundColor DarkGreen
}
Write-Host "[OK] Backend republicado y desplegado" -ForegroundColor Green
Write-Host ""

# ----------------------------------------------------------------------------
# 5. Arrancar servicio
# ----------------------------------------------------------------------------
Write-Host "[5/5] Arrancando servicio..." -ForegroundColor Yellow
Start-Service -Name "BarAvenidaAPI"
Start-Sleep -Seconds 3
$svc = Get-Service -Name "BarAvenidaAPI"
if ($svc.Status -ne "Running") {
    Write-Host "[ERROR] Servicio no arranco. Status: $($svc.Status)" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Servicio Running" -ForegroundColor Green

$dur = (Get-Date) - $inicio
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  DEPLOY COMPLETO EN $([math]::Round($dur.TotalSeconds, 0)) SEGUNDOS" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Tablet PWA:  http://192.168.100.10:7000/tablet/"  -ForegroundColor Cyan
Write-Host "  Admin Web:   http://192.168.100.10:7000/admin/"   -ForegroundColor Cyan
Write-Host "  KDS Web:     http://192.168.100.10:7000/kds"      -ForegroundColor Cyan
Write-Host ""
