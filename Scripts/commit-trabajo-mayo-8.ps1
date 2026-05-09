# commit-trabajo-mayo-8.ps1
# ----------------------------------------------------------------------------
# Cierra el trabajo del 8 mayo 2026 con commits limpios y push a GitHub.
# Generado por Cowork. Coronado lo corre UNA VEZ desde F:\BarAvenida.
# ----------------------------------------------------------------------------

$ErrorActionPreference = "Stop"

Push-Location "F:\BarAvenida"

try {
    Write-Host "==> 1. Limpieza de pollution del sandbox Linux" -ForegroundColor Cyan
    if (Test-Path ".git\index.lock") {
        Remove-Item ".git\index.lock" -Force
        Write-Host "   eliminado: .git\index.lock"
    }
    if (Test-Path "Releases\LEEME.txt.test") {
        Remove-Item "Releases\LEEME.txt.test" -Force
        Write-Host "   eliminado: Releases\LEEME.txt.test"
    }

    Write-Host ""
    Write-Host "==> 2. Revertir line-endings (CRLF->LF) que son ruido" -ForegroundColor Cyan
    git checkout -- BarAvenida.API/Migrations/ Releases/LEEME.txt
    Write-Host "   migrations + LEEME.txt revertidos al original LF"

    Write-Host ""
    Write-Host "==> 3. Agregar wwwroot/admin y wwwroot/kds al .gitignore" -ForegroundColor Cyan
    $gitignorePath = ".gitignore"
    $content = Get-Content $gitignorePath -Raw
    if ($content -notmatch "wwwroot/admin") {
        $append = @"

# Build outputs de Admin y KDS (vite escribe directo a wwwroot/)
BarAvenida.API/wwwroot/admin/
BarAvenida.API/wwwroot/kds/
"@
        Add-Content -Path $gitignorePath -Value $append -NoNewline
        Write-Host "   .gitignore actualizado"
    } else {
        Write-Host "   .gitignore ya tiene la entrada"
    }

    # git rm los wwwroot/admin y wwwroot/kds que estan en el index pero deletes en disco
    git rm -r --cached --ignore-unmatch BarAvenida.API/wwwroot/admin/ 2>$null | Out-Null
    git rm -r --cached --ignore-unmatch BarAvenida.API/wwwroot/kds/ 2>$null | Out-Null
    Write-Host "   wwwroot/admin y wwwroot/kds removidos del index"

    Write-Host ""
    Write-Host "==> 4. Verificar git status" -ForegroundColor Cyan
    git status --short
    Write-Host ""

    Read-Host "Presiona ENTER para continuar con los 4 commits, o Ctrl+C para abortar"

    Write-Host ""
    Write-Host "==> 5. COMMIT 1: chore(.gitignore)" -ForegroundColor Yellow
    git add .gitignore
    git commit -m "chore(.gitignore): excluir wwwroot/admin y wwwroot/kds (build outputs)"

    Write-Host ""
    Write-Host "==> 6. COMMIT 2: fix(frontend) API URL robusta" -ForegroundColor Yellow
    git add BarAvenida.Admin/src/api.js BarAvenida.Admin/.env BarAvenida.KDS/src/App.jsx BarAvenida.KDS/.env
    git commit -m @"
fix(frontend): API URL robusta con fallback a window.location.origin

- Admin/src/api.js y KDS/src/App.jsx: nueva funcion resolverApiUrl()
  que ignora VITE_API_URL si es invalida (ej. 'http://' sin host).
- Cuando el frontend se sirve desde el backend (/admin, /kds), usa
  automaticamente window.location.origin sin importar la IP del bar.
- .env de Admin y KDS limpiados (VITE_API_URL vacio, no 'http://').

Resuelve el bug donde Admin y KDS se quedaban conectando a
'http:///api/...' por el VITE_API_URL invalido en .env.
"@

    Write-Host ""
    Write-Host "==> 7. COMMIT 3: feat(admin) v2 estilo Soft Restaurant" -ForegroundColor Yellow
    git add BarAvenida.Admin/src/App.jsx `
            BarAvenida.Admin/src/components/TopMenuBar.jsx `
            BarAvenida.Admin/src/components/TopMenuBar.css `
            BarAvenida.Admin/src/screens/CatalogoProductosScreen.jsx `
            BarAvenida.Admin/src/screens/CatalogoProductosScreen.css `
            specs/admin_v2_estilo_soft_restaurant.md
    git commit -m @"
feat(admin): v2 estilo Soft Restaurant - hubs PUNTO DE VENTA / ADMINISTRACION

- TopMenuBar reescrito con 2 secciones (PUNTO DE VENTA / ADMINISTRACION)
  + sub-tabs por seccion + hubs con dropdown.
- CatalogoProductosScreen: layout split lista izquierda (flex 1) +
  editor derecha (380px fijo).
- F3 ahora navega a 'caja-corte-z'.
- Spec: specs/admin_v2_estilo_soft_restaurant.md

Mantiene toda la funcionalidad anterior. Conserva archivos JSX/CSS
no usados (regla de oro del proyecto).
"@

    Write-Host ""
    Write-Host "==> 8. COMMIT 4: chore scripts + Inno Setup" -ForegroundColor Yellow
    git add Scripts/auto-rebuild-admin.bat `
            Scripts/importar-catalogo-bar.sql `
            Scripts/limpiar-catalogo.sql `
            Scripts/reset-admin-pin.sql `
            Installer/BarAvenidaServer.iss
    git commit -m @"
chore: scripts de catalogo + reset PIN + Inno Setup

- Scripts/importar-catalogo-bar.sql: catalogo del bar (147 productos
  en 17 categorias) idempotente.
- Scripts/limpiar-catalogo.sql: limpieza de duplicados.
- Scripts/reset-admin-pin.sql: reset emergencia PIN admin a 1234
  con BCrypt (\$2b\$11\$4AM.Vao6Za/J4yqeL/lA6e45xPMJ2WhRKgWGLUuPUb5d1H0/V7sra).
- Scripts/auto-rebuild-admin.bat: auto-rebuild del Admin tras edits.
- Installer/BarAvenidaServer.iss: ajustes Inno Setup.
"@

    Write-Host ""
    Write-Host "==> 9. PUSH a GitHub" -ForegroundColor Green
    git push origin main

    Write-Host ""
    Write-Host "OK Todo subido a GitHub. Ultimos 6 commits:" -ForegroundColor Green
    git log --oneline -6
}
finally {
    Pop-Location
}
