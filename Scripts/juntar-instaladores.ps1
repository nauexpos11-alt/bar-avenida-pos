# ============================================================================
# Bar Avenida - Juntar los 3 instaladores en una sola carpeta
# Auto-detecta si esta en F:\BarAvenida o E:\bar-avenida-pos
# ============================================================================

$ErrorActionPreference = "Stop"

# Auto-detectar repo root
$ScriptsDir = $PSScriptRoot
$RepoRoot   = Split-Path $ScriptsDir -Parent
$Destino    = Join-Path $RepoRoot "Releases"

New-Item -ItemType Directory -Path $Destino -Force | Out-Null

# Limpiar contenido viejo
Get-ChildItem $Destino -Force | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

function Buscar-InstaladorMasReciente {
    param([string]$Carpeta, [string]$Patron)
    if (-not (Test-Path $Carpeta)) { return $null }
    $exe = Get-ChildItem -Path $Carpeta -Filter $Patron -ErrorAction SilentlyContinue |
           Where-Object { $_.Name -notlike "*.blockmap" } |
           Sort-Object LastWriteTime -Descending |
           Select-Object -First 1
    if ($exe) { return $exe.FullName } else { return $null }
}

$Origenes = @(
    @{ Origen = (Buscar-InstaladorMasReciente (Join-Path $RepoRoot "BarAvenida.Desktop\dist")     "Bar Avenida Admin Setup *.exe");  Etiqueta = "Admin"  },
    @{ Origen = (Buscar-InstaladorMasReciente (Join-Path $RepoRoot "BarAvenida.KDS.Desktop\dist") "Bar Avenida KDS Setup *.exe");    Etiqueta = "KDS"    },
    @{ Origen = (Buscar-InstaladorMasReciente (Join-Path $RepoRoot "Installer\dist")              "Bar Avenida Server Setup *.exe"); Etiqueta = "Server" }
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  JUNTAR INSTALADORES BAR AVENIDA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Repo: $RepoRoot" -ForegroundColor Gray
Write-Host "  Destino: $Destino" -ForegroundColor Gray
Write-Host ""

$total = 0
foreach ($i in $Origenes) {
    if ($i.Origen -and (Test-Path $i.Origen)) {
        Copy-Item $i.Origen $Destino -Force
        $tamMB = [math]::Round((Get-Item $i.Origen).Length / 1MB, 2)
        Write-Host "[OK] $($i.Etiqueta): $tamMB MB" -ForegroundColor Green
        $total += (Get-Item $i.Origen).Length
    } else {
        Write-Host "[FALTA] $($i.Etiqueta): no encontrado" -ForegroundColor Red
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
   - Bar Avenida Server Setup X.Y.Z.exe
     Esto instala el backend, BD, y registra el servicio Windows.
     PREREQUISITO: SQL Server (Express o superior) con instancia MSSQLSERVER01.

2. DESPUES en la MISMA PC CENTRAL (o en cualquier otra PC):
   - Bar Avenida Admin Setup X.Y.Z.exe
     Aplicacion de administracion. Auto-detecta el backend en la red.

3. EN LA PC DE LA BARRA:
   - Bar Avenida KDS Setup X.Y.Z.exe
     Monitor de cocina/barra. Auto-detecta el backend.

4. PARA LAS MESERAS (celulares):
   - Conectarse al WiFi del bar
   - Abrir Chrome y entrar a: http://IP-DEL-BAR:7000/tablet/
   - Menu Chrome -> "Anadir a pantalla de inicio"

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
