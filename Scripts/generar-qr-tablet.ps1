# ============================================================================
# Bar Avenida - Generar QR code para la URL de la Tablet
# Genera un PNG con el QR que apunta a http://192.168.100.10:7000/tablet/
# Para imprimir y pegar en la barra del bar.
#
# Uso:
#   .\generar-qr-tablet.ps1
#   .\generar-qr-tablet.ps1 -IP 192.168.100.10
# ============================================================================

param(
    [string]$IP = "192.168.100.10",
    [string]$OutputDir = "C:\BarAvenida-dev\Releases"
)

$ErrorActionPreference = "Continue"

$urlTablet = "http://${IP}:7000/tablet/"
$urlAdmin  = "http://${IP}:7000/admin/"
$urlKds    = "http://${IP}:7000/kds"

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

# ──────────────────────────────────────────────────────────
# Usar API publica de QR Server (no requiere instalar nada)
# ──────────────────────────────────────────────────────────
function Generar-QR {
    param([string]$Url, [string]$NombreArchivo, [string]$Etiqueta)

    $qrApiUrl = "https://api.qrserver.com/v1/create-qr-code/?size=600x600&format=png&margin=20&data=" + [Uri]::EscapeDataString($Url)
    $output   = Join-Path $OutputDir $NombreArchivo

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $qrApiUrl -OutFile $output -UseBasicParsing -TimeoutSec 30
        $kb = [math]::Round((Get-Item $output).Length / 1KB, 1)
        Write-Host "[OK] $Etiqueta -> $output ($kb KB)" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] $Etiqueta : $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Generando QR codes para IP $IP" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Generar-QR -Url $urlTablet -NombreArchivo "QR-Tablet-Meseras.png"  -Etiqueta "Tablet meseras"
Generar-QR -Url $urlAdmin  -NombreArchivo "QR-Admin.png"            -Etiqueta "Admin"
Generar-QR -Url $urlKds    -NombreArchivo "QR-KDS.png"              -Etiqueta "KDS"

# ──────────────────────────────────────────────────────────
# Crear un HTML imprimible con los 3 QRs
# ──────────────────────────────────────────────────────────
$htmlPath = Join-Path $OutputDir "QR-imprimir.html"
$html = @"
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Bar Avenida - QR Codes</title>
<style>
  @page { size: A4; margin: 1cm; }
  body {
    font-family: Arial, sans-serif;
    background: #fff;
    color: #0a0a0a;
    margin: 0;
    padding: 20px;
  }
  .header {
    text-align: center;
    padding: 20px;
    background: #0a0a0a;
    color: #f0c842;
    border-radius: 12px;
    margin-bottom: 30px;
  }
  .header h1 { margin: 0; font-size: 32px; }
  .header p  { margin: 5px 0 0; font-size: 14px; color: #ccc; }
  .qr-card {
    border: 3px solid #f0c842;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 25px;
    text-align: center;
    page-break-inside: avoid;
  }
  .qr-card h2 {
    color: #0a0a0a;
    margin: 0 0 5px;
    font-size: 24px;
  }
  .qr-card .url {
    font-family: monospace;
    background: #f5f5f5;
    padding: 8px 14px;
    border-radius: 6px;
    margin: 10px 0;
    display: inline-block;
    color: #555;
  }
  .qr-card img {
    max-width: 280px;
    height: auto;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fff;
  }
  .qr-card .instrucciones {
    margin-top: 12px;
    text-align: left;
    max-width: 400px;
    margin-left: auto;
    margin-right: auto;
    font-size: 13px;
    color: #333;
  }
  .qr-card .instrucciones ol {
    padding-left: 20px;
  }
</style>
</head>
<body>

<div class="header">
  <h1>🍺 Bar Avenida</h1>
  <p>Escanea el QR de tu rol con la cámara del celular</p>
</div>

<div class="qr-card">
  <h2>📱 MESERAS - Tablet</h2>
  <div class="url">$urlTablet</div>
  <br>
  <img src="QR-Tablet-Meseras.png" alt="QR Tablet">
  <div class="instrucciones">
    <ol>
      <li>Conéctate al WiFi del bar</li>
      <li>Abre la cámara del celular y apunta al QR</li>
      <li>Toca el link que aparece</li>
      <li>Menú Chrome (⋮) → "Añadir a pantalla de inicio"</li>
      <li>Login con tu código y PIN</li>
    </ol>
  </div>
</div>

<div class="qr-card">
  <h2>💼 ADMIN - Web</h2>
  <div class="url">$urlAdmin</div>
  <br>
  <img src="QR-Admin.png" alt="QR Admin">
  <div class="instrucciones">
    Para abrir el Admin desde el navegador de cualquier PC
    de la misma red WiFi. Recomendado solo si no tienes
    instalada la app Electron de Admin.
  </div>
</div>

<div class="qr-card">
  <h2>🍽️ KDS - Barman</h2>
  <div class="url">$urlKds</div>
  <br>
  <img src="QR-KDS.png" alt="QR KDS">
  <div class="instrucciones">
    Para abrir el monitor de la barra desde cualquier PC
    de la misma red WiFi. Recomendado solo si no tienes
    instalada la app Electron del KDS.
  </div>
</div>

</body>
</html>
"@

$html | Out-File -FilePath $htmlPath -Encoding UTF8

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  LISTO" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Archivos generados en:" -ForegroundColor Yellow
Write-Host "  $OutputDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para imprimir todos los QRs en una hoja A4:" -ForegroundColor Yellow
Write-Host "  start `"$htmlPath`"" -ForegroundColor Cyan
Write-Host "  (Te abre en el browser -> Ctrl+P -> Imprimir)" -ForegroundColor Gray
Write-Host ""
Write-Host "Para imprimir solo el QR de meseras (mas grande):" -ForegroundColor Yellow
Write-Host "  start `"$OutputDir\QR-Tablet-Meseras.png`"" -ForegroundColor Cyan
Write-Host ""
