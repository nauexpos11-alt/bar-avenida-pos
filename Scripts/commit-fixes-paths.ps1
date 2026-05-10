# ============================================================================
# Commit + push de los fixes de paths para que el pipeline funcione en NAU
# ============================================================================

$ErrorActionPreference = "Continue"

git config --global --add safe.directory E:/bar-avenida-pos 2>&1 | Out-Null

Push-Location "E:\bar-avenida-pos"

try {
    Write-Host "=== git status ===" -ForegroundColor Cyan
    git status --short
    Write-Host ""

    git add Installer/BarAvenidaServer.iss            2>&1 | Out-Null
    git add Installer/compilar-instalador.ps1         2>&1 | Out-Null
    git add Scripts/juntar-instaladores.ps1           2>&1 | Out-Null
    git add Scripts/preparar-nau.ps1                  2>&1 | Out-Null
    git add Scripts/commit-fixes-paths.ps1            2>&1 | Out-Null

    $msg = "fix(installer): paths relativos para que builds funcionen en NAU`n`n" +
           "Cambios:`n" +
           "- BarAvenidaServer.iss: usa #define SOURCE_ROOT y paths relativos`n" +
           "  con {#SOURCE_ROOT} para [Files]. OutputDir cambio a 'dist' relativo.`n" +
           "  Los paths de [Dirs] e [Icons] siguen como F:\BarAvenida (destination).`n" +
           "- compilar-instalador.ps1: auto-detecta $RepoRoot desde $PSScriptRoot.`n" +
           "  Limpia bin/obj antes de publish para evitar MSB4018 con SDK 10.x.`n" +
           "- juntar-instaladores.ps1: auto-detecta repo root.`n" +
           "- preparar-nau.ps1 (NUEVO): script de prereqs para la PC admin.`n" +
           "  Configura ExecutionPolicy, git safe.directory, instala gh CLI`n" +
           "  via winget, hace gh auth login, instala Inno Setup."
    git commit -m $msg 2>&1 | Out-Host

    Write-Host ""
    Write-Host "==> PUSH" -ForegroundColor Green
    git push origin main 2>&1 | Out-Host

    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "  FIXES PUSHEADOS" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "PROXIMOS PASOS:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Abrir POWERSHELL COMO ADMINISTRADOR (cierra esta y abre nueva)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Preparar NAU (instala lo que falte):" -ForegroundColor Cyan
    Write-Host "   powershell -ExecutionPolicy Bypass -File E:\bar-avenida-pos\Scripts\preparar-nau.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Lanzar primera release:" -ForegroundColor Cyan
    Write-Host "   E:\bar-avenida-pos\Scripts\release-total.ps1 -Version 1.2.0" -ForegroundColor Gray
    Write-Host ""
}
finally {
    Pop-Location
}
