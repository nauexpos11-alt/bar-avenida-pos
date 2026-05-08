# ============================================================================
# Bar Avenida — Instalador de tarea programada para backups
# ----------------------------------------------------------------------------
# Registra una tarea en el Programador de Tareas de Windows que ejecuta
# backup-baravenida.ps1 cada hora, todos los dias, 24/7.
#
# Hay que correrlo UNA SOLA VEZ con permisos de administrador.
# ============================================================================

$ErrorActionPreference = "Stop"

# --- Verificar admin --------------------------------------------------------
$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Write-Host "ERROR: Este script necesita permisos de Administrador." -ForegroundColor Red
    Write-Host "Click derecho sobre PowerShell -> 'Ejecutar como administrador' y vuelve a correr esto." -ForegroundColor Yellow
    exit 1
}

# --- Configuracion ----------------------------------------------------------
$NombreTarea     = "BarAvenida_BackupHorario"
$ScriptBackup    = Join-Path $PSScriptRoot "backup-baravenida.ps1"
$DescripcionTarea = "Backup horario de la base de datos BarAvenida. Genera .bak con retencion de 7 dias."

if (-not (Test-Path $ScriptBackup)) {
    Write-Host "ERROR: No se encontro $ScriptBackup" -ForegroundColor Red
    exit 1
}

# --- Si la tarea ya existe, eliminarla ---------------------------------------
$tareaExistente = Get-ScheduledTask -TaskName $NombreTarea -ErrorAction SilentlyContinue
if ($tareaExistente) {
    Write-Host "Eliminando tarea existente '$NombreTarea'..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $NombreTarea -Confirm:$false
}

# --- Definir la accion -------------------------------------------------------
$accion = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptBackup`""

# --- Trigger: cada hora desde la medianoche, todos los dias ------------------
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddHours(1)
$trigger.Repetition = (New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 3650)).Repetition

# --- Configuracion: corre aunque no haya sesion de usuario abierta -----------
$principal = New-ScheduledTaskPrincipal `
    -UserId "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

$config = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

# --- Registrar tarea ---------------------------------------------------------
Register-ScheduledTask `
    -TaskName $NombreTarea `
    -Description $DescripcionTarea `
    -Action $accion `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $config | Out-Null

Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  TAREA DE BACKUP REGISTRADA" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Nombre:       $NombreTarea"
Write-Host "  Ejecuta:      $ScriptBackup"
Write-Host "  Frecuencia:   cada 1 hora, 24/7"
Write-Host "  Cuenta:       SYSTEM (corre siempre)"
Write-Host "  Carpeta:      F:\BarAvenida\Backups"
Write-Host "  Retencion:    7 dias"
Write-Host ""
Write-Host "Para ejecutar la tarea AHORA mismo y probar:" -ForegroundColor Yellow
Write-Host "  Start-ScheduledTask -TaskName '$NombreTarea'" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para ver el log:" -ForegroundColor Yellow
Write-Host "  Get-Content F:\BarAvenida\Backups\backup.log -Tail 20" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para desinstalar:" -ForegroundColor Yellow
Write-Host "  Unregister-ScheduledTask -TaskName '$NombreTarea' -Confirm:`$false" -ForegroundColor Cyan
Write-Host ""
