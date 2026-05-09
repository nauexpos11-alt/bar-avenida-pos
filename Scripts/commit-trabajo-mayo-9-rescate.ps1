# commit-trabajo-mayo-9-rescate.ps1
# ----------------------------------------------------------------------------
# Rescate del script anterior que murio en el primer commit por stderr de git.
# Mas tolerante: ErrorActionPreference=Continue, sin chequeos finos.
# ----------------------------------------------------------------------------

# Importante: NO Stop. Git escribe a stderr aunque sea exito.
$ErrorActionPreference = "Continue"

Push-Location "F:\BarAvenida"

try {
    Write-Host ""
    Write-Host "==> 1. Reset del index al ultimo commit conocido" -ForegroundColor Cyan
    git reset 2>&1 | Out-Null
    Write-Host "   index limpio (working tree intacto)"

    Write-Host ""
    Write-Host "==> 2. Verificar status actual" -ForegroundColor Cyan
    git status --short

    Write-Host ""
    Read-Host "Presiona ENTER para continuar con los 5 commits"

    # --- COMMIT 1 ------------------------------------------------------------
    Write-Host ""
    Write-Host "==> COMMIT 1: chore(.gitignore) + remove wwwroot/tablet del index" -ForegroundColor Yellow
    git add .gitignore 2>&1 | Out-Null
    git rm -r --cached --ignore-unmatch BarAvenida.API/wwwroot/tablet/ 2>&1 | Out-Null
    $r = git commit -m "chore(.gitignore): excluir wwwroot/tablet (build output del Tablet PWA)" 2>&1
    Write-Host $r

    # --- COMMIT 2: rediseno completo -----------------------------------------
    Write-Host ""
    Write-Host "==> COMMIT 2: feat(redesign): B1-B6" -ForegroundColor Yellow

    git add BarAvenida.API/Models/Orden.cs                                     2>&1 | Out-Null
    git add BarAvenida.API/DTOs/CuentaDtos.cs                                  2>&1 | Out-Null
    git add BarAvenida.API/Controllers/CuentasController.cs                    2>&1 | Out-Null
    git add BarAvenida.API/Controllers/MonitorVentasController.cs              2>&1 | Out-Null
    git add BarAvenida.API/Services/TicketService.cs                           2>&1 | Out-Null
    git add BarAvenida.API/Migrations/20260509082629_OrdenNumeroOrden.cs       2>&1 | Out-Null
    git add BarAvenida.API/Migrations/20260509082629_OrdenNumeroOrden.Designer.cs 2>&1 | Out-Null
    git add BarAvenida.API/Migrations/BarAvenidaDbContextModelSnapshot.cs      2>&1 | Out-Null

    git add BarAvenida.Admin/src/App.jsx                                       2>&1 | Out-Null
    git add BarAvenida.Admin/src/api.js                                        2>&1 | Out-Null
    git add BarAvenida.Admin/src/components/TopMenuBar.jsx                     2>&1 | Out-Null
    git add BarAvenida.Admin/src/components/TopMenuBar.css                     2>&1 | Out-Null
    git add BarAvenida.Admin/src/components/CuentaCard.jsx                     2>&1 | Out-Null
    git add BarAvenida.Admin/src/components/EditarInfoCuentaModal.jsx          2>&1 | Out-Null
    git add BarAvenida.Admin/src/components/EditarInfoCuentaModal.css          2>&1 | Out-Null
    git add BarAvenida.Admin/src/components/MoverAreaModal.jsx                 2>&1 | Out-Null
    git add BarAvenida.Admin/src/components/MoverAreaModal.css                 2>&1 | Out-Null
    git add BarAvenida.Admin/src/components/CancelarCobradaModal.jsx           2>&1 | Out-Null
    git add BarAvenida.Admin/src/components/ReabrirCuentaModal.jsx             2>&1 | Out-Null
    git add BarAvenida.Admin/src/screens/CentroOperacionScreen.jsx             2>&1 | Out-Null
    git add BarAvenida.Admin/src/screens/CentroOperacionScreen.css             2>&1 | Out-Null
    git add BarAvenida.Admin/src/screens/BarraRapidaAdminScreen.jsx            2>&1 | Out-Null
    git add BarAvenida.Admin/src/screens/BarraRapidaAdminScreen.css            2>&1 | Out-Null
    git add BarAvenida.Admin/src/screens/PuntoVentaHomeScreen.jsx              2>&1 | Out-Null
    git add BarAvenida.Admin/src/screens/PuntoVentaHomeScreen.css              2>&1 | Out-Null
    git add BarAvenida.Admin/src/screens/MonitorVentasScreen.jsx               2>&1 | Out-Null
    git add BarAvenida.Admin/src/screens/MonitorVentasScreen.css               2>&1 | Out-Null
    git add BarAvenida.Admin/src/screens/ConsultaCuentasScreen.jsx             2>&1 | Out-Null
    git add BarAvenida.Admin/src/screens/ConsultaCuentasScreen.css             2>&1 | Out-Null

    git add BarAvenida.KDS/src/components/MesaCard.jsx                         2>&1 | Out-Null
    git add BarAvenida.KDS/src/components/MesaCard.css                         2>&1 | Out-Null
    git add BarAvenida.Tablet/src/screens/ResumenCuentaScreen.jsx              2>&1 | Out-Null
    git add BarAvenida.Tablet/src/screens/ResumenCuentaScreen.css              2>&1 | Out-Null

    $msg = "feat(redesign): B1-B6 rediseno completo basado en Soft Restaurant 8.1.0`n`n" +
           "B1 Centro de Operacion: vista unificada de cuentas con split panel,`n" +
           "filtros con persistencia localStorage, endpoints GET activas/editar-info/mover-area,`n" +
           "modales EditarInfoCuentaModal y MoverAreaModal, SignalR auto-refresh.`n`n" +
           "B2 Servicio Rapido v1: BarraRapidaAdminScreen con tabs categorias + grid productos,`n" +
           "carrito inline con ENVIAR ORDEN AL BAR, item TopMenuBar shortcut F9.`n`n" +
           "B3 Monitor de Ventas: MonitorVentasController con periodos hoy/ayer/semana/mes/turno,`n" +
           "desglose por tipo producto / servicio / area / categoria con barras horizontales.`n`n" +
           "B4 Historico de Cuentas: refactor split panel con filtros, modales`n" +
           "CancelarCobradaModal (10+ chars motivo) y ReabrirCuentaModal (limite 30 min),`n" +
           "endpoints POST cancelar-cobrada y reabrir.`n`n" +
           "B5 Folio = Orden Mesera (CRITICO): Orden.NumeroOrden, migracion`n" +
           "20260509082629_OrdenNumeroOrden con backfill ROW_NUMBER PARTITION BY CuentaId,`n" +
           "TicketService.GenerarTicketOrden con ORDEN #N, fire-and-forget print,`n" +
           "KDS MesaCard ORDEN #N grande dorado 1.55rem, Tablet ResumenCuentaScreen`n" +
           "agrupa productos por orden con header HH:MM.`n`n" +
           "B6 Dashboard PoV: PuntoVentaHomeScreen con 4 botones gigantes live`n" +
           "(Centro / Barra / Caja / Reportes), logo navega a pos-home,`n" +
           "default cambio a pos-home tras login.`n`n" +
           "Builds 0/0 en backend, admin, kds, tablet. Validacion E2E:`n" +
           "B2 con Chrome MCP, B5 por API + KDS visual, B1/B3/B4/B6 por API.`n" +
           "Migracion B5 aplicada limpio con backfill OK."
    $r = git commit -m $msg 2>&1
    Write-Host $r

    # --- COMMIT 3 ------------------------------------------------------------
    Write-Host ""
    Write-Host "==> COMMIT 3: fix(scripts) deploy a Program Files" -ForegroundColor Yellow
    git add Scripts/deploy-todo.ps1   2>&1 | Out-Null
    git add Scripts/deploy-admin.ps1  2>&1 | Out-Null
    git add Scripts/deploy-kds.ps1    2>&1 | Out-Null
    $msg2 = "fix(scripts): deploy scripts copian binario nuevo a Program Files`n`n" +
            "Bug detectado: dotnet publish escribia a bin/Release/net8.0/publish/`n" +
            "pero el servicio Windows BarAvenidaAPI corre desde`n" +
            "C:/Program Files/Bar Avenida/Server/. Sin copia explicita,`n" +
            "los cambios del backend nunca llegaban a produccion.`n`n" +
            "Fix:`n" +
            "- deploy-todo.ps1 paso 4.5: robocopy con /XF appsettings.json`n" +
            "  y /XD wwwroot Logs (preservacion).`n" +
            "- deploy-admin.ps1 y deploy-kds.ps1: paso 2.5 con mirror`n" +
            "  individual del wwwroot/<frontend>/ a Program Files.`n" +
            "- Test-Path inicial detecta si Program Files existe;`n" +
            "  si no, modo solo desarrollo.`n`n" +
            "Sin esto, B5 se desplego como frontend pero el backend seguia`n" +
            "sin emitir numeroOrden hasta correr el robocopy manual."
    $r = git commit -m $msg2 2>&1
    Write-Host $r

    # --- COMMIT 4 ------------------------------------------------------------
    Write-Host ""
    Write-Host "==> COMMIT 4: docs(specs)" -ForegroundColor Yellow
    git add specs/redesign_master.md                  2>&1 | Out-Null
    git add specs/redesign_b1_centro_operacion.md     2>&1 | Out-Null
    git add specs/redesign_b2_servicio_rapido_v2.md   2>&1 | Out-Null
    git add specs/redesign_b3_monitor_ventas.md       2>&1 | Out-Null
    git add specs/redesign_b4_historico_cuentas.md    2>&1 | Out-Null
    git add specs/redesign_b5_folio_orden.md          2>&1 | Out-Null
    git add specs/redesign_b6_dashboard_pov.md        2>&1 | Out-Null
    git add specs/admin_servicio_rapido.md            2>&1 | Out-Null
    $msg3 = "docs(specs): plan maestro + 7 specs del rediseno Soft Restaurant`n`n" +
            "Coronado mando 17 capturas de Soft Restaurant 8.1.0.`n`n" +
            "redesign_master.md: filosofia, 6 bloques, orden, dependencias.`n" +
            "redesign_b1_centro_operacion.md (~90 min)`n" +
            "redesign_b2_servicio_rapido_v2.md (~60 min)`n" +
            "redesign_b3_monitor_ventas.md (~60 min)`n" +
            "redesign_b4_historico_cuentas.md (~60 min)`n" +
            "redesign_b5_folio_orden.md (~30 min, CRITICO)`n" +
            "redesign_b6_dashboard_pov.md (~30 min)`n" +
            "admin_servicio_rapido.md: spec original (sustituido por B2 v2)."
    $r = git commit -m $msg3 2>&1
    Write-Host $r

    # --- COMMIT 5 ------------------------------------------------------------
    Write-Host ""
    Write-Host "==> COMMIT 5: chore: scripts auxiliares" -ForegroundColor Yellow
    git add Scripts/commit-trabajo-mayo-8.ps1     2>&1 | Out-Null
    git add Scripts/commit-trabajo-mayo-9.ps1     2>&1 | Out-Null
    git add Scripts/commit-trabajo-mayo-9-rescate.ps1 2>&1 | Out-Null
    # Si quedan otros archivos modificados (Installer/LEEME), agregarlos tambien
    git add Installer/BarAvenidaServer.iss 2>&1 | Out-Null
    git add Releases/LEEME.txt             2>&1 | Out-Null
    $r = git commit -m "chore: scripts de commit + ajustes Installer/LEEME" 2>&1
    Write-Host $r

    # --- PUSH ----------------------------------------------------------------
    Write-Host ""
    Write-Host "==> PUSH a GitHub" -ForegroundColor Green
    $r = git push origin main 2>&1
    Write-Host $r

    Write-Host ""
    Write-Host "Ultimos 8 commits:" -ForegroundColor Green
    git log --oneline -8
}
finally {
    Pop-Location
}
