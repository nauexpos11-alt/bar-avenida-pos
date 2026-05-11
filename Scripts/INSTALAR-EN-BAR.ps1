# ============================================================================
# Bar Avenida - INSTALADOR TODO-EN-UNO
# ----------------------------------------------------------------------------
# Doble click a este archivo (desde el USB) en la PC del bar para instalar
# TODO solo:
#   1. Verifica SQL Server (instala si falta)
#   2. Verifica drive F:
#   3. Desinstala version anterior si existe
#   4. Instala Server + Admin + KDS v1.4.0
#   5. Registra tareas de auto-update (notificador + diaria)
#   6. Instala TeamViewer
#   7. Configura firewall
#   8. Verifica que todo responde
#
# Uso:
#   - Clic derecho al .ps1 -> "Ejecutar con PowerShell"
#   - O desde PowerShell: powershell -ExecutionPolicy Bypass -File INSTALAR-EN-BAR.ps1
# ============================================================================

# Auto-elevar a Administrador
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Reiniciando como Administrador..." -ForegroundColor Yellow
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-File","`"$PSCommandPath`"" -Verb RunAs
    exit
}

$ErrorActionPreference = "Continue"

# Donde vive este script = raiz del USB (o donde lo pongas)
$USB     = $PSScriptRoot
$LogFile = "$env:TEMP\BarAvenida-Install.log"
$WorkDir = "C:\BarAvenida"

function Log {
    param([string]$Msg, [string]$Color = "White")
    $linea = "[$(Get-Date -Format 'HH:mm:ss')] $Msg"
    Write-Host $linea -ForegroundColor $Color
    Add-Content -Path $LogFile -Value $linea -Encoding UTF8
}

function LogSection {
    param([string]$Title)
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Log $Title "Cyan"
    Write-Host "================================================" -ForegroundColor Cyan
}

Clear-Host
Write-Host ""
Write-Host "================================================" -ForegroundColor Magenta
Write-Host "  BAR AVENIDA - INSTALADOR TODO-EN-UNO v1.4.0" -ForegroundColor Magenta
Write-Host "================================================" -ForegroundColor Magenta
Write-Host ""
Log "Origen: $USB"
Log "Log:    $LogFile"

# ──────────────────────────────────────────────────────────
# 1. Prerequisitos
# ──────────────────────────────────────────────────────────
LogSection "1. Verificando prerequisitos"

# Drive F:
if (-not (Test-Path "F:\")) {
    Log "[ALERTA] No existe drive F:" "Red"
    Write-Host ""
    Write-Host "Tienes que asignar F: a una particion antes de continuar." -ForegroundColor Yellow
    Write-Host "  1. Tecla Windows + X -> 'Administracion de discos'" -ForegroundColor Gray
    Write-Host "  2. Click derecho en una particion -> 'Cambiar letra y rutas'" -ForegroundColor Gray
    Write-Host "  3. Cambiar -> F" -ForegroundColor Gray
    Read-Host "Cuando lo hayas hecho presiona Enter (o Ctrl+C para cancelar)"
    if (-not (Test-Path "F:\")) {
        Log "[ABORT] Sigue sin existir F:. Saliendo." "Red"
        Read-Host "Presiona Enter para cerrar"
        exit 1
    }
}
Log "[OK] Drive F: existe" "Green"

# SQL Server con MSSQLSERVER01
$sqlOk = $false
try {
    & sqlcmd -S "localhost\MSSQLSERVER01" -E -Q "SELECT 1" -b 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $sqlOk = $true }
} catch {}

if (-not $sqlOk) {
    Log "[ALERTA] SQL Server no detectado en MSSQLSERVER01" "Yellow"
    $sqlInstaller = Join-Path $USB "0-SqlServer-Express\SQLEXPR_x64_ESN.exe"
    if (Test-Path $sqlInstaller) {
        Write-Host ""
        Write-Host "Voy a abrir el instalador de SQL Server Express." -ForegroundColor Yellow
        Write-Host "INSTRUCCIONES IMPORTANTES:" -ForegroundColor Cyan
        Write-Host "  - Tipo de instalacion: PERSONALIZADA" -ForegroundColor Gray
        Write-Host "  - Nombre de instancia: MSSQLSERVER01 (exactamente asi)" -ForegroundColor Gray
        Write-Host "  - Autenticacion: Windows" -ForegroundColor Gray
        Write-Host ""
        Read-Host "Presiona Enter para abrir el instalador"
        Start-Process -FilePath $sqlInstaller -Wait
        Write-Host ""
        Read-Host "Cuando termines de instalar SQL Server presiona Enter aqui"
    } else {
        Log "[FAIL] No encontre SQL Server Express en el USB ($sqlInstaller)" "Red"
        Read-Host "Presiona Enter para cerrar"
        exit 1
    }

    # Re-verificar
    try {
        & sqlcmd -S "localhost\MSSQLSERVER01" -E -Q "SELECT 1" -b 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { $sqlOk = $true }
    } catch {}

    if (-not $sqlOk) {
        Log "[ABORT] SQL Server sigue sin estar disponible. Reinstala con instancia MSSQLSERVER01." "Red"
        Read-Host "Presiona Enter para cerrar"
        exit 1
    }
}
Log "[OK] SQL Server MSSQLSERVER01 disponible" "Green"

# ──────────────────────────────────────────────────────────
# 2. Limpiar instalacion anterior
# ──────────────────────────────────────────────────────────
LogSection "2. Limpiando instalacion anterior (si existe)"

try {
    $svc = Get-Service -Name "BarAvenidaAPI" -ErrorAction SilentlyContinue
    if ($svc) {
        Log "Deteniendo servicio anterior..."
        Stop-Service -Name "BarAvenidaAPI" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }
} catch {}

$uninstKey = Get-ItemProperty "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*","HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*" -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -like "Bar Avenida Server*" }

