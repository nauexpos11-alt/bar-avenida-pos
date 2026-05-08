# ============================================================================
# Bar Avenida — Commit y push en un solo comando
# ----------------------------------------------------------------------------
# Uso:
#   F:\BarAvenida\Scripts\git-push.ps1 "mensaje del commit"
# Si no pasas mensaje, te lo pide.
# ============================================================================

param(
    [string]$Mensaje
)

$ErrorActionPreference = "Stop"
Push-Location F:\BarAvenida

# Si no hay mensaje, pedirlo
if (-not $Mensaje) {
    $Mensaje = Read-Host "Mensaje del commit"
    if (-not $Mensaje) {
        Write-Host "Necesitas un mensaje. Cancelando." -ForegroundColor Yellow
        Pop-Location
        exit 1
    }
}

Write-Host ""
Write-Host "git add -A" -ForegroundColor Cyan
git add -A

# Ver cuantos archivos cambiaron
$changes = git diff --cached --shortstat
if (-not $changes) {
    Write-Host "[OK] No hay cambios que commitear." -ForegroundColor Yellow
    Pop-Location
    exit 0
}
Write-Host $changes -ForegroundColor Gray

Write-Host ""
Write-Host "git commit -m `"$Mensaje`"" -ForegroundColor Cyan
git commit -m "$Mensaje"

Write-Host ""
Write-Host "git push" -ForegroundColor Cyan
git push

Pop-Location

Write-Host ""
Write-Host "[OK] Cambios subidos a GitHub" -ForegroundColor Green
Write-Host "https://github.com/nauexpos11-alt/bar-avenida-pos" -ForegroundColor Cyan
