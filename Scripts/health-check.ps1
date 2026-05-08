# ============================================================================
# Bar Avenida - Health Check del sistema completo
# ----------------------------------------------------------------------------
# Verifica que TODO el sistema este sano:
#   - Servicio Windows BarAvenidaAPI Running
#   - Backend responde HTTP 200 en endpoints clave
#   - SQL Server accesible y BD conectada
#   - Tarea de backup horaria registrada y reciente
#   - Espacio en disco suficiente para Backups y Logs
#   - Logs sin errores recientes
#
# Uso interactivo (PowerShell normal):
#   F:\BarAvenida\Scripts\health-check.ps1
#
# Uso silencioso (para tarea programada - escribe a F:\BarAvenida\Logs\health-check.log):
#   F:\BarAvenida\Scripts\health-check.ps1 -Silent
# ============================================================================

param([switch]$Silent)

$ErrorActionPreference = "Continue"

$LogFile = "F:\BarAvenida\Logs\health-check.log"
$resultados = @()

function Print-Result {
    param([string]$titulo, [bool]$ok, [string]$detalle = "")
    $estado = if ($ok) { "[OK]   " } else { "[FAIL] " }
    $color  = if ($ok) { "Green" } else { "Red" }
    if (-not $Silent) {
        Write-Host -NoNewline $estado -ForegroundColor $color
        Write-Host -NoNewline ("{0,-40}" -f $titulo)
        if ($detalle) { Write-Host $detalle -ForegroundColor Gray } else { Write-Host "" }
    }
    $script:resultados += "$estado $titulo $detalle"
    return $ok
}

if (-not $Silent) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  HEALTH CHECK BAR AVENIDA - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
}

$todo = $true

# -- 1. Servicio Windows ------------------------------------------------------
$svc = Get-Service -Name "BarAvenidaAPI" -ErrorAction SilentlyContinue
$ok = ($svc -and $svc.Status -eq "Running")
$todo = (Print-Result "Servicio BarAvenidaAPI" $ok ($svc.Status)) -and $todo

# Hora de arranque del servicio
if ($ok) {
    $proc = Get-Process -Name "BarAvenida.API" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($proc) {
        $uptime = ((Get-Date) - $proc.StartTime).ToString("hh\:mm\:ss")
        Print-Result "  Uptime del proceso" $true $uptime | Out-Null
    }
}

# -- 2. Endpoint admin --------------------------------------------------------
try {
    $r = Invoke-WebRequest "http://localhost:7000/admin/" -UseBasicParsing -TimeoutSec 5
    $todo = (Print-Result "Endpoint /admin/ HTTP 200" ($r.StatusCode -eq 200) "Status $($r.StatusCode)") -and $todo
} catch {
    $todo = (Print-Result "Endpoint /admin/ HTTP 200" $false "FAIL: $_") -and $todo
}

# -- 3. Endpoint hora servidor ------------------------------------------------
try {
    $r = Invoke-WebRequest "http://localhost:7000/api/sistema/hora" -UseBasicParsing -TimeoutSec 5
    $hora = ($r.Content | ConvertFrom-Json).local
    $todo = (Print-Result "Endpoint /api/sistema/hora" $true $hora) -and $todo
} catch {
    $todo = (Print-Result "Endpoint /api/sistema/hora" $false "FAIL: $_") -and $todo
}

# -- 4. SQL Server conectividad ----------------------------------------------─
try {
    $sqlOut = sqlcmd -S "localhost\MSSQLSERVER01" -E -d BarAvenida -Q "SELECT COUNT(*) FROM Productos" -h -1 2>&1
    $cnt = ($sqlOut | ForEach-Object { "$_".Trim() } | Where-Object { $_ -match '^\d+$' } | Select-Object -First 1)
    $cntInt = if ($cnt) { [int]$cnt } else { 0 }
    $todo = (Print-Result "SQL Server BarAvenida" ($cntInt -gt 0) "$cntInt productos") -and $todo
} catch {
    $todo = (Print-Result "SQL Server BarAvenida" $false "FAIL: $_") -and $todo
}

