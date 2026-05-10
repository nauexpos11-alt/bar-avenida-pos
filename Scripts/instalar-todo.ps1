# ============================================================================
# Bar Avenida - PRIMERA INSTALACION en PC nueva
# Descarga la ultima version de GitHub Releases y corre los 3 instaladores
# en orden con verificaciones.
#
# Uso (PowerShell admin):
#   irm https://raw.githubusercontent.com/nauexpos11-alt/bar-avenida-pos/main/Scripts/instalar-todo.ps1 | iex
#
# O descarga este archivo a un USB y corre:
#   powershell -ExecutionPolicy Bypass -File .\instalar-todo.ps1
# ============================================================================

param(
    [string]$Repo = "nauexpos11-alt/bar-avenida-pos"
)

$ErrorActionPreference = "Continue"

# Comprobar Admin
$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Write-Host "Hay que correr esto como Administrador." -ForegroundColor Red
    Write-Host "Cierra esta ventana y vuelve a abrir PowerShell como Administrador." -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}

$WorkDir = "C:\BarAvenida"
$DownloadDir = "$WorkDir\downloads"
New-Item -ItemType Directory -Path $WorkDir, $DownloadDir -Force | Out-Null

function Log([string]$msg, [string]$color = "White") {
    Write-Host $msg -ForegroundColor $color
}

Log ""
Log "================================================================" "Magenta"
Log "  BAR AVENIDA - PRIMERA INSTALACION" "Magenta"
Log "================================================================" "Magenta"
Log ""

# ──────────────────────────────────────────────────────────
# 1. Verificar SQL Server
# ──────────────────────────────────────────────────────────
Log "[1/6] Verificando SQL Server (instancia MSSQLSERVER01)..." "Yellow"

$sqlOk = $false
$sqlcmdOk = (Get-Command sqlcmd -ErrorAction SilentlyContinue) -ne $null
if ($sqlcmdOk) {
    $test = & sqlcmd -S "localhost\MSSQLSERVER01" -E -Q "SELECT 1" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Log "  [OK] SQL Server responde en localhost\MSSQLSERVER01" "Green"
        $sqlOk = $true
    }
}

if (-not $sqlOk) {
    Log "  [FALTA] SQL Server con instancia MSSQLSERVER01" "Red"
    Log "" "Gray"
    Log "  Necesitas instalar SQL Server Express PRIMERO:" "Yellow"
    Log "    1. Descarga: https://www.microsoft.com/en-us/sql-server/sql-server-downloads" "Gray"
    Log "    2. En la instalacion, escoge 'Basic' o 'Custom'." "Gray"
    Log "    3. Al configurar instancia, llamala MSSQLSERVER01." "Gray"
    Log "    4. Habilita autenticacion de Windows." "Gray"
    Log "    5. Termina la instalacion y vuelve a correr este script." "Gray"
    Log "" "Gray"
    $abrir = Read-Host "Quieres que abra la pagina de descarga ahora? (s/n)"
    if ($abrir -eq "s") {
        Start-Process "https://www.microsoft.com/en-us/sql-server/sql-server-downloads"
    }
    Read-Host "Presiona Enter para salir"
    exit 1
}

# ──────────────────────────────────────────────────────────
# 2. Internet
# ──────────────────────────────────────────────────────────
Log ""
Log "[2/6] Verificando internet..." "Yellow"
try {
    $r = Test-Connection -ComputerName "api.github.com" -Count 2 -Quiet -ErrorAction Stop
    if ($r) { Log "  [OK] api.github.com responde" "Green" }
    else { throw "Sin internet" }
} catch {
    Log "  [FAIL] Sin internet o GitHub bloqueado" "Red"
    exit 1
}

# ──────────────────────────────────────────────────────────
# 3. Obtener ultimo release
# ──────────────────────────────────────────────────────────
Log ""
Log "[3/6] Obteniendo ultimo release de GitHub..." "Yellow"
try {
    $headers = @{ "User-Agent" = "BarAvenida-Installer" }
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -Headers $headers -TimeoutSec 15
} catch {
    Log "  [FAIL] No se pudo consultar GitHub: $($_.Exception.Message)" "Red"
    Log "  Posibles causas: repo sin releases publicos, sin internet, o nombre del repo mal." "Yellow"
    exit 1
}

$version = $release.tag_name -replace '^v', ''
Log "  [OK] Ultima version: $version" "Green"

# ──────────────────────────────────────────────────────────
# 4. Descargar los 3 .exe
# ──────────────────────────────────────────────────────────
Log ""
Log "[4/6] Descargando instaladores..." "Yellow"

$descargados = @{}
foreach ($a in $release.assets) {
    $name = $a.name
    $key  = $null
    if ($name -like "Bar Avenida Server Setup*.exe") { $key = "Server" }
    elseif ($name -like "Bar Avenida Admin Setup*.exe") { $key = "Admin" }
    elseif ($name -like "Bar Avenida KDS Setup*.exe") { $key = "KDS" }
    if (-not $key) { continue }

    $localPath = Join-Path $DownloadDir $name
    Log "  Descargando $name..." "Gray"
    try {
        Invoke-WebRequest -Uri $a.browser_download_url -OutFile $localPath -UseBasicParsing -TimeoutSec 600
        $mb = [math]::Round((Get-Item $localPath).Length / 1MB, 1)
        Log "    [OK] $mb MB" "Green"
        $descargados[$key] = $localPath
    } catch {
        Log "    [FAIL] $($_.Exception.Message)" "Red"
    }
}

