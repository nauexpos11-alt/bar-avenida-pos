$NombreServicio = "BarAvenidaAPI"
Stop-Service -Name $NombreServicio -Force -ErrorAction SilentlyContinue
sc.exe delete $NombreServicio
Write-Host "Servicio eliminado." -ForegroundColor Green
