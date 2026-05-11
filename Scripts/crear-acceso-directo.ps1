# ============================================================================
# Bar Avenida - Crear accesos directos en el escritorio
# Para PCs admin secundarias que solo usan Chrome/Edge (sin .exe instalado).
# ============================================================================

param(
    [string]$IP = "192.168.100.10"
)

$desktop = [Environment]::GetFolderPath("Desktop")
$wsh     = New-Object -ComObject WScript.Shell

function Crear-Acceso {
    param([string]$Nombre, [string]$Url, [string]$IconoPath)

    $lnkPath = Join-Path $desktop "$Nombre.url"
    @"
[InternetShortcut]
URL=$Url
IconIndex=0
"@ | Out-File -FilePath $lnkPath -Encoding ASCII

    Write-Host "[OK] $Nombre -> $Url" -ForegroundColor Green
}

Write-Host ""
Write-Host "Creando accesos directos para IP $IP..." -ForegroundColor Cyan
Write-Host ""

Crear-Acceso -Nombre "Bar Avenida - Tablet"  -Url "http://${IP}:7000/tablet/"
Crear-Acceso -Nombre "Bar Avenida - Admin"   -Url "http://${IP}:7000/admin/"
Crear-Acceso -Nombre "Bar Avenida - KDS"     -Url "http://${IP}:7000/kds"

Write-Host ""
Write-Host "Accesos directos creados en el escritorio." -ForegroundColor Green
Write-Host "Doble click los abre en tu navegador default." -ForegroundColor Gray
Write-Host ""
