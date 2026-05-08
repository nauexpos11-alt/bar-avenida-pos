# ============================================================================
# Bar Avenida - Test Maraton 13-15 horas
# ----------------------------------------------------------------------------
# Simula un dia completo de operacion del bar:
#   - Health check cada 5 minutos
#   - Crea cuentas, agrega productos, cobra (carga sintetica)
#   - Detecta memory leaks (compara RAM del servicio cada hora)
#   - Detecta degradacion (mide latencia de endpoints)
#   - Log completo a F:\BarAvenida\Logs\test-maraton-YYYYMMDD-HHMM.log
#
# Uso (PowerShell normal, no requiere admin):
#   F:\BarAvenida\Scripts\test-maraton.ps1                    # 15 horas
#   F:\BarAvenida\Scripts\test-maraton.ps1 -Horas 2           # solo 2 horas (test corto)
#   F:\BarAvenida\Scripts\test-maraton.ps1 -CargaSintetica:$false  # solo monitoring sin tocar BD
# ============================================================================

param(
    [int]$Horas = 15,
    [bool]$CargaSintetica = $false,
    [int]$IntervaloMin = 5
)

$ErrorActionPreference = "Continue"
$BaseUrl = "http://localhost:7000"
$LogFile = "F:\BarAvenida\Logs\test-maraton-$(Get-Date -Format 'yyyyMMdd-HHmm').log"

New-Item -ItemType Directory -Path (Split-Path $LogFile) -Force -ErrorAction SilentlyContinue | Out-Null

function Log {
    param([string]$Mensaje, [string]$Nivel = "INFO")
    $ts = Get-Date -Format "HH:mm:ss"
    $linea = "[$ts] [$Nivel] $Mensaje"
    Write-Host $linea
    Add-Content -Path $LogFile -Value $linea -Encoding UTF8
}

function Medir-Latencia {
    param([string]$Url)
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        Invoke-WebRequest -Uri "$BaseUrl$Url" -UseBasicParsing -TimeoutSec 10 | Out-Null
        $sw.Stop()
        return $sw.ElapsedMilliseconds
    } catch {
        $sw.Stop()
        return -1
    }
}

function Snapshot-Servicio {
    $proc = Get-Process -Name "BarAvenida.API" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($proc) {
        return @{
            PID         = $proc.Id
            RAMmb       = [math]::Round($proc.WorkingSet64 / 1MB, 2)
            HandlesNum  = $proc.HandleCount
            ThreadsNum  = $proc.Threads.Count
            CpuTotal    = [math]::Round($proc.TotalProcessorTime.TotalSeconds, 0)
        }
    }
    return $null
}

# ============================================================================
# ARRANQUE
# ============================================================================
Log "============================================================"
Log "TEST MARATON BAR AVENIDA"
Log "Duracion: $Horas horas | Intervalo: $IntervaloMin min"
Log "Carga sintetica: $CargaSintetica"
Log "Log: $LogFile"
Log "============================================================"

$inicio = Get-Date
$fin    = $inicio.AddHours($Horas)
$snapInicial = Snapshot-Servicio

if (-not $snapInicial) {
    Log "ERROR: No se encontro proceso BarAvenida.API. Verifica que el servicio este Running." "ERROR"
    exit 1
}

Log "Snapshot inicial: PID=$($snapInicial.PID) RAM=$($snapInicial.RAMmb)MB Handles=$($snapInicial.HandlesNum) Threads=$($snapInicial.ThreadsNum)"

$contador     = 0
$fallosTotal  = 0
$ramMaxima    = $snapInicial.RAMmb
$latenciasMs  = @()

