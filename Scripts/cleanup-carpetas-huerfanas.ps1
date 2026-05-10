# =============================================================
# Cleanup de carpetas huerfanas / basura en el repo
# Ejecutar:  powershell -ExecutionPolicy Bypass -File Scripts\cleanup-carpetas-huerfanas.ps1
# =============================================================

$ErrorActionPreference = "Continue"
Push-Location "E:\bar-avenida-pos"

try {
    Write-Host "=== Cleanup de carpetas huerfanas ===" -ForegroundColor Cyan
    Write-Host ""

    # --- Carpeta huerfana: "Bar Avenida\BarAvenida.Tablet\public\" ---
    # Contiene solo icon-192.png e icon-512.png duplicados.
    # Los originales correctos viven en BarAvenida.Tablet\public\ sin folder extra.
    $orphan = "E:\bar-avenida-pos\Bar Avenida"
    if (Test-Path $orphan) {
        Write-Host "[1] Encontrada carpeta huerfana:" -ForegroundColor Yellow
        Write-Host "    $orphan"
        $files = Get-ChildItem -Path $orphan -Recurse -File
        Write-Host "    Contenido ($($files.Count) archivos):"
        foreach ($f in $files) {
            $kb = [math]::Round($f.Length / 1KB, 1)
            Write-Host "      - $($f.FullName.Replace($orphan, '')) ($kb KB)"
        }
        Write-Host ""
        $confirm = Read-Host "Borrar carpeta y subarbol completo? (s/n)"
        if ($confirm -eq "s" -or $confirm -eq "S") {
            Remove-Item -Path $orphan -Recurse -Force
            Write-Host "[OK] Carpeta borrada." -ForegroundColor Green
        } else {
            Write-Host "[SKIP] Carpeta NO borrada." -ForegroundColor Gray
        }
    } else {
        Write-Host "[1] No hay carpeta huerfana 'Bar Avenida\'. OK." -ForegroundColor Green
    }
    Write-Host ""

    # --- Verificar que los iconos correctos siguen en su lugar ---
    Write-Host "[2] Verificar iconos correctos en BarAvenida.Tablet\public\" -ForegroundColor Cyan
    $iconsOk = $true
    foreach ($icon in @("icon-192.png", "icon-512.png", "icons.svg")) {
        $p = "E:\bar-avenida-pos\BarAvenida.Tablet\public\$icon"
        if (Test-Path $p) {
            Write-Host "    [OK] $icon" -ForegroundColor Green
        } else {
            Write-Host "    [FALTA] $icon" -ForegroundColor Red
            $iconsOk = $false
        }
    }
    Write-Host ""

    if ($iconsOk) {
        Write-Host "Cleanup terminado. Iconos correctos confirmados." -ForegroundColor Green
    } else {
        Write-Host "ATENCION: faltan iconos en la ubicacion correcta. NO hagas commit aun." -ForegroundColor Red
    }
}
finally {
    Pop-Location
}
