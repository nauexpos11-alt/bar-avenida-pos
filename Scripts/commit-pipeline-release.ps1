# ============================================================================
# Bar Avenida - Commit + push del pipeline de release y auto-update
# Auto-arregla el problema "dubious ownership" de git en disco externo (E:)
# ============================================================================

$ErrorActionPreference = "Continue"

# ──────────────────────────────────────────────────────────
# 0. Fix git "dubious ownership" en disco externo E:
# ──────────────────────────────────────────────────────────
Write-Host "=== Configurando git safe.directory ===" -ForegroundColor Cyan
git config --global --add safe.directory E:/bar-avenida-pos 2>&1 | Out-Null
git config --global --add safe.directory "E:\bar-avenida-pos" 2>&1 | Out-Null
Write-Host "  [OK] git safe.directory configurado para E:/bar-avenida-pos" -ForegroundColor Green
Write-Host ""

Push-Location "E:\bar-avenida-pos"

try {
    Write-Host "=== Verificando estado del repo ===" -ForegroundColor Cyan
    $status = git status --short 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: git todavia falla. Output:" -ForegroundColor Red
        Write-Host $status
        Pop-Location
        exit 1
    }
    Write-Host $status
    Write-Host ""

    # Si no hay nada que commitear, parar
    if (-not $status) {
        Write-Host "[INFO] No hay cambios para commitear." -ForegroundColor Yellow
        Pop-Location
        exit 0
    }

    Read-Host "Presiona ENTER para hacer los 4 commits + push"

    # --- COMMIT 1: Scripts de release y auto-update ---
    Write-Host ""
    Write-Host "==> COMMIT 1: feat(release): pipeline de release y auto-update" -ForegroundColor Yellow
    git add Scripts/release-total.ps1                 2>&1 | Out-Null
    git add Scripts/actualizar-bar.ps1                2>&1 | Out-Null
    git add Scripts/instalar-todo.ps1                 2>&1 | Out-Null
    git add Scripts/install-tarea-auto-update.ps1     2>&1 | Out-Null
    git add Scripts/cleanup-carpetas-huerfanas.ps1    2>&1 | Out-Null

    $msg1 = "feat(release): pipeline completo de release + auto-update via GitHub Releases`n`n" +
            "Scripts nuevos:`n" +
            "- release-total.ps1: desde la PC admin, un solo comando que bumpa versions,`n" +
            "  compila los 3 frontends, hace dotnet publish self-contained, corre`n" +
            "  Inno Setup (Server.exe) y electron-builder (Admin.exe + KDS.exe),`n" +
            "  junta los 3 en Releases/ y publica GitHub Release con gh CLI.`n" +
            "  Auto-detecta si esta en F:\BarAvenida (PC del bar) o E:\bar-avenida-pos`n" +
            "  (PC admin de Coronado en casa, NAU).`n" +
            "- actualizar-bar.ps1: en cualquier PC cliente, consulta GitHub Releases,`n" +
            "  compara version, descarga e instala silent (Inno /VERYSILENT, NSIS /S).`n" +
            "- instalar-todo.ps1: primera instalacion en PC nueva.`n" +
            "- install-tarea-auto-update.ps1: registra tarea programada cada 6h.`n" +
            "- cleanup-carpetas-huerfanas.ps1: limpia 'Bar Avenida' duplicado.`n`n" +
            "Arquitectura final:`n" +
            "  NAU (admin) -- release-total.ps1 --> GitHub Releases --> PCs cliente"
    git commit -m $msg1 2>&1 | Out-Host

    # --- COMMIT 2: Documentacion ---
    Write-Host ""
    Write-Host "==> COMMIT 2: docs: COMO_INSTALAR_EN_PC_NUEVA.md" -ForegroundColor Yellow
    git add COMO_INSTALAR_EN_PC_NUEVA.md 2>&1 | Out-Null

    $msg2 = "docs(install): guia paso a paso de instalacion en PC nueva`n`n" +
            "Cubre prerequisitos SQL Server, comando unico de instalacion (irm | iex),`n" +
            "configuracion de auto-update, conexion de tablets, troubleshooting."
    git commit -m $msg2 2>&1 | Out-Host

    # --- COMMIT 3: Spec auto-update completo ---
    Write-Host ""
    Write-Host "==> COMMIT 3: docs(spec): auto_update_completo.md" -ForegroundColor Yellow
    git add specs/auto_update_completo.md 2>&1 | Out-Null

    $msg3 = "docs(spec): auto_update_completo para electron-updater + backend endpoint`n`n" +
            "Hand-off para Claude Code que extiende el pipeline actual con:`n" +
            "- electron-updater en Admin y KDS Desktop`n" +
            "- Endpoint POST /api/admin/sistema/update-now con PIN admin`n" +
            "- Self-update del backend via BAT desadosado`n" +
            "- UI en Admin para forzar update sin TeamViewer."
    git commit -m $msg3 2>&1 | Out-Host

    # --- COMMIT 4: CLAUDE.md + commit script ---
    Write-Host ""
    Write-Host "==> COMMIT 4: docs(claude): memoria Mayo 10 + commit script" -ForegroundColor Yellow
    git add CLAUDE.md 2>&1 | Out-Null
    git add Scripts/commit-pipeline-release.ps1 2>&1 | Out-Null

    $msg4 = "docs(claude): sesion Mayo 10 - audit completo + pipeline release`n`n" +
            "- Documenta el rediseno B1-B6 de Mayo 9 que faltaba.`n" +
            "- Documenta el pipeline de release con GitHub Releases.`n" +
            "- Tabla de discrepancia entre project_instructions y codigo real.`n" +
            "- Pendientes que requieren decision de Coronado."
    git commit -m $msg4 2>&1 | Out-Host

    # --- PUSH ---
    Write-Host ""
    Write-Host "==> PUSH a origin/main" -ForegroundColor Green
    git push origin main 2>&1 | Out-Host

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Ultimos 6 commits:" -ForegroundColor Green
        git log --oneline -6
    }

    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "  PUSH COMPLETADO" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verifica los scripts en GitHub:" -ForegroundColor Yellow
    Write-Host "  https://github.com/nauexpos11-alt/bar-avenida-pos/blob/main/Scripts/instalar-todo.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Siguiente paso: corre release-total.ps1 -Version 1.2.0" -ForegroundColor Yellow
    Write-Host "  E:\bar-avenida-pos\Scripts\release-total.ps1 -Version 1.2.0" -ForegroundColor Cyan
    Write-Host ""
}
finally {
    Pop-Location
}
