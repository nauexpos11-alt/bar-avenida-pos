# ============================================================================
# Bar Avenida - Instalar tarea programada de auto-update
# Cada 6 horas, la PC del bar checa GitHub Releases y se actualiza si hay
# version nueva. Corre como SYSTEM, silent, sin molestar al bar.
# ============================================================================

$ErrorActionPreference = "Continue"

$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Write-Host "Hay que correr esto como Administrador." -ForegroundColor Red
    exit 1
}

$WorkDir = "C:\BarAvenida"
New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null

# Copiar actualizar-bar.ps1 a C:\BarAvenida si esta en otra ubicacion
$srcScript = "$PSScriptRoot\actualizar-bar.ps1"
$dstScript = "$WorkDir\actualizar-bar.ps1"

if (Test-Path $srcScript) {
    Copy-Item $srcScript $dstScript -Force
} elseif (-not (Test-Path $dstScript)) {
    # Descargar de GitHub si no esta local
    Write-Host "Descargando actualizar-bar.ps1 de GitHub..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri "https://raw.githubusercontent.com/nauexpos11-alt/bar-avenida-pos/main/Scripts/actualizar-bar.ps1" `
            -OutFile $dstScript -UseBasicParsing
    } catch {
        Write-Host "[FAIL] No se pudo descargar de GitHub: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "       Pon a mano el archivo en $dstScript" -ForegroundColor Yellow
        exit 1
    }
}

# Borrar tarea anterior si existe
$nombreTarea = "BarAvenida_AutoUpdate"
Get-ScheduledTask -TaskName $nombreTarea -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false

# Crear nueva tarea: cada 6 horas, corre como SYSTEM
$accion = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$dstScript`""

$trigger1 = New-ScheduledTaskTrigger -Daily -At "03:00AM"
$trigger1.Repetition = (New-ScheduledTaskTrigger -Once -At "03:00AM" -RepetitionInterval (New-TimeSpan -Hours 6)).Repetition

$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask -TaskName $nombreTarea `
    -Action $accion `
    -Trigger $trigger1 `
    -Principal $principal `
    -Settings $settings `
    -Description "Bar Avenida: chequea GitHub Releases cada 6h y se actualiza solo." | Out-Null

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  TAREA AUTO-UPDATE INSTALADA" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Nombre: $nombreTarea" -ForegroundColor Cyan
Write-Host "Corre cada 6 horas como SYSTEM (sin molestar al usuario)." -ForegroundColor Gray
Write-Host "Log de cada corrida: C:\BarAvenida\actualizar-bar.log" -ForegroundColor Gray
Write-Host ""
Write-Host "Para probar AHORA:" -ForegroundColor Yellow
Write-Host "  Start-ScheduledTask -TaskName '$nombreTarea'" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para chequear sin instalar:" -ForegroundColor Yellow
Write-Host "  powershell -ExecutionPolicy Bypass -File C:\BarAvenida\actualizar-bar.ps1 -SoloChequear" -ForegroundColor Cyan
Write-Host ""
