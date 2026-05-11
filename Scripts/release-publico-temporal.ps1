# ============================================================================
# Bar Avenida - Lanzar release + repo publico temporal
# 1. Hace publico el repo
# 2. Lanza release con release-total.ps1
# 3. Espera confirmacion del usuario que TODAS las PCs ya recibieron
# 4. Vuelve a privado el repo
# ============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

$ErrorActionPreference = "Continue"
$repo = "nauexpos11-alt/bar-avenida-pos"

Write-Host ""
Write-Host "================================================" -ForegroundColor Magenta
Write-Host "  RELEASE v$Version + PUBLICO TEMPORAL" -ForegroundColor Magenta
Write-Host "================================================" -ForegroundColor Magenta
Write-Host ""

# Paso 1: Lanzar release
Write-Host "[1/3] Lanzando release-total.ps1 v$Version..." -ForegroundColor Cyan
& "$PSScriptRoot\release-total.ps1" -Version $Version

if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
    Write-Host "[FAIL] release-total.ps1 fallo. No haciendo publico el repo." -ForegroundColor Red
    exit 1
}

# Paso 2: Hacer publico
Write-Host ""
Write-Host "[2/3] Haciendo PUBLICO el repo (temporal)..." -ForegroundColor Yellow
gh repo edit $repo --visibility public --accept-visibility-change-consequences
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Repo es publico. Las PCs cliente ya pueden ver el release." -ForegroundColor Green
} else {
    Write-Host "[FAIL] No se pudo hacer publico. Hazlo a mano:" -ForegroundColor Red
    Write-Host "  gh repo edit $repo --visibility public --accept-visibility-change-consequences" -ForegroundColor Yellow
    exit 1
}

# Paso 3: Esperar confirmacion del usuario
Write-Host ""
Write-Host "================================================" -ForegroundColor Yellow
Write-Host "  ESPERANDO QUE LAS PCs CLIENTE SE ACTUALICEN" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "El repo esta PUBLICO ahora. Las PCs del bar pueden recibir el update." -ForegroundColor Cyan
Write-Host ""
Write-Host "En cada PC del bar (puede ser via TeamViewer):" -ForegroundColor Yellow
Write-Host "  1. Que alguien inicie sesion -> aparece pop-up del notificador" -ForegroundColor Gray
Write-Host "  2. O fuerza con: Start-ScheduledTask -TaskName 'BarAvenida_Notificador'" -ForegroundColor Gray
Write-Host "  3. O instala manual: powershell -ExecutionPolicy Bypass -File C:\BarAvenida\actualizar-bar.ps1 -Force" -ForegroundColor Gray
Write-Host ""
Write-Host "VERIFICAR EN CADA PC que termino de actualizarse:" -ForegroundColor Yellow
Write-Host "  Get-Content C:\BarAvenida\version-instalada.txt" -ForegroundColor Gray
Write-Host "  (Debe decir $Version)" -ForegroundColor Gray
Write-Host ""

$listo = Read-Host "Cuando TODAS las PCs ya estan en v$Version, escribe 'si' para volver a privado"

if ($listo -eq "si" -or $listo -eq "Si" -or $listo -eq "SI") {
    Write-Host ""
    Write-Host "[3/3] Volviendo a PRIVADO..." -ForegroundColor Cyan
    gh repo edit $repo --visibility private --accept-visibility-change-consequences
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Repo es PRIVADO de nuevo" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] No se pudo volver a privado. Hazlo a mano:" -ForegroundColor Red
        Write-Host "  gh repo edit $repo --visibility private --accept-visibility-change-consequences" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "[ALERTA] Saliste sin volver a privado. NO OLVIDES correr a mano:" -ForegroundColor Red
    Write-Host "  gh repo edit $repo --visibility private --accept-visibility-change-consequences" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "FIN" -ForegroundColor Green