if ($uninstKey) {
    foreach ($k in $uninstKey) {
        Log "Desinstalando: $($k.DisplayName) v$($k.DisplayVersion)..."
        if ($k.UninstallString) {
            $uninstExe = $k.UninstallString -replace '"', ''
            if (Test-Path $uninstExe) {
                Start-Process -FilePath $uninstExe -ArgumentList "/VERYSILENT","/SUPPRESSMSGBOXES","/NORESTART" -Wait -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 3
            }
        }
    }
    Log "[OK] Version anterior desinstalada" "Green"
} else {
    Log "No habia version anterior (primera vez)" "Gray"
}

# ──────────────────────────────────────────────────────────
# 3. Server v1.4.0
# ──────────────────────────────────────────────────────────
LogSection "3. Instalando Bar Avenida Server v1.4.0"

$serverExe = Get-ChildItem (Join-Path $USB "1-Bar-Avenida") -Filter "*Server*Setup*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $serverExe) {
    Log "[ABORT] No encontre Server.exe en $USB\1-Bar-Avenida\" "Red"
    Read-Host "Presiona Enter para cerrar"
    exit 1
}

Log "Instalando $($serverExe.Name)..."
$proc = Start-Process -FilePath $serverExe.FullName -ArgumentList "/VERYSILENT","/SUPPRESSMSGBOXES","/NORESTART" -PassThru -Wait
if ($proc.ExitCode -eq 0) {
    Log "[OK] Server instalado" "Green"
} else {
    Log "[FAIL] Server installer exit $($proc.ExitCode)" "Red"
}

Log "Esperando 10 seg que arranque..."
Start-Sleep -Seconds 10

# ──────────────────────────────────────────────────────────
# 4. Admin Electron
# ──────────────────────────────────────────────────────────
LogSection "4. Instalando Admin v1.4.0"

$adminExe = Get-ChildItem (Join-Path $USB "1-Bar-Avenida") -Filter "*Admin*Setup*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($adminExe) {
    Log "Instalando $($adminExe.Name)..."
    $proc = Start-Process -FilePath $adminExe.FullName -ArgumentList "/S" -PassThru -Wait
    if ($proc.ExitCode -eq 0) { Log "[OK] Admin instalado" "Green" }
    else { Log "[WARN] Admin exit $($proc.ExitCode)" "Yellow" }
}

# ──────────────────────────────────────────────────────────
# 5. KDS Electron
# ──────────────────────────────────────────────────────────
LogSection "5. Instalando KDS v1.4.0"

$kdsExe = Get-ChildItem (Join-Path $USB "1-Bar-Avenida") -Filter "*KDS*Setup*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($kdsExe) {
    Log "Instalando $($kdsExe.Name)..."
    $proc = Start-Process -FilePath $kdsExe.FullName -ArgumentList "/S" -PassThru -Wait
    if ($proc.ExitCode -eq 0) { Log "[OK] KDS instalado" "Green" }
    else { Log "[WARN] KDS exit $($proc.ExitCode)" "Yellow" }
}

# ──────────────────────────────────────────────────────────
# 6. Asegurar backend responde
# ──────────────────────────────────────────────────────────
LogSection "6. Verificando que el backend responde"

