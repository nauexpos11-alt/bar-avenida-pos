# ============================================================================
# Commit + push de v1.4.0: notificador de updates al iniciar sesion
# ============================================================================

$ErrorActionPreference = "Continue"

git config --global --add safe.directory C:/BarAvenida-dev 2>&1 | Out-Null

Push-Location "C:\BarAvenida-dev"

try {
    Write-Host "=== git status ===" -ForegroundColor Cyan
    git status --short
    Write-Host ""

    git add Scripts/notificador-update.ps1            2>&1 | Out-Null
    git add Scripts/install-tarea-auto-update.ps1     2>&1 | Out-Null
    git add Scripts/actualizar-bar.ps1                 2>&1 | Out-Null
    git add Installer/BarAvenidaServer.iss             2>&1 | Out-Null
    git add Scripts/commit-v1.4.0-notificador.ps1     2>&1 | Out-Null

    $msg = "feat(update): v1.4.0 notificador al iniciar sesion + fallback diario`n`n" +
           "Reemplaza el modelo 'tarea silenciosa cada N horas' por uno`n" +
           "interactivo y mucho mas amigable:`n`n" +
           "Nuevo: Scripts/notificador-update.ps1`n" +
           "  - Corre al iniciar sesion del usuario (no SYSTEM, para mostrar UI).`n" +
           "  - Consulta GitHub Releases.`n" +
           "  - Si hay update, muestra ventana WPF nativa con 3 opciones:`n" +
           "    * Instalar ahora -> lanza actualizar-bar.ps1 -Force`n" +
           "    * Mas tarde -> vuelve a preguntar al proximo login`n" +
           "    * Saltar esta version -> persiste version-saltada.txt`n" +
           "  - UI con paleta dorado/negro del bar.`n" +
           "  - Espera 20s despues del login antes de aparecer.`n" +
           "  - Loguea decisiones a C:\\BarAvenida\\notificador-update.log.`n`n" +
           "Modificado: Scripts/install-tarea-auto-update.ps1`n" +
           "  - Ahora registra DOS tareas:`n" +
           "    1. BarAvenida_Notificador (AtLogon, como usuario, con UI)`n" +
           "    2. BarAvenida_AutoUpdate (diaria 3:30am, como SYSTEM, fallback)`n" +
           "  - Auto-descarga scripts faltantes desde GitHub si no estan locales.`n`n" +
           "Modificado: Scripts/actualizar-bar.ps1`n" +
           "  - Header documenta -Force para saltar verificaciones.`n" +
           "  - Sigue siendo el motor que hace download/install.`n`n" +
           "Modificado: Installer/BarAvenidaServer.iss`n" +
           "  - Bumpea a 1.4.0.`n" +
           "  - Copia notificador-update.ps1 a C:\\BarAvenida durante install.`n" +
           "  - Checkbox de tarea cambia a 'notificador al iniciar sesion'.`n" +
           "  - [UninstallRun] limpia ambas tareas (Notificador + AutoUpdate).`n`n" +
           "Comportamiento resultante:`n" +
           "  - Al prender la PC: aparece ventana solo si hay update.`n" +
           "  - Usuario decide: instalar, mas tarde, o saltar.`n" +
           "  - Fallback nocturno a las 3:30am si PC sigue prendida.`n" +
           "  - Saltar es persistente: no vuelve a preguntar de esa version."
    git commit -m $msg 2>&1 | Out-Host

    Write-Host ""
    Write-Host "==> PUSH" -ForegroundColor Green
    git push origin main 2>&1 | Out-Host

    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "  v1.4.0 NOTIFICADOR PUSHEADO" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "PROXIMO PASO: Lanzar release v1.4.0" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File `"C:\BarAvenida-dev\Scripts\release-total.ps1`" -Version `"1.4.0`"" -ForegroundColor Cyan
    Write-Host ""
}
finally {
    Pop-Location
}
