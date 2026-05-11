# ============================================================================
# Bar Avenida - AUTO-UPDATE desde GitHub Releases
# Corre en la PC del bar, descarga la version mas reciente de GitHub Releases,
# y la instala silent.
#
# Uso manual (PowerShell admin):
#   .\actualizar-bar.ps1
#   .\actualizar-bar.ps1 -SoloChequear     (solo dice si hay nueva version, no instala)
#   .\actualizar-bar.ps1 -Force            (ignora horario y version, instala YA)
#
# VENTANA DE INSTALACION:
#   Por defecto solo aplica updates entre 3am y 11am (horario muerto del bar).
#   Si la PC se prende fuera de esa ventana, la tarea NO instala nada.
#   Para forzar fuera de ventana, usa -Force.
#
# Idealmente como tarea programada cada 1 hora (ver install-tarea-auto-update.ps1).
# ============================================================================

param(
    [switch]$SoloChequear = $false,
    [switch]$Force         = $false,
    [string]$Repo          = "nauexpos11-alt/bar-avenida-pos",
    [int]$HoraInicio       = 3,   # 3 AM - aplica updates a partir de esta hora
    [int]$HoraFin          = 11   # 11 AM - hasta esta hora (exclusiva)
)

$ErrorActionPreference = "Continue"

# ──────────────────────────────────────────────────────────
# Paths
# ──────────────────────────────────────────────────────────
$WorkDir   = "C:\BarAvenida"
$LogFile   = "$WorkDir\actualizar-bar.log"
$DownloadDir = "$WorkDir\downloads"
$VersionFile = "$WorkDir\version-instalada.txt"

New-Item -ItemType Directory -Path $WorkDir, $DownloadDir -Force -ErrorAction SilentlyContinue | Out-Null

function Log([string]$msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

function Get-VersionInstalada {
    if (Test-Path $VersionFile) {
        return (Get-Content $VersionFile -Raw).Trim()
    }
    return "0.0.0"
}

function Set-VersionInstalada([string]$v) {
    Set-Content -Path $VersionFile -Value $v -Encoding UTF8
}

function Compare-Versiones([string]$nueva, [string]$actual) {
    try {
        $vNueva  = [version]$nueva
        $vActual = [version]$actual
        return ($vNueva -gt $vActual)
    } catch {
        return $false
    }
}

# ──────────────────────────────────────────────────────────
# 1. Consultar GitHub Releases (publica, no requiere auth)
# ──────────────────────────────────────────────────────────
Log "=== AUTO-UPDATE BAR AVENIDA ==="
Log "Consultando ultimo release de $Repo..."

try {
    $headers = @{ "User-Agent" = "BarAvenida-AutoUpdate" }
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -Headers $headers -TimeoutSec 15
} catch {
    Log "[ERROR] No se pudo consultar GitHub: $($_.Exception.Message)"
    Log "Saliendo. Probablemente no hay internet o el repo no tiene releases publicos."
    exit 1
}

if (-not $release.tag_name) {
    Log "[ERROR] Release sin tag_name. Abortando."
    exit 1
}

$versionNueva = $release.tag_name -replace '^v', ''
$versionActual = Get-VersionInstalada

Log "Version actual instalada: $versionActual"
Log "Version disponible en GitHub: $versionNueva"

# ──────────────────────────────────────────────────────────
# 2. Decidir si actualizar
# ──────────────────────────────────────────────────────────
$debeActualizar = $Force -or (Compare-Versiones $versionNueva $versionActual)

if (-not $debeActualizar) {
    Log "Ya estas en la version mas reciente. Nada que hacer."
    if ($SoloChequear) { exit 0 }
    exit 0
}

if ($SoloChequear) {
    Log "[INFO] Hay nueva version $versionNueva (actual: $versionActual). NO se instala porque -SoloChequear."
    exit 0
}

# ──────────────────────────────────────────────────────────
# 2.5 Verificar VENTANA DE INSTALACION (evita reiniciar en hora de servicio)
# ──────────────────────────────────────────────────────────
$horaActual = (Get-Date).Hour
$enVentana  = ($horaActual -ge $HoraInicio -and $horaActual -lt $HoraFin)

if (-not $enVentana -and -not $Force) {
    Log "[INFO] Hay update disponible v$versionNueva, pero hora actual ($horaActual h) fuera de ventana ($HoraInicio h - $HoraFin h)."
    Log "       NO se aplica para no interrumpir operacion del bar."
    Log "       Se aplicara solo cuando el reloj entre a la ventana, o si corres con -Force."
    exit 0
}

if ($Force -and -not $enVentana) {
    Log "[FORCE] Aplicando update fuera de ventana porque se uso -Force."
}

Log "=== ACTUALIZANDO a v$versionNueva ==="

# ──────────────────────────────────────────────────────────
# 3. Descargar los 3 .exe
# ──────────────────────────────────────────────────────────
$assetsBuscados = @(
    @{ Patron = "Bar Avenida Server Setup * .exe"; Etiqueta = "Server" },
    @{ Patron = "Bar Avenida Admin Setup * .exe";  Etiqueta = "Admin"  },
    @{ Patron = "Bar Avenida KDS Setup * .exe";    Etiqueta = "KDS"    }
)

$descargados = @{}

foreach ($a in $release.assets) {
    $name = $a.name
    if ($name -like "Bar Avenida Server Setup*.exe") { $key = "Server" }
    elseif ($name -like "Bar Avenida Admin Setup*.exe") { $key = "Admin" }
    elseif ($name -like "Bar Avenida KDS Setup*.exe") { $key = "KDS" }
    else { continue }

    $localPath = Join-Path $DownloadDir $name
    Log "Descargando $name ($([math]::Round($a.size / 1MB, 1)) MB) con curl.exe..."

    # Usar curl.exe en vez de Invoke-WebRequest (PS5.x se traba con archivos grandes de GitHub)
    & curl.exe -L --retry 5 --retry-delay 3 --max-time 600 -o $localPath $a.browser_download_url 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0 -and (Test-Path $localPath) -and (Get-Item $localPath).Length -gt 1MB) {
        Log "  [OK] Guardado en $localPath"
        $descargados[$key] = $localPath
    } else {
        Log "  [FAIL] curl.exe exit $LASTEXITCODE o archivo demasiado chico"
    }
}

