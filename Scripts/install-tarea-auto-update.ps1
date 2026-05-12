# ============================================================================
# Bar Avenida - Auto-update 100% silencioso (sin notificador, sin clicks)
#
# Una sola tarea: BarAvenida_AutoUpdate
# Triggers:
#   - Al boot de la PC (5 min despues)
#   - Cada 30 minutos (polling rapido)
#   - Diaria 3:30 AM (red de seguridad)
#
# Como corre como SYSTEM, NO requiere UAC ni clicks.
# El script actualizar-bar.ps1 SIN -Force respeta la ventana de instalacion
# (3 AM - 7 AM por default), asi que durante operacion del bar NO interrumpe.
# Solo aplica la actualizacion cuando entra esa ventana.
#
# El Notificador interactivo se DESACTIVA. El bar JAMAS ve cuadritos de update.
# ============================================================================

$ErrorActionPreference = "Continue"

$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Write-Host "Hay que correr esto como Administrador." -ForegroundColor Red
    exit 1
}

$WorkDir = "C:\BarAvenida"
New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null

# Copiar scripts a C:\BarAvenida
function CopiarScript {
    param([string]$Nombre)
    $src = "$PSScriptRoot\$Nombre"
    $dst = "$WorkDir\$Nombre"

    if ((Resolve-Path $src -ErrorAction SilentlyContinue).Path -eq (Resolve-Path $dst -ErrorAction SilentlyContinue).Path) {
        return $dst
    }

    if (Test-Path $src) {
        Copy-Item $src $dst -Force -ErrorAction SilentlyContinue
        return $dst
    } elseif (Test-Path $dst) {
        return $dst
    } else {
        Write-Host "Descargando $Nombre de GitHub..." -ForegroundColor Yellow
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri "https://raw.githubusercontent.com/nauexpos11-alt/bar-avenida-pos/main/Scripts/$Nombre" `
                -OutFile $dst -UseBasicParsing
            return $dst
        } catch {
            Write-Host "[FAIL] No se pudo descargar $Nombre" -ForegroundColor Red
            return $null
        }
    }
}

$scriptActualizar  = CopiarScript "actualizar-bar.ps1"
$scriptUiWrapper   = CopiarScript "instalar-con-ui.ps1"
# notificador-update.ps1 ya no se usa pero lo copiamos por si alguien quiere correrlo manual
CopiarScript "notificador-update.ps1" | Out-Null

if (-not $scriptActualizar) {
    Write-Host "[FAIL] Falta actualizar-bar.ps1. Abortando." -ForegroundColor Red
    exit 1
}

# ──────────────────────────────────────────────────────────
# DESACTIVAR Notificador interactivo (cero clicks del personal del bar)
# ──────────────────────────────────────────────────────────
$nombreNotificador = "BarAvenida_Notificador"
$tareaVieja = Get-ScheduledTask -TaskName $nombreNotificador -ErrorAction SilentlyContinue
if ($tareaVieja) {
    $tareaVieja | Unregister-ScheduledTask -Confirm:$false
    Write-Host "[OK] Notificador interactivo $nombreNotificador desactivado (cero clicks del personal)" -ForegroundColor Yellow
}

# ──────────────────────────────────────────────────────────
# TAREA UNICA: AUTO-UPDATE SYSTEM con polling
# ──────────────────────────────────────────────────────────
$nombreAuto = "BarAvenida_AutoUpdate"
Get-ScheduledTask -TaskName $nombreAuto -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false

# IMPORTANTE: SIN -Force => respeta la ventana 3-7 AM del actualizar-bar.ps1
# Durante operacion del bar el polling SOLO consulta, NO instala. Cuando entra
# la ventana 3 AM aplica la version mas reciente disponible en GitHub.
$accionAuto = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptActualizar`""

# TRIGGERS:
# 1) Al boot (5 min despues)
$triggerBoot = New-ScheduledTaskTrigger -AtStartup
$triggerBoot.Delay = "PT5M"

# 2) Cada 30 min (polling)
$triggerPolling = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(5) `
    -RepetitionInterval (New-TimeSpan -Minutes 30) `
    -RepetitionDuration ([TimeSpan]::FromDays(3650))

# 3) Diaria 3:30 AM (cuando bar cerrado, garantia de aplicar lo descargado)
$triggerDiario = New-ScheduledTaskTrigger -Daily -At "03:30AM"

# SYSTEM (no requiere UI, no requiere UAC)
$principalAuto = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Una sola instancia a la vez
$settingsAuto = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
    -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $nombreAuto `
    -Action $accionAuto `
    -Trigger @($triggerBoot, $triggerPolling, $triggerDiario) `
    -Principal $principalAuto `
    -Settings $settingsAuto `
    -Description "Bar Avenida: auto-update polling cada 30 min + boot + 3:30 AM. Silencioso, sin clicks. Solo instala en ventana 3-7 AM (no interrumpe operacion)." | Out-Null

Write-Host "[OK] Tarea $nombreAuto registrada (polling cada 30 min, instala en ventana 3-7 AM)" -ForegroundColor Green
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  AUTO-UPDATE 100% SILENCIOSO ACTIVADO" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Como funciona:" -ForegroundColor Cyan
Write-Host "  1. Cada 30 min la PC consulta GitHub" -ForegroundColor Gray
Write-Host "  2. Si hay version nueva, la descarga" -ForegroundColor Gray
Write-Host "  3. Solo INSTALA entre 3 AM y 7 AM (bar cerrado)" -ForegroundColor Gray
Write-Host "  4. Cero clicks, cero ventanas, cero intervencion del personal" -ForegroundColor Gray
Write-Host ""
Write-Host "Coronado lanza release desde NAU -> max 24h despues esta en el bar." -ForegroundColor Yellow
Write-Host ""
Write-Host "Logs (si necesitas diagnosticar):" -ForegroundColor Yellow
Write-Host "  C:\BarAvenida\actualizar-bar.log" -ForegroundColor Gray
Write-Host ""
