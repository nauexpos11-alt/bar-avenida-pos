# ============================================================================
# Bar Avenida - Instalar tareas de auto-update
#
# Registra DOS tareas:
#   1. BarAvenida_Notificador  - corre al inicio de sesion del usuario.
#      Muestra ventana "Hay update, ¿instalar?" si hay version nueva.
#   2. BarAvenida_AutoUpdate   - tarea silenciosa diaria como fallback.
#      Corre en la madrugada (3am) si la PC esta prendida.
# ============================================================================

$ErrorActionPreference = "Continue"

$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Write-Host "Hay que correr esto como Administrador." -ForegroundColor Red
    exit 1
}

$WorkDir = "C:\BarAvenida"
New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null

# Copiar scripts a C:\BarAvenida (evita copy-to-self que tira error en PS5.x)
function CopiarScript {
    param([string]$Nombre)
    $src = "$PSScriptRoot\$Nombre"
    $dst = "$WorkDir\$Nombre"

    # Si source y destination son el MISMO archivo, no copiar (ya esta en su lugar)
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
$scriptNotificador = CopiarScript "notificador-update.ps1"

if (-not $scriptActualizar -or -not $scriptNotificador) {
    Write-Host "[FAIL] Faltan scripts. Abortando." -ForegroundColor Red
    exit 1
}

# ──────────────────────────────────────────────────────────
# TAREA 1: NOTIFICADOR al inicio de sesion del usuario
# ──────────────────────────────────────────────────────────
$nombreNotificador = "BarAvenida_Notificador"
Get-ScheduledTask -TaskName $nombreNotificador -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false

$accionNot = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptNotificador`""

# AtLogon trigger
$triggerNot = New-ScheduledTaskTrigger -AtLogOn

# Como usuario actual (NO SYSTEM, para que la ventana se vea)
$usuarioActual = "$env:USERDOMAIN\$env:USERNAME"
$principalNot = New-ScheduledTaskPrincipal -UserId $usuarioActual -LogonType Interactive -RunLevel Highest

$settingsNot = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 60)

Register-ScheduledTask -TaskName $nombreNotificador `
    -Action $accionNot `
    -Trigger $triggerNot `
    -Principal $principalNot `
    -Settings $settingsNot `
    -Description "Bar Avenida: al iniciar sesion, pregunta si hay update disponible." | Out-Null

Write-Host "[OK] Tarea $nombreNotificador registrada (corre al iniciar sesion)" -ForegroundColor Green

# ──────────────────────────────────────────────────────────
# TAREA 2: AUTO-UPDATE silencioso de madrugada (fallback)
# ──────────────────────────────────────────────────────────
$nombreAuto = "BarAvenida_AutoUpdate"
Get-ScheduledTask -TaskName $nombreAuto -ErrorAction SilentlyContinue | Unregister-ScheduledTask -Confirm:$false

$accionAuto = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptActualizar`" -Force"

# Diario a las 3:30 AM (bar cerrado)
$triggerAuto = New-ScheduledTaskTrigger -Daily -At "03:30AM"

# Como SYSTEM (no necesita UI)
$principalAuto = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

$settingsAuto = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

Register-ScheduledTask -TaskName $nombreAuto `
    -Action $accionAuto `
    -Trigger $triggerAuto `
    -Principal $principalAuto `
    -Settings $settingsAuto `
    -Description "Bar Avenida: actualizacion automatica diaria a las 3:30am si hay version nueva." | Out-Null

Write-Host "[OK] Tarea $nombreAuto registrada (cada noche a las 3:30am)" -ForegroundColor Green

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  TAREAS DE UPDATE INSTALADAS" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "1. AL ARRANCAR LA PC:" -ForegroundColor Cyan
Write-Host "   Si hay update, aparece ventana preguntando que hacer." -ForegroundColor Gray
Write-Host "   El usuario decide: Instalar / Mas tarde / Saltar." -ForegroundColor Gray
Write-Host ""
Write-Host "2. CADA NOCHE A LAS 3:30 AM:" -ForegroundColor Cyan
Write-Host "   Si la PC sigue prendida y hay update, lo instala silencioso." -ForegroundColor Gray
Write-Host "   (Bar cerrado, no afecta operacion)." -ForegroundColor Gray
Write-Host ""
Write-Host "Logs:" -ForegroundColor Yellow
Write-Host "  C:\BarAvenida\notificador-update.log" -ForegroundColor Gray
Write-Host "  C:\BarAvenida\actualizar-bar.log" -ForegroundColor Gray
Write-Host ""
Write-Host "Para probar el notificador AHORA:" -ForegroundColor Yellow
Write-Host "  Start-ScheduledTask -TaskName '$nombreNotificador'" -ForegroundColor Cyan
Write-Host ""