if ($descargados.Count -lt 3) {
    Log "[FAIL] Solo se descargaron $($descargados.Count) de 3 .exe." "Red"
    exit 1
}

# ──────────────────────────────────────────────────────────
# 5. Instalar en orden: Server -> Admin -> KDS
# ──────────────────────────────────────────────────────────
Log ""
Log "[5/6] Instalando en orden..." "Yellow"

Log "  Server (silent)..." "Gray"
$proc = Start-Process -FilePath $descargados["Server"] -ArgumentList @("/VERYSILENT","/SUPPRESSMSGBOXES","/NORESTART") -PassThru -Wait
if ($proc.ExitCode -eq 0) {
    Log "    [OK] Server instalado" "Green"
} else {
    Log "    [FAIL] Server exit $($proc.ExitCode). Abortando." "Red"
    exit 1
}

# Esperar a que el servicio arranque
Start-Sleep -Seconds 5

Log "  Admin (silent)..." "Gray"
$proc = Start-Process -FilePath $descargados["Admin"] -ArgumentList "/S" -PassThru -Wait
if ($proc.ExitCode -eq 0) { Log "    [OK]" "Green" } else { Log "    [WARN] Admin exit $($proc.ExitCode) (continuamos)" "Yellow" }

Log "  KDS (silent)..." "Gray"
$proc = Start-Process -FilePath $descargados["KDS"] -ArgumentList "/S" -PassThru -Wait
if ($proc.ExitCode -eq 0) { Log "    [OK]" "Green" } else { Log "    [WARN] KDS exit $($proc.ExitCode) (continuamos)" "Yellow" }

# Guardar version
Set-Content -Path "$WorkDir\version-instalada.txt" -Value $version -Encoding UTF8

# ──────────────────────────────────────────────────────────
# 6. Configurar PC para operacion (firewall, IP, etc)
# ──────────────────────────────────────────────────────────
Log ""
Log "[6/6] Configurando firewall y descubriendo IP..." "Yellow"

# Firewall puerto 7000
Get-NetFirewallRule -DisplayName "Bar Avenida API (puerto 7000)" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName "Bar Avenida API (puerto 7000)" `
    -Direction Inbound -Action Allow -Protocol TCP -LocalPort 7000 `
    -Profile Any -Enabled True | Out-Null
Log "  [OK] Firewall abierto en puerto 7000" "Green"

# IP local
$ipLocal = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
        $_.PrefixOrigin -in @('Dhcp','Manual') -and
        $_.IPAddress -notlike "169.254.*" -and
        $_.IPAddress -ne "127.0.0.1"
    } |
    Sort-Object InterfaceMetric |
    Select-Object -First 1).IPAddress

Log "  [OK] IP local: $ipLocal" "Green"

# Esperar a que backend responda
Log "  Verificando que backend responde..." "Gray"
$ok = $false
for ($i = 1; $i -le 10; $i++) {
    try {
        $r = Invoke-WebRequest "http://localhost:7000/api/sistema/hora" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch { Start-Sleep -Seconds 3 }
}
if ($ok) { Log "    [OK] Backend responde" "Green" } else { Log "    [WARN] Backend no responde aun. Revisa logs en F:\BarAvenida\Logs" "Yellow" }

# ──────────────────────────────────────────────────────────
# RESUMEN FINAL
# ──────────────────────────────────────────────────────────
Log ""
Log "================================================================" "Green"
Log "  INSTALACION COMPLETADA - v$version" "Green"
Log "================================================================" "Green"
Log ""
Log "URLs para conectar tablets/celulares (deben estar en la MISMA WiFi):" "Yellow"
Log ""
Log "  TABLET MESERAS:    http://${ipLocal}:7000/tablet/" "Cyan"
Log "  ADMIN WEB:         http://${ipLocal}:7000/admin/"  "Cyan"
Log "  KDS BARMAN:        http://${ipLocal}:7000/kds"     "Cyan"
Log ""
Log "Apps de escritorio instaladas (busca el icono en el menu Inicio):" "Yellow"
Log "  - Bar Avenida Admin" "Cyan"
Log "  - Bar Avenida KDS" "Cyan"
Log ""
Log "PROXIMO PASO IMPORTANTE:" "Yellow"
Log "  Instala la tarea automatica de actualizacion para que esta PC" "Gray"
Log "  se mantenga al dia con las versiones que mandes desde casa:" "Gray"
Log "" "Gray"
Log "  powershell -ExecutionPolicy Bypass -File C:\BarAvenida\install-tarea-auto-update.ps1" "Cyan"
Log ""
Log "Logs y backups en:" "Yellow"
Log "  F:\BarAvenida\Logs\" "Gray"
Log "  F:\BarAvenida\Backups\" "Gray"
Log ""
