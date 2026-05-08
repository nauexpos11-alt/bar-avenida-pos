$ErrorActionPreference = "Stop"

$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Write-Host "Hay que correr esto como Administrador." -ForegroundColor Red
    exit 1
}

$NombreServicio = "BarAvenidaAPI"
$DisplayName    = "Bar Avenida API"
$Descripcion    = "Backend del POS de Bar Avenida (.NET 8 + EF Core + SignalR)."
$Ejecutable     = "F:\BarAvenida\BarAvenida.API\bin\Release\net8.0\publish\BarAvenida.API.exe"

if (-not (Test-Path $Ejecutable)) {
    Write-Host "ERROR: No existe $Ejecutable" -ForegroundColor Red
    Write-Host "Primero hay que publicar:" -ForegroundColor Yellow
    Write-Host "  cd F:\BarAvenida\BarAvenida.API" -ForegroundColor Cyan
    Write-Host "  dotnet publish -c Release -o bin\Release\net8.0\publish" -ForegroundColor Cyan
    exit 1
}

# Si existe, parar y borrar primero
if (Get-Service -Name $NombreServicio -ErrorAction SilentlyContinue) {
    Write-Host "Eliminando servicio anterior..." -ForegroundColor Yellow
    Stop-Service -Name $NombreServicio -Force -ErrorAction SilentlyContinue
    sc.exe delete $NombreServicio | Out-Null
    Start-Sleep -Seconds 2
}

# Registrar
sc.exe create $NombreServicio binPath= "`"$Ejecutable`"" start= auto DisplayName= "`"$DisplayName`"" | Out-Null
sc.exe description $NombreServicio "$Descripcion" | Out-Null
sc.exe failure $NombreServicio reset= 86400 actions= restart/60000/restart/60000/restart/60000 | Out-Null

Write-Host "Servicio '$DisplayName' instalado." -ForegroundColor Green
Write-Host ""
Write-Host "Para arrancarlo ahora:" -ForegroundColor Yellow
Write-Host "  Start-Service -Name '$NombreServicio'" -ForegroundColor Cyan