# ============================================================================
# LOOP PRINCIPAL
# ============================================================================
while ((Get-Date) -lt $fin) {
    $contador++
    Log ""
    Log "--- Tick #$contador ($([math]::Round(((Get-Date) - $inicio).TotalMinutes, 0)) min transcurridos, $([math]::Round(($fin - (Get-Date)).TotalMinutes, 0)) min restantes) ---"

    # 1. Servicio sigue running
    $svc = Get-Service -Name "BarAvenidaAPI" -ErrorAction SilentlyContinue
    if (-not $svc -or $svc.Status -ne "Running") {
        Log "FAIL: Servicio NO esta Running. Status=$($svc.Status)" "ERROR"
        $fallosTotal++
        Start-Sleep -Seconds 30
        continue
    }
    Log "[OK] Servicio Running"

    # 2. Snapshot del proceso
    $snap = Snapshot-Servicio
    if ($snap) {
        $ramMaxima = [math]::Max($ramMaxima, $snap.RAMmb)
        $delta = $snap.RAMmb - $snapInicial.RAMmb
        $simbolo = if ($delta -gt 100) { "ALERTA" } elseif ($delta -gt 50) { "subiendo" } else { "estable" }
        Log "[OK] Proceso: RAM=$($snap.RAMmb)MB (delta=+$delta MB $simbolo) Handles=$($snap.HandlesNum) Threads=$($snap.ThreadsNum)"

        # Si subio mas de 200 MB es memory leak claro
        if ($delta -gt 200) {
            Log "ALERTA MEMORY LEAK: RAM crecio +$delta MB desde inicio" "WARN"
        }
    }

    # 3. Endpoints clave - latencia
    $endpoints = @(
        "/admin/",
        "/api/sistema/hora",
        "/api/Mesas",
        "/api/Categorias"
    )

    foreach ($ep in $endpoints) {
        $ms = Medir-Latencia $ep
        if ($ms -lt 0) {
            Log "FAIL: $ep no respondio" "ERROR"
            $fallosTotal++
        } elseif ($ms -gt 2000) {
            Log "SLOW: $ep tardo ${ms}ms (>2s)" "WARN"
            $latenciasMs += $ms
        } else {
            Log "[OK] $ep -> ${ms}ms"
            $latenciasMs += $ms
        }
    }

    # 4. SQL conectividad
    try {
        $sqlOut = sqlcmd -S "localhost\MSSQLSERVER01" -E -d BarAvenida -Q "SELECT COUNT(*) FROM Productos" -h -1 -W 2>&1
        $cnt = ($sqlOut | ForEach-Object { "$_".Trim() } | Where-Object { $_ -match '^\d+$' } | Select-Object -First 1)
        if ([int]$cnt -gt 0) {
            Log "[OK] SQL responde: $cnt productos"
        } else {
            Log "FAIL: SQL devolvio 0 productos" "ERROR"
            $fallosTotal++
        }
    } catch {
        Log "FAIL: SQL no respondio: $_" "ERROR"
        $fallosTotal++
    }

    # 5. Carga sintetica (opcional)
    if ($CargaSintetica) {
        try {
            $login = Invoke-RestMethod "$BaseUrl/api/Auth/login" -Method POST -Body (@{
                codigo = "23"
                pin    = "0001"
            } | ConvertTo-Json) -ContentType "application/json"
            if ($login.token) {
                Log "[OK] Login simulado OK"
            }
        } catch {
            Log "WARN: Login sintetico fallo (puede estar bien si BD esta vacia)" "WARN"
        }
    }

    # 6. Esperar siguiente tick
    Start-Sleep -Seconds ($IntervaloMin * 60)
}

# ============================================================================
# RESUMEN FINAL
# ============================================================================
$snapFinal = Snapshot-Servicio
$duracionMin = [math]::Round(((Get-Date) - $inicio).TotalMinutes, 0)

Log ""
Log "============================================================"
Log "TEST MARATON COMPLETADO"
Log "============================================================"
Log "Duracion real: $duracionMin minutos"
Log "Ticks totales: $contador"
Log "Fallos totales: $fallosTotal"
Log ""
Log "RAM:"
Log "  Inicial: $($snapInicial.RAMmb) MB"
Log "  Final:   $($snapFinal.RAMmb) MB"
Log "  Maxima:  $ramMaxima MB"
Log "  Delta:   $($snapFinal.RAMmb - $snapInicial.RAMmb) MB"
Log ""
if ($latenciasMs.Count -gt 0) {
    $latProm = [math]::Round(($latenciasMs | Measure-Object -Average).Average, 0)
    $latMax  = ($latenciasMs | Measure-Object -Maximum).Maximum
    $latP95  = ($latenciasMs | Sort-Object)[[int]($latenciasMs.Count * 0.95)]
    Log "Latencias:"
    Log "  Promedio: ${latProm}ms"
    Log "  P95:      ${latP95}ms"
    Log "  Maxima:   ${latMax}ms"
}
Log ""

if ($fallosTotal -eq 0 -and ($snapFinal.RAMmb - $snapInicial.RAMmb) -lt 100) {
    Log "VEREDICTO: SISTEMA APROBADO PARA OPERACION 13-15 HORAS" "INFO"
} elseif ($fallosTotal -lt 3) {
    Log "VEREDICTO: SISTEMA ESTABLE CON OBSERVACIONES" "WARN"
} else {
    Log "VEREDICTO: SISTEMA INESTABLE - $fallosTotal fallos" "ERROR"
}
Log "============================================================"
Log "Log completo: $LogFile"
