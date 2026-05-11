# ============================================================================
# Commit + push de los fixes v1.3.0
# - setup-sql-baravenida.sql: SQL preventivo para que SYSTEM tenga permisos
# - BarAvenidaServer.iss: instalador robusto con auto-arranque garantizado
# ============================================================================

$ErrorActionPreference = "Continue"

git config --global --add safe.directory C:/BarAvenida-dev 2>&1 | Out-Null

Push-Location "C:\BarAvenida-dev"

try {
    Write-Host "=== git status ===" -ForegroundColor Cyan
    git status --short
    Write-Host ""

    git add Backups/setup-sql-baravenida.sql        2>&1 | Out-Null
    git add Installer/BarAvenidaServer.iss           2>&1 | Out-Null
    git add Scripts/commit-v1.3.0-fixes.ps1          2>&1 | Out-Null

    $msg = "fix(installer): v1.3.0 auto-arranque robusto del servicio`n`n" +
           "Fix del bug 1.2.0 donde el servicio BarAvenidaAPI no arrancaba`n" +
           "porque NT AUTHORITY\SYSTEM no tenia permisos sobre SQL Server.`n`n" +
           "Cambios:`n" +
           "- Nuevo: Backups/setup-sql-baravenida.sql`n" +
           "  Script SQL idempotente que crea login SYSTEM con dbcreator +`n" +
           "  securityadmin a nivel servidor. Cuando la BD ya existe, agrega`n" +
           "  db_owner. Corre antes y despues del primer arranque.`n`n" +
           "- BarAvenidaServer.iss bumpeado a 1.3.0:`n" +
           "  * Pre-arranque: corre setup-sql-baravenida.sql para dar permisos`n" +
           "    a SYSTEM antes de crear el servicio. Esto evita el bug 1.2.0.`n" +
           "  * Post-arranque: espera 15s a que migraciones creen la BD,`n" +
           "    vuelve a correr setup-sql para dar db_owner sobre BarAvenida,`n" +
           "    y reinicia el servicio con permisos finales.`n" +
           "  * Auto-configura firewall en puerto 7000.`n" +
           "  * Nueva tarea checkbox: tareaautoupdate (registra`n" +
           "    install-tarea-auto-update.ps1 directo del installer).`n" +
           "  * Nueva tarea checkbox: shortcutdesktop (crea acceso directo`n" +
           "    a la Tablet PWA en el escritorio).`n" +
           "  * Iconos en menu Inicio agregados: Tablet, Admin, KDS, Server`n" +
           "    (abren las URLs en navegador).`n" +
           "  * Validacion preinstalacion mejorada: drive F: y SQL Server`n" +
           "    con mensajes claros y links a soluciones.`n" +
           "  * ArchitecturesAllowed cambiado a x64compatible (mas moderno).`n" +
           "  * Agregado RunOnceId a [UninstallRun] (limpia warning de Inno).`n" +
           "  * Postinstall opcional: abre la Tablet en navegador al terminar."
    git commit -m $msg 2>&1 | Out-Host

    Write-Host ""
    Write-Host "==> PUSH" -ForegroundColor Green
    git push origin main 2>&1 | Out-Host

    if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq $null) {
        Write-Host ""
        Write-Host "================================================" -ForegroundColor Green
        Write-Host "  v1.3.0 FIXES PUSHEADOS" -ForegroundColor Green
        Write-Host "================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "PROXIMO PASO: Lanzar la release v1.3.0 desde NAU" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  powershell -ExecutionPolicy Bypass -File `"C:\BarAvenida-dev\Scripts\release-total.ps1`" -Version `"1.3.0`"" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Esto va a:" -ForegroundColor Gray
        Write-Host "  1. Compilar todo a 1.3.0" -ForegroundColor Gray
        Write-Host "  2. Subir el GitHub Release v1.3.0 con los nuevos .exe" -ForegroundColor Gray
        Write-Host "  3. La PC del bar lo descarga e instala sola en max 6h" -ForegroundColor Gray
        Write-Host "     (si la tarea auto-update esta registrada en el bar)" -ForegroundColor Gray
        Write-Host ""
    }
}
finally {
    Pop-Location
}
