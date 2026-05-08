# ============================================================================
# Bar Avenida - Instalar tarea programada para auto-preparar PC
# ----------------------------------------------------------------------------
# Esto corre UNA SOLA VEZ como Administrador.
# Despues de eso, la PC ejecuta preparar-pc.ps1 automaticamente:
#   - Al arrancar Windows (por si la IP cambio)
#   - Cuando se conecta a una red nueva (cambio de WiFi)
#
# Uso (PowerShell admin, una sola vez):
#   F:\BarAvenida\Scripts\instalar-tarea-auto.ps1
#
# Para desinstalar:
#   F:\BarAvenida\Scripts\instalar-tarea-auto.ps1 -Desinstalar
# ============================================================================

param(
    [switch]$Desinstalar
)

$ErrorActionPreference = "Stop"

$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Write-Host "Hay que correr esto como Administrador." -ForegroundColor Red
    exit 1
}

$nombreTarea = "BarAvenida_AutoPrepararPC"
$scriptPath  = "F:\BarAvenida\Scripts\preparar-pc.ps1"
$logDir      = "F:\BarAvenida\Logs"

# ============================================================================
# DESINSTALAR
# ============================================================================
if ($Desinstalar) {
    $existe = Get-ScheduledTask -TaskName $nombreTarea -ErrorAction SilentlyContinue
    if ($existe) {
        Unregister-ScheduledTask -TaskName $nombreTarea -Confirm:$false
        Write-Host "[OK] Tarea $nombreTarea eliminada" -ForegroundColor Green
    } else {
        Write-Host "Tarea $nombreTarea no existe, nada que desinstalar" -ForegroundColor Yellow
    }
    exit 0
}

# ============================================================================
# VALIDAR PRERREQUISITOS
# ============================================================================
if (-not (Test-Path $scriptPath)) {
    Write-Host "[ERROR] No se encontro $scriptPath" -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Path $logDir -Force -ErrorAction SilentlyContinue | Out-Null

Write-Host ""
Write-Host "================================================" -ForegroundColor Magenta
Write-Host "  INSTALAR TAREA AUTO-PREPARAR PC" -ForegroundColor Magenta
Write-Host "================================================" -ForegroundColor Magenta
Write-Host ""

# ============================================================================
# CREAR WRAPPER QUE LOGEA LA SALIDA
# ============================================================================
# La tarea programada llama a este wrapper, que corre preparar-pc.ps1 y guarda
# todo el output en F:\BarAvenida\Logs\auto-preparar-YYYYMMDD-HHMM.log

$wrapperPath = "F:\BarAvenida\Scripts\auto-preparar-wrapper.ps1"

@'
# Wrapper auto-generado por instalar-tarea-auto.ps1
# NO EDITAR A MANO, se regenera al reinstalar la tarea.

$ts      = Get-Date -Format "yyyyMMdd-HHmm"
$logFile = "F:\BarAvenida\Logs\auto-preparar-$ts.log"

# Espera 30s al arranque para que la red termine de inicializar
# (DHCP a veces tarda en asignar IP despues de boot)
Start-Sleep -Seconds 30

try {
    & "F:\BarAvenida\Scripts\preparar-pc.ps1" *>&1 | Tee-Object -FilePath $logFile

    # Limpiar logs viejos (mas de 30 dias)
    Get-ChildItem "F:\BarAvenida\Logs\auto-preparar-*.log" |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
        Remove-Item -Force -ErrorAction SilentlyContinue
} catch {
    Add-Content -Path $logFile -Value "EXCEPCION: $_"
}
'@ | Set-Content -Path $wrapperPath -Encoding UTF8

Write-Host "[OK] Wrapper creado: $wrapperPath" -ForegroundColor Green

# ============================================================================
# CREAR TAREA PROGRAMADA
# ============================================================================
Write-Host "Creando tarea programada..." -ForegroundColor Yellow

# Eliminar tarea vieja si existe
$existe = Get-ScheduledTask -TaskName $nombreTarea -ErrorAction SilentlyContinue
if ($existe) {
    Unregister-ScheduledTask -TaskName $nombreTarea -Confirm:$false
    Write-Host "  (tarea vieja eliminada para reinstalar)" -ForegroundColor Gray
}

# Trigger 1: Al arrancar Windows
$triggerArranque = New-ScheduledTaskTrigger -AtStartup

# Trigger 2: Al cambio de perfil de red (event 10000)
# Esto se dispara cada vez que Windows detecta una red nueva (WiFi distinto)
$cimTriggerXml = @"
<QueryList>
  <Query Id="0" Path="Microsoft-Windows-NetworkProfile/Operational">
    <Select Path="Microsoft-Windows-NetworkProfile/Operational">*[System[Provider[@Name='Microsoft-Windows-NetworkProfile'] and EventID=10000]]</Select>
  </Query>
</QueryList>
"@

$cimClass     = Get-CimClass -ClassName MSFT_TaskEventTrigger -Namespace Root/Microsoft/Windows/TaskScheduler
$triggerEvento = New-CimInstance -CimClass $cimClass -Property @{
    Subscription = $cimTriggerXml
    Enabled      = $true
} -ClientOnly

# Accion: correr el wrapper en PowerShell con bypass de execution policy
$accion = New-ScheduledTaskAction `
    -Execute "PowerShell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$wrapperPath`""

# Configuracion: corre como SYSTEM con privilegios mas altos
$principal = New-ScheduledTaskPrincipal `
    -UserId "NT AUTHORITY\SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel Highest

# Settings: permitir batteria, deja de correr si toma >30 min, no correr si red no disponible
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 2)

Register-ScheduledTask `
    -TaskName $nombreTarea `
    -Description "Bar Avenida: detecta IP, abre firewall, recompila frontends y reinicia servicio. Corre al arrancar y al cambiar de WiFi." `
    -Trigger @($triggerArranque, $triggerEvento) `
    -Action $accion `
    -Principal $principal `
    -Settings $settings | Out-Null

Write-Host "[OK] Tarea $nombreTarea registrada" -ForegroundColor Green
Write-Host ""

# ============================================================================
# RESUMEN
# ============================================================================
Write-Host "================================================" -ForegroundColor Green
Write-Host "  TAREA AUTOMATICA INSTALADA" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "A partir de ahora la PC se prepara SOLA cuando:" -ForegroundColor Yellow
Write-Host "  1. Arranca Windows (por si la IP cambio durante apagado)" -ForegroundColor Gray
Write-Host "  2. Te conectas a una red WiFi distinta (casa <-> bar)" -ForegroundColor Gray
Write-Host ""
Write-Host "Logs de cada ejecucion:" -ForegroundColor Yellow
Write-Host "  $logDir\auto-preparar-YYYYMMDD-HHMM.log" -ForegroundColor Gray
Write-Host ""
Write-Host "Para ver la tarea en Windows:" -ForegroundColor Yellow
Write-Host "  taskschd.msc -> Biblioteca del Programador de tareas -> $nombreTarea" -ForegroundColor Gray
Write-Host ""
Write-Host "Para correrla AHORA mismo (sin esperar reinicio):" -ForegroundColor Yellow
Write-Host "  Start-ScheduledTask -TaskName $nombreTarea" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para desinstalar:" -ForegroundColor Yellow
Write-Host "  F:\BarAvenida\Scripts\instalar-tarea-auto.ps1 -Desinstalar" -ForegroundColor Cyan
Write-Host ""