if ($descargados.Count -lt 3) {
    Log "[ERROR] Solo se descargaron $($descargados.Count) de 3 .exe. Abortando."
    Log "Encontrados: $($descargados.Keys -join ', ')"
    exit 1
}

# ──────────────────────────────────────────────────────────
# 4. Detener servicio BarAvenidaAPI
# ──────────────────────────────────────────────────────────
Log "Deteniendo servicio BarAvenidaAPI..."
try {
    $svc = Get-Service -Name "BarAvenidaAPI" -ErrorAction SilentlyContinue
    if ($svc) {
        Stop-Service -Name "BarAvenidaAPI" -Force -ErrorAction Stop
        Log "  [OK] Servicio detenido"
    } else {
        Log "  [WARN] Servicio BarAvenidaAPI no existe (es la primera instalacion?)"
    }
} catch {
    Log "  [WARN] No se pudo detener servicio: $($_.Exception.Message)"
}

# ──────────────────────────────────────────────────────────
# 5. Instalar Server (Inno Setup) - silent
# ──────────────────────────────────────────────────────────
Log "Instalando Server $versionNueva..."
$args = @("/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART")
$proc = Start-Process -FilePath $descargados["Server"] -ArgumentList $args -PassThru -Wait
if ($proc.ExitCode -eq 0) {
    Log "  [OK] Server instalado"
} else {
    Log "  [FAIL] Server installer salio con exit code $($proc.ExitCode)"
}

# ──────────────────────────────────────────────────────────
# 6. Instalar Admin Electron (NSIS) - silent
# ──────────────────────────────────────────────────────────
Log "Instalando Admin $versionNueva..."
$proc = Start-Process -FilePath $descargados["Admin"] -ArgumentList "/S" -PassThru -Wait
if ($proc.ExitCode -eq 0) {
    Log "  [OK] Admin instalado"
} else {
    Log "  [FAIL] Admin installer salio con exit code $($proc.ExitCode)"
}

# ──────────────────────────────────────────────────────────
# 7. Instalar KDS Electron (NSIS) - silent
# ──────────────────────────────────────────────────────────
Log "Instalando KDS $versionNueva..."
$proc = Start-Process -FilePath $descargados["KDS"] -ArgumentList "/S" -PassThru -Wait
if ($proc.ExitCode -eq 0) {
    Log "  [OK] KDS instalado"
} else {
    Log "  [FAIL] KDS installer salio con exit code $($proc.ExitCode)"
}

# ──────────────────────────────────────────────────────────
# 8. Reiniciar servicio (Inno Setup lo arranca, pero por si acaso)
# ──────────────────────────────────────────────────────────
Log "Asegurando que servicio BarAvenidaAPI este corriendo..."
Start-Sleep -Seconds 3
try {
    Start-Service -Name "BarAvenidaAPI" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 5
    $svc = Get-Service -Name "BarAvenidaAPI"
    Log "  Status: $($svc.Status)"
} catch {
    Log "  [WARN] Error arrancando: $($_.Exception.Message)"
}

# ──────────────────────────────────────────────────────────
# 9. Verificar que el backend responde
# ──────────────────────────────────────────────────────────
Log "Verificando que el backend responde..."
$ok = $false
for ($i = 1; $i -le 10; $i++) {
    try {
        $r = Invoke-WebRequest "http://localhost:7000/api/sistema/hora" -UseBasicParsing -TimeoutSec 5
        if ($r.StatusCode -eq 200) {
            Log "  [OK] Backend responde correctamente"
            $ok = $true
            break
        }
    } catch {
        Log "  Intento $i/10: aun no responde..."
        Start-Sleep -Seconds 3
    }
}

if (-not $ok) {
    Log "  [ALERTA] Backend no responde tras 30s. Revisa logs en F:\BarAvenida\Logs"
}

# ──────────────────────────────────────────────────────────
# 10. Guardar version y limpiar
# ──────────────────────────────────────────────────────────
Set-VersionInstalada $versionNueva
Log "Version instalada actualizada a $versionNueva"

# Borrar instaladores descargados (libera ~300MB)
Get-ChildItem $DownloadDir -Filter "*.exe" | Remove-Item -Force -ErrorAction SilentlyContinue
Log "Instaladores temporales borrados"

Log "=== AUTO-UPDATE COMPLETADO ==="
Log ""