Start-Service BarAvenidaAPI -ErrorAction SilentlyContinue
$ok = $false
for ($i = 1; $i -le 15; $i++) {
    try {
        $r = Invoke-WebRequest "http://localhost:7000/api/sistema/hora" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch { Start-Sleep -Seconds 3 }
}

if ($ok) {
    Log "[OK] Backend responde correctamente" "Green"
} else {
    Log "[ALERTA] Backend no responde. Aplicando fix de permisos SQL..." "Yellow"
    & sqlcmd -S "localhost\MSSQLSERVER01" -E -i "C:\ProgramData\Bar Avenida\Backups\setup-sql-baravenida.sql" 2>&1 | Out-Null
    Stop-Service BarAvenidaAPI -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    Start-Service BarAvenidaAPI -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 10

    for ($i = 1; $i -le 10; $i++) {
        try {
            $r = Invoke-WebRequest "http://localhost:7000/api/sistema/hora" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            if ($r.StatusCode -eq 200) { $ok = $true; break }
        } catch { Start-Sleep -Seconds 3 }
    }

    if ($ok) { Log "[OK] Backend responde despues del fix" "Green" }
    else { Log "[ERROR] Backend sigue sin responder. Revisa F:\BarAvenida\Logs\" "Red" }
}

# ──────────────────────────────────────────────────────────
# 7. Registrar tareas auto-update
# ──────────────────────────────────────────────────────────
LogSection "7. Registrando tareas de auto-update"

$instTarea = "$WorkDir\install-tarea-auto-update.ps1"
if (Test-Path $instTarea) {
    & $instTarea
    Log "[OK] Tareas registradas" "Green"
} else {
    Log "[WARN] $instTarea no existe" "Yellow"
}

# ──────────────────────────────────────────────────────────
# 8. Firewall
# ──────────────────────────────────────────────────────────
LogSection "8. Configurando firewall puerto 7000"

Get-NetFirewallRule -DisplayName "Bar Avenida API (puerto 7000)" -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName "Bar Avenida API (puerto 7000)" `
    -Direction Inbound -Action Allow -Protocol TCP -LocalPort 7000 `
    -Profile Any -Enabled True | Out-Null
Log "[OK] Firewall configurado" "Green"

# ──────────────────────────────────────────────────────────
# 9. TeamViewer
# ──────────────────────────────────────────────────────────
LogSection "9. Instalando TeamViewer"

$tvInstalled = (Test-Path "C:\Program Files\TeamViewer\TeamViewer.exe") -or (Test-Path "C:\Program Files (x86)\TeamViewer\TeamViewer.exe")
if (-not $tvInstalled) {
    $tvExe = Join-Path $USB "3-TeamViewer\TeamViewer_Setup.exe"
    if (Test-Path $tvExe) {
        Log "Instalando TeamViewer (1-2 min)..."
        Start-Process -FilePath $tvExe -ArgumentList "/S" -Wait
        Log "[OK] TeamViewer instalado" "Green"
        Write-Host ""
        Write-Host "IMPORTANTE: abre TeamViewer y configura:" -ForegroundColor Yellow
        Write-Host "  Extras -> Opciones -> Seguridad -> 'Password de acceso no atendido'" -ForegroundColor Gray
        Write-Host "  Marca 'Conceder acceso facil' tambien." -ForegroundColor Gray
        Write-Host "  Despues mandale el ID + password a Coronado." -ForegroundColor Gray
    } else {
        Log "[INFO] TeamViewer no esta en el USB" "Gray"
    }
} else {
    Log "[OK] TeamViewer ya estaba instalado" "Green"
}

# ──────────────────────────────────────────────────────────
# 10. Resumen final
# ──────────────────────────────────────────────────────────
LogSection "10. RESUMEN FINAL"

$ipLocal = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
        $_.PrefixOrigin -in @('Dhcp','Manual') -and
        $_.IPAddress -notlike "169.254.*" -and
        $_.IPAddress -ne "127.0.0.1"
    } |
    Sort-Object InterfaceMetric | Select-Object -First 1).IPAddress

Set-Content -Path "C:\BarAvenida\version-instalada.txt" -Value "1.4.0" -Encoding UTF8

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  INSTALACION COMPLETADA" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  IP local:        $ipLocal" -ForegroundColor Cyan
Write-Host "  Version:         1.4.0" -ForegroundColor Cyan
Write-Host ""
Write-Host "URLs para tablets y otras PCs (misma WiFi):" -ForegroundColor Yellow
Write-Host "  Tablet meseras:  http://${ipLocal}:7000/tablet/" -ForegroundColor Cyan
Write-Host "  Admin web:       http://${ipLocal}:7000/admin/" -ForegroundColor Cyan
Write-Host "  KDS web:         http://${ipLocal}:7000/kds" -ForegroundColor Cyan
Write-Host ""
Write-Host "Apps instaladas (menu Inicio):" -ForegroundColor Yellow
Write-Host "  - Bar Avenida Admin" -ForegroundColor Gray
Write-Host "  - Bar Avenida KDS" -ForegroundColor Gray
Write-Host "  - TeamViewer" -ForegroundColor Gray
Write-Host ""
Write-Host "PROXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "  1. Reinicia la PC para activar el notificador de updates" -ForegroundColor Gray
Write-Host "  2. Abre TeamViewer y configura password permanente" -ForegroundColor Gray
Write-Host "  3. Mandale ID + password a Coronado" -ForegroundColor Gray
Write-Host ""
Write-Host "Log de instalacion: $LogFile" -ForegroundColor Gray
Write-Host ""

Read-Host "Presiona Enter para cerrar"
