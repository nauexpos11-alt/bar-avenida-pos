# ============================================================================
# Bar Avenida - Instalador de tarea programada para health check diario
# ----------------------------------------------------------------------------
# Registra una tarea en el Programador de Tareas que ejecuta health-check.ps1
# cada dia a las 8:00 a.m. en modo silencioso (escribe a F:\BarAvenida\Logs\health-check.log).
#
# Hay que correrlo UNA SOLA VEZ con permisos de Administrador.
# ============================================================================

$ErrorActionPreference = "Stop"

$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Write-Host "ERROR: Este script necesita permisos de Administrador." -ForegroundColor Red
    Write-Host "Click derecho sobre PowerShell -> 'Ejecutar como administrador' y vuelve a correr esto." -ForegroundColor Yellow
    exit 1
}

$NombreTarea     = "BarAvenida_HealthCheckDiario"
$ScriptHealth    = Join-Path $PSScriptRoot "health-check.ps1"
$DescripcionTarea = "Health check diario de Bar Avenida. Verifica servicio, BD, backups, logs. Escribe resultado a F:\BarAvenida\Logs\health-check.log."

if (-not (Test-Path $ScriptHealth)) {
    Write-Host "ERROR: No se encontro $ScriptHealth" -ForegroundColor Red
    exit 1
}

# Eliminar tarea existente si esta
$tareaExistente = Get-ScheduledTask -TaskName $NombreTarea -ErrorAction SilentlyContinue
if ($tareaExistente) {
    Write-Host "Eliminando tarea existente '$NombreTarea'..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $NombreTarea -Confirm:$false
}

# Accion: correr health-check.ps1 -Silent
$accion = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptHealth`" -Silent"

# Trigger: todos los dias a las 8:00 a.m.
$trigger = New-ScheduledTaskTrigger -Daily -At "8:00am"

# Cuenta SYSTEM (corre aunque no haya sesion abierta)
$principal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

$config = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5)

Register-ScheduledTask `
    -TaskName $NombreTarea `
    -Description $DescripcionTarea `
    -Action $accion `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $config | Out-Null

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  TAREA HEALTH CHECK DIARIO REGISTRADA" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Nombre:      $NombreTarea"
Write-Host "  Ejecuta:     $ScriptHealth -Silent"
Write-Host "  Frecuencia:  todos los dias 8:00 a.m."
Write-Host "  Cuenta:      SYSTEM (corre siempre)"
Write-Host "  Log:         F:\BarAvenida\Logs\health-check.log"
Write-Host ""
Write-Host "Para ejecutar la tarea AHORA mismo:" -ForegroundColor Yellow
Write-Host "  Start-ScheduledTask -TaskName '$NombreTarea'" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para ver el log de health checks pasados:" -ForegroundColor Yellow
Write-Host "  Get-Content F:\BarAvenida\Logs\health-check.log -Tail 10" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para desinstalar:" -ForegroundColor Yellow
Write-Host "  Unregister-ScheduledTask -TaskName '$NombreTarea' -Confirm:`$false" -ForegroundColor Cyan
Write-Host ""
