# ============================================================================
# Bar Avenida - Juntar los 3 instaladores en una sola carpeta para USB
# ----------------------------------------------------------------------------
# Copia los .exe instaladores a F:\BarAvenida\Releases\ junto con un README
# con instrucciones para instalarlos en otra PC.
#
# Uso (PowerShell normal):
#   F:\BarAvenida\Scripts\juntar-instaladores.ps1
# ============================================================================

$ErrorActionPreference = "Stop"

$Destino = "F:\BarAvenida\Releases"
New-Item -ItemType Directory -Path $Destino -Force | Out-Null

# Limpiar contenido viejo
Get-ChildItem $Destino -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# Busca dinamicamente la version mas reciente de cada instalador (.exe sin .blockmap)
function Buscar-InstaladorMasReciente {
    param([string]$Carpeta, [string]$Patron)
    if (-not (Test-Path $Carpeta)) { return $null }
    $exe = Get-ChildItem -Path $Carpeta -Filter $Patron -ErrorAction SilentlyContinue |
           Where-Object { $_.Name -notlike "*.blockmap" } |
           Sort-Object LastWriteTime -Descending |
           Select-Object -First 1
    return $exe.FullName
}

$Origenes = @(
    @{ Origen = (Buscar-InstaladorMasReciente "F:\BarAvenida\BarAvenida.Desktop\dist"     "Bar Avenida Admin Setup *.exe");  Etiqueta = "Admin"  },
    @{ Origen = (Buscar-InstaladorMasReciente "F:\BarAvenida\BarAvenida.KDS.Desktop\dist" "Bar Avenida KDS Setup *.exe");    Etiqueta = "KDS"    },
    @{ Origen = (Buscar-InstaladorMasReciente "F:\BarAvenida\Installer\dist"              "Bar Avenida Server Setup *.exe"); Etiqueta = "Server" }
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  JUNTAR INSTALADORES BAR AVENIDA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$total = 0
foreach ($i in $Origenes) {
    if (Test-Path $i.Origen) {
        Copy-Item $i.Origen $Destino -Force
        $tamMB = [math]::Round((Get-Item $i.Origen).Length / 1MB, 2)
        Write-Host "[OK] $($i.Etiqueta): $tamMB MB" -ForegroundColor Green
        $total += (Get-Item $i.Origen).Length
    } else {
        Write-Host "[FALTA] $($i.Etiqueta): no encontrado en $($i.Origen)" -ForegroundColor Red
    }
}

# README con instrucciones
$readme = @"
========================================
  BAR AVENIDA - INSTALADORES
========================================

Este folder contiene los 3 instaladores listos para distribuir.

ORDEN DE INSTALACION (importante):

1. PRIMERO en la PC CENTRAL del bar (la que tiene la impresora):
   - Bar Avenida Server Setup 1.0.0.exe
     Esto instala el backend, BD, y registra el servicio Windows.
     PREREQUISITO: SQL Server (Express o superior) ya instalado.

2. DESPUES en la MISMA PC CENTRAL (o en cualquier otra PC):
   - Bar Avenida Admin Setup 1.1.0.exe
     Aplicacion de administracion. Auto-detecta el backend en la red.

3. EN LA PC DE LA BARRA:
   - Bar Avenida KDS Setup 1.1.0.exe
     Monitor de cocina/barra. Auto-detecta el backend.

4. PARA LAS MESERAS (celulares):
   - Conectarse al WiFi del bar (192.168.100.x)
   - Abrir Chrome y entrar a: http://192.168.100.10:7000/tablet/
   - Menu Chrome -> "Anadir a pantalla de inicio"

REQUISITOS:
- Windows 10 / 11 x64
- SQL Server (solo en la PC central del backend)
- Permisos de Administrador para instalar
- Red WiFi local del bar

URLS DE OPERACION (despues de instalar el server):
- Admin web:   http://192.168.100.10:7000/admin/
- KDS web:     http://192.168.100.10:7000/kds
- Tablet PWA:  http://192.168.100.10:7000/tablet/

PROBLEMAS COMUNES:
- Si Admin/KDS no encuentra el backend al abrir, escribe la IP a mano
  en la pantalla de configuracion, o usa Ctrl+Shift+S para reconfigurar.
- Si el servicio Windows no inicia, revisa permisos SQL para
  NT AUTHORITY\SYSTEM (script en F:\BarAvenida\Backups\fix-permisos-sql-system.sql).

Generado: $(Get-Date -Format "yyyy-MM-dd HH:mm")
"@

$readme | Out-File -FilePath (Join-Path $Destino "LEEME.txt") -Encoding UTF8

$totalMB = [math]::Round($total / 1MB, 2)
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  LISTO - $totalMB MB en total" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Carpeta:  $Destino" -ForegroundColor Cyan
Write-Host ""
Write-Host "Archivos:" -ForegroundColor Yellow
Get-ChildItem $Destino | ForEach-Object {
    $tam = if ($_.Length -gt 1MB) { "$([math]::Round($_.Length/1MB, 2)) MB" } else { "$([math]::Round($_.Length/1KB, 1)) KB" }
    Write-Host ("  {0,-50} {1}" -f $_.Name, $tam) -ForegroundColor Gray
}
Write-Host ""
Write-Host "Para abrir la carpeta:" -ForegroundColor Yellow
Write-Host "  explorer $Destino" -ForegroundColor Cyan
Write-Host ""
Write-Host "Conecta tu USB y arrastra los 4 archivos a la memoria." -ForegroundColor Yellow
Write-Host ""
