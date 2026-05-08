# Detener servicio
Stop-Service -Name "BarAvenidaAPI" -Force -ErrorAction SilentlyContinue

# Limpiar build
Push-Location F:\BarAvenida\BarAvenida.API
Remove-Item -Recurse -Force bin, obj -ErrorAction SilentlyContinue

# Publicar Release
dotnet publish -c Release -o bin\Release\net8.0\publish
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build fallo." -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

# Reinstalar y arrancar
& F:\BarAvenida\Scripts\install-service.ps1
Start-Service -Name "BarAvenidaAPI"
Start-Sleep -Seconds 3
Get-Service -Name "BarAvenidaAPI"