# -- 5. Tarea de backup ------------------------------------------------------
$tarea = Get-ScheduledTask -TaskName "BarAvenida_BackupHorario" -ErrorAction SilentlyContinue
if ($tarea) {
    $info = Get-ScheduledTaskInfo -TaskName "BarAvenida_BackupHorario"
    $ultimaCorrida = $info.LastRunTime
    $hace = (Get-Date) - $ultimaCorrida
    $okBackup = ($hace.TotalHours -lt 25)  # debe haber corrido en las ultimas 24h
    $todo = (Print-Result "Tarea backup horaria" $okBackup ("Ultima: $ultimaCorrida (hace $([math]::Round($hace.TotalMinutes,0)) min)")) -and $todo
} else {
    $todo = (Print-Result "Tarea backup horaria" $false "NO REGISTRADA") -and $todo
}

# -- 6. Backups recientes ----------------------------------------------------─
$backups = Get-ChildItem "F:\BarAvenida\Backups\BarAvenida_*.bak" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
if ($backups.Count -gt 0) {
    $ultimo = $backups[0]
    $haceB  = (Get-Date) - $ultimo.LastWriteTime
    $okBack = ($haceB.TotalHours -lt 2)  # backup en las ultimas 2h
    $todo = (Print-Result "Backups en disco" $okBack "$($backups.Count) archivos. Ultimo hace $([math]::Round($haceB.TotalMinutes,0)) min") -and $todo
} else {
    $todo = (Print-Result "Backups en disco" $false "0 backups") -and $todo
}

# -- 7. Espacio en disco F: --------------------------------------------------─
$disco = Get-PSDrive F -ErrorAction SilentlyContinue
if ($disco) {
    $gbLibres = [math]::Round($disco.Free / 1GB, 2)
    $okDisco = ($gbLibres -gt 5)
    $todo = (Print-Result "Espacio libre en F:" $okDisco "$gbLibres GB libres") -and $todo
}

# -- 8. Logs sin errores recientes --------------------------------------------
$logHoy = Get-ChildItem "F:\BarAvenida\Logs\baravenida-$(Get-Date -Format 'yyyyMMdd').log" -ErrorAction SilentlyContinue
if ($logHoy) {
    # Solo cuenta errores DEL ULTIMO ARRANQUE del backend (descarta stack traces antiguos)
    $bannerLine = (Select-String -Path $logHoy.FullName -Pattern 'Bar Avenida API arrancando' | Select-Object -Last 1)
    if ($bannerLine) {
        $desdeLinea = $bannerLine.LineNumber
        $todoLog = Get-Content $logHoy.FullName -Encoding UTF8
        $logRecent = $todoLog | Select-Object -Skip ($desdeLinea - 1)
        $errores = ($logRecent | Where-Object { $_ -match '\] (ERR|FTL)' } | Measure-Object).Count
    } else {
        $errores = (Select-String -Path $logHoy.FullName -Pattern '\] (ERR|FTL)' | Measure-Object).Count
    }
    $okLogs = ($errores -eq 0)
    $todo = (Print-Result "Logs sin errores (ultimo arranque)" $okLogs "$errores errores") -and $todo
} else {
    Print-Result "Logs sin errores HOY" $true "(sin log de hoy)" | Out-Null
}

# -- 9. Cuentas abiertas ----------------------------------------------------─
try {
    $sqlAbiertas = sqlcmd -S "localhost\MSSQLSERVER01" -E -d BarAvenida -Q "SELECT COUNT(*) FROM Cuentas WHERE Estado = 'Abierta'" -h -1 2>&1
    $abi = ($sqlAbiertas | ForEach-Object { "$_".Trim() } | Where-Object { $_ -match '^\d+$' } | Select-Object -First 1)
    $abiInt = if ($abi) { [int]$abi } else { 0 }
    Print-Result "Cuentas abiertas (info)" $true "$abiInt mesa(s)" | Out-Null
} catch {}

# -- Resumen ----------------------------------------------------------------
if (-not $Silent) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    if ($todo) {
        Write-Host "  TODO SANO" -ForegroundColor Green
    } else {
        Write-Host "  HAY PROBLEMAS - revisa los [FAIL] arriba" -ForegroundColor Red
    }
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
}

# Escribir al log siempre (interactivo o silencioso)
$ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$resumen = if ($todo) { "TODO_SANO" } else { "PROBLEMAS" }
$linea = "[$ts] $resumen - " + ($resultados -join " | ")
try {
    New-Item -ItemType Directory -Path (Split-Path $LogFile) -Force -ErrorAction SilentlyContinue | Out-Null
    Add-Content -Path $LogFile -Value $linea -Encoding UTF8
} catch {}

if (-not $todo) { exit 1 }
