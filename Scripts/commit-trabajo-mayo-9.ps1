# commit-trabajo-mayo-9.ps1
# ----------------------------------------------------------------------------
# Cierra el trabajo del 9 mayo 2026 con commits limpios y push a GitHub.
# Generado por Cowork. Coronado lo corre UNA VEZ desde F:\BarAvenida.
#
# El trabajo de hoy:
#   - B1 Centro de Operacion (vista unificada cuentas + 2 endpoints + 2 modales)
#   - B2 Servicio Rapido v1 (BarraRapidaAdminScreen + 3 metodos API)
#   - B3 Monitor de Ventas (MonitorVentasController + screen con desgloses)
#   - B4 Historico de Cuentas (refactor + 2 endpoints + 2 modales)
#   - B5 Folio = Orden Mesera (modelo + migracion + ticket + KDS + Tablet)
#   - B6 Dashboard PoV (PuntoVentaHomeScreen con 4 botones live)
#   - Fix deploy scripts (copia binario a Program Files con robocopy)
#   - 7 specs del rediseno (plan maestro + 6 bloques)
# ----------------------------------------------------------------------------

$ErrorActionPreference = "Stop"

Push-Location "F:\BarAvenida"

try {
    Write-Host "==> 1. Limpieza" -ForegroundColor Cyan
    if (Test-Path ".git\index.lock") {
        Remove-Item ".git\index.lock" -Force
        Write-Host "   eliminado: .git\index.lock"
    }
    if (Test-Path "query") {
        Remove-Item "query" -Force
        Write-Host "   eliminado: query (basura)"
    }
    if (Test-Path ".test-write") {
        Remove-Item ".test-write" -Force
        Write-Host "   eliminado: .test-write (basura del sandbox)"
    }

    Write-Host ""
    Write-Host "==> 2. Revertir line-endings de migrations existentes (ruido)" -ForegroundColor Cyan
    # Solo las migraciones VIEJAS tienen ruido CRLF<->LF. La nueva (OrdenNumeroOrden) si va.
    $oldMigrations = @(
        "20260505032436_InitialCreate.Designer.cs",
        "20260505032436_InitialCreate.cs",
        "20260505081930_ProductosReales.Designer.cs",
        "20260505081930_ProductosReales.cs",
        "20260506054528_CobroImpresionCajon.Designer.cs",
        "20260506054528_CobroImpresionCajon.cs",
        "20260506073529_RazonSocialEnConfig.Designer.cs",
        "20260506073529_RazonSocialEnConfig.cs",
        "20260506075749_CajaTurnosYRetiros.Designer.cs",
        "20260506075749_CajaTurnosYRetiros.cs",
        "20260506082530_CorteCajaConteo.Designer.cs",
        "20260506082530_CorteCajaConteo.cs",
        "20260506094211_CancelacionCuenta.Designer.cs",
        "20260506094211_CancelacionCuenta.cs",
        "20260506100609_CatalogosYSeguridad.Designer.cs",
        "20260506100609_CatalogosYSeguridad.cs",
        "20260507031822_SolicitudesCancelacion.Designer.cs",
        "20260507031822_SolicitudesCancelacion.cs",
        "20260507090235_IncidentesCaja.Designer.cs",
        "20260507090235_IncidentesCaja.cs",
        "20260507094559_ReglasCrossSell.Designer.cs",
        "20260507094559_ReglasCrossSell.cs",
        "20260508074521_CuentaMesaIdNullable.Designer.cs",
        "20260508074521_CuentaMesaIdNullable.cs",
        "20260508103122_AgregarAreaACuenta.Designer.cs",
        "20260508103122_AgregarAreaACuenta.cs"
    )
    foreach ($m in $oldMigrations) {
        $path = "BarAvenida.API/Migrations/$m"
        git checkout -- $path 2>$null
    }
    Write-Host "   migrations existentes revertidas (la nueva OrdenNumeroOrden se conserva)"

    Write-Host ""
    Write-Host "==> 3. Agregar wwwroot/tablet/ al .gitignore" -ForegroundColor Cyan
    $gitignorePath = ".gitignore"
    $content = Get-Content $gitignorePath -Raw
    if ($content -notmatch "wwwroot/tablet") {
        $append = @"

# wwwroot/tablet (build output del Tablet PWA)
BarAvenida.API/wwwroot/tablet/
"@
        Add-Content -Path $gitignorePath -Value $append -NoNewline
        Write-Host "   .gitignore actualizado con wwwroot/tablet"
    } else {
        Write-Host "   .gitignore ya tiene wwwroot/tablet"
    }
    git rm -r --cached --ignore-unmatch BarAvenida.API/wwwroot/tablet/ 2>$null | Out-Null

    Write-Host ""
    Write-Host "==> 4. Verificar git status" -ForegroundColor Cyan
    git status --short
    Write-Host ""

    Read-Host "Presiona ENTER para continuar con los 5 commits, o Ctrl+C para abortar"

    Write-Host ""
    Write-Host "==> 5. COMMIT 1: chore(.gitignore)" -ForegroundColor Yellow
    git add .gitignore
    git rm -r --cached --ignore-unmatch BarAvenida.API/wwwroot/tablet/ 2>$null | Out-Null
    git add -u BarAvenida.API/wwwroot/tablet/ 2>$null | Out-Null
    git commit -m "chore(.gitignore): excluir wwwroot/tablet (build output del Tablet PWA)"

    Write-Host ""
    Write-Host "==> 6. COMMIT 2: feat(redesign): B1-B6 rediseno completo" -ForegroundColor Yellow
    # Backend
    git add BarAvenida.API/Models/Orden.cs `
            BarAvenida.API/DTOs/CuentaDtos.cs `
            BarAvenida.API/Controllers/CuentasController.cs `
            BarAvenida.API/Controllers/MonitorVentasController.cs `
            BarAvenida.API/Services/TicketService.cs `
            BarAvenida.API/Migrations/20260509082629_OrdenNumeroOrden.cs `
            BarAvenida.API/Migrations/20260509082629_OrdenNumeroOrden.Designer.cs `
            BarAvenida.API/Migrations/BarAvenidaDbContextModelSnapshot.cs
    # Admin frontend
    git add BarAvenida.Admin/src/App.jsx `
            BarAvenida.Admin/src/api.js `
            BarAvenida.Admin/src/components/TopMenuBar.jsx `
            BarAvenida.Admin/src/components/TopMenuBar.css `
            BarAvenida.Admin/src/components/CuentaCard.jsx `
            BarAvenida.Admin/src/components/EditarInfoCuentaModal.jsx `
            BarAvenida.Admin/src/components/EditarInfoCuentaModal.css `
            BarAvenida.Admin/src/components/MoverAreaModal.jsx `
            BarAvenida.Admin/src/components/MoverAreaModal.css `
            BarAvenida.Admin/src/components/CancelarCobradaModal.jsx `
            BarAvenida.Admin/src/components/ReabrirCuentaModal.jsx `
            BarAvenida.Admin/src/screens/CentroOperacionScreen.jsx `
            BarAvenida.Admin/src/screens/CentroOperacionScreen.css `
            BarAvenida.Admin/src/screens/BarraRapidaAdminScreen.jsx `
            BarAvenida.Admin/src/screens/BarraRapidaAdminScreen.css `
            BarAvenida.Admin/src/screens/PuntoVentaHomeScreen.jsx `
            BarAvenida.Admin/src/screens/PuntoVentaHomeScreen.css `
            BarAvenida.Admin/src/screens/MonitorVentasScreen.jsx `
            BarAvenida.Admin/src/screens/MonitorVentasScreen.css `
            BarAvenida.Admin/src/screens/ConsultaCuentasScreen.jsx `
            BarAvenida.Admin/src/screens/ConsultaCuentasScreen.css
    # KDS y Tablet (solo B5)
    git add BarAvenida.KDS/src/components/MesaCard.jsx `
            BarAvenida.KDS/src/components/MesaCard.css `
            BarAvenida.Tablet/src/screens/ResumenCuentaScreen.jsx `
            BarAvenida.Tablet/src/screens/ResumenCuentaScreen.css
    git commit -m @"
feat(redesign): B1-B6 rediseno completo basado en Soft Restaurant 8.1.0

Implementado por Cowork (planificacion + specs) y Claude Code
(implementacion). Validado E2E con Chrome MCP y curl.

B1 - Centro de Operacion (vista unificada cuentas):
  - Pantalla principal con split panel (lista + detalle)
  - Filtros con persistencia localStorage
  - Endpoint GET /api/Cuentas/activas
  - Endpoints POST /api/Cuentas/{id}/editar-info y /mover-area
  - Modales EditarInfoCuentaModal y MoverAreaModal
  - SignalR auto-refresh

B2 - Servicio Rapido v1 (admin atendiendo barra):
  - BarraRapidaAdminScreen con tabs de categorias + grid productos
  - Carrito inline con ENVIAR ORDEN AL BAR
  - Item TopMenuBar con shortcut F9
  - Reusa CobrarCuentaModal

B3 - Monitor de Ventas (resumen ejecutivo):
  - MonitorVentasController con endpoint /api/admin/monitor-ventas
  - Periodos: hoy/ayer/semana/mes/turno
  - Desglose por tipo producto / servicio / area / categoria
  - Barras horizontales proporcionales

B4 - Historico de Cuentas con detalle:
  - Refactor completo de ConsultaCuentasScreen (split panel)
  - Filtros: fecha rapida, custom, estado, mesera, folio
  - Modales CancelarCobradaModal (min 10 chars motivo) y ReabrirCuentaModal
  - Endpoints POST /cancelar-cobrada y POST /reabrir
  - Reabrir solo si Cobrada hace < 30 min

B5 - Folio = Orden Mesera (CRITICO):
  - Modelo Orden + campo NumeroOrden (incremental por cuenta)
  - Migracion 20260509082629_OrdenNumeroOrden con backfill
    ROW_NUMBER() OVER (PARTITION BY CuentaId ORDER BY FechaEnvio, Id)
  - TicketService.GenerarTicketOrden con header *** ORDEN #N ***
  - Fire-and-forget print al enviar orden
  - KDS MesaCard muestra ORDEN #N grande dorado 1.55rem + badge AGRE.
  - Tablet ResumenCuentaScreen agrupa productos con header Orden N

B6 - Dashboard Punto de Venta:
  - PuntoVentaHomeScreen con 4 botones gigantes live
  - Centro / Barra / Caja / Reportes con datos en tiempo real
  - Logo del header navega a pos-home
  - Default pantalla cambio a pos-home

Builds:
  Backend: 0 errors, 0 warnings
  Admin:   0 errors, 0 warnings
  KDS:     0 errors, 0 warnings
  Tablet:  0 errors, 0 warnings

Validacion E2E: B2 con Chrome MCP, B5 por API + visual KDS,
B1/B3/B4/B6 por API. Migracion B5 aplicada limpio con backfill OK.
"@

    Write-Host ""
    Write-Host "==> 7. COMMIT 3: fix(scripts)" -ForegroundColor Yellow
    git add Scripts/deploy-todo.ps1 Scripts/deploy-admin.ps1 Scripts/deploy-kds.ps1
    git commit -m @"
fix(scripts): deploy scripts copian binario nuevo a Program Files

Bug detectado: dotnet publish escribe a bin\Release\net8.0\publish\
pero el servicio Windows BarAvenidaAPI corre desde
C:\Program Files\Bar Avenida\Server\. Sin copia explicita, los
cambios del backend nunca llegaban a produccion.

Fix:
- deploy-todo.ps1 paso 4.5: robocopy del publish a Program Files
  excluyendo appsettings.json y wwwroot/ (preservacion).
- deploy-admin.ps1 y deploy-kds.ps1: paso 2.5 con mirror
  individual del wwwroot/<frontend>/ a Program Files.
- Test-Path inicial detecta si Program Files existe; si no,
  modo solo desarrollo.

Sin esto, B5 se desplego como frontend pero el backend seguia
sin emitir numeroOrden hasta correr el robocopy manual.
"@

    Write-Host ""
    Write-Host "==> 8. COMMIT 4: docs(specs): plan maestro + 7 specs" -ForegroundColor Yellow
    git add specs/redesign_master.md `
            specs/redesign_b1_centro_operacion.md `
            specs/redesign_b2_servicio_rapido_v2.md `
            specs/redesign_b3_monitor_ventas.md `
            specs/redesign_b4_historico_cuentas.md `
            specs/redesign_b5_folio_orden.md `
            specs/redesign_b6_dashboard_pov.md `
            specs/admin_servicio_rapido.md
    git commit -m @"
docs(specs): plan maestro + 7 specs del rediseno Soft Restaurant

Coronado mando 17 capturas de Soft Restaurant 8.1.0 con la nota
'esto es lo que mas usamos en el bar, lo quiero con un diseno
mucho mas bonito y funcional'.

specs/redesign_master.md:
  Filosofia del rediseno (no copiar Soft Rest, mantener identidad
  Bar Avenida POS, mejorar UX), 6 bloques estimados, orden de
  implementacion, dependencias.

specs/redesign_b1_centro_operacion.md      (~90 min)
specs/redesign_b2_servicio_rapido_v2.md    (~60 min, mockup mejorado)
specs/redesign_b3_monitor_ventas.md        (~60 min)
specs/redesign_b4_historico_cuentas.md     (~60 min)
specs/redesign_b5_folio_orden.md           (~30 min, CRITICO)
specs/redesign_b6_dashboard_pov.md         (~30 min)

specs/admin_servicio_rapido.md:
  Spec original simple del Servicio Rapido (sustituido por B2 v2).
  Mantenido por trazabilidad - es el que Claude Code implemento
  en la sesion anterior.

Todos los specs incluyen mockups visuales, comportamiento detallado,
endpoints, archivos a crear/modificar, casos E2E.
"@

    Write-Host ""
    Write-Host "==> 9. COMMIT 5: chore: ajustes Installer + commit anterior" -ForegroundColor Yellow
    git add Installer/BarAvenidaServer.iss `
            Releases/LEEME.txt `
            Scripts/commit-trabajo-mayo-8.ps1
    git commit -m @"
chore: ajustes Installer + script commit-trabajo-mayo-8

- Installer/BarAvenidaServer.iss: ajustes menores Inno Setup
- Releases/LEEME.txt: actualizacion
- Scripts/commit-trabajo-mayo-8.ps1: el script que cerro el
  trabajo del 8 mayo (no se commiteo en su sesion)
"@

    Write-Host ""
    Write-Host "==> 10. PUSH a GitHub" -ForegroundColor Green
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[!] Push fallo. Los commits estan locales. Reintenta con:" -ForegroundColor Red
        Write-Host "    git push origin main" -ForegroundColor Yellow
        exit 1
    }

    Write-Host ""
    Write-Host "OK Todo subido a GitHub. Ultimos 8 commits:" -ForegroundColor Green
    git log --oneline -8
}
finally {
    Pop-Location
}
