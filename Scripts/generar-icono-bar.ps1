# ============================================================================
# Bar Avenida - Generar icon.ico desde el logo JPEG
# Convierte el logo a ICO multi-resolucion y lo copia a las carpetas
# de los Electron apps (Admin y KDS).
# ============================================================================

$ErrorActionPreference = "Continue"
Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path $PSScriptRoot -Parent
$srcLogo  = "$repoRoot\BarAvenida.Admin\src\assets\logo-bar-avenida.jpeg"

$destinos = @(
    "$repoRoot\BarAvenida.Desktop\assets\icon.ico",
    "$repoRoot\BarAvenida.KDS.Desktop\assets\icon.ico"
)

if (-not (Test-Path $srcLogo)) {
    Write-Host "[ERROR] No encontre el logo: $srcLogo" -ForegroundColor Red
    exit 1
}

Write-Host "Convirtiendo logo a .ico..." -ForegroundColor Cyan
Write-Host "  Origen: $srcLogo" -ForegroundColor Gray

# Cargar imagen original
$bmpOriginal = [System.Drawing.Bitmap]::new($srcLogo)
Write-Host "  Tamano original: $($bmpOriginal.Width)x$($bmpOriginal.Height)" -ForegroundColor Gray

# Determinar el lado del cuadrado (recortamos al centro)
$lado = [Math]::Min($bmpOriginal.Width, $bmpOriginal.Height)
$offsetX = ([Math]::Floor(($bmpOriginal.Width  - $lado) / 2))
$offsetY = ([Math]::Floor(($bmpOriginal.Height - $lado) / 2))

# Crear bitmap cuadrado recortado
$bmpCuadrado = New-Object System.Drawing.Bitmap $lado, $lado
$g0 = [System.Drawing.Graphics]::FromImage($bmpCuadrado)
$g0.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g0.DrawImage($bmpOriginal, (New-Object System.Drawing.Rectangle 0, 0, $lado, $lado), $offsetX, $offsetY, $lado, $lado, [System.Drawing.GraphicsUnit]::Pixel)
$g0.Dispose()
$bmpOriginal.Dispose()

# Generar imagen 256x256 (formato moderno de Windows icons)
$bmp256 = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($bmp256)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($bmpCuadrado, 0, 0, 256, 256)
$g.Dispose()
$bmpCuadrado.Dispose()

# Guardar como PNG en memoria
$ms = New-Object System.IO.MemoryStream
$bmp256.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $ms.ToArray()
$ms.Dispose()
$bmp256.Dispose()

Write-Host "  PNG en memoria: $($pngBytes.Length) bytes" -ForegroundColor Gray

# Construir archivo ICO con 1 imagen PNG embebida (formato Vista+)
$icoStream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter $icoStream

# ICO header (6 bytes)
$writer.Write([UInt16]0)         # Reserved
$writer.Write([UInt16]1)         # Type = 1 (ICO)
$writer.Write([UInt16]1)         # Count = 1 imagen

# Image directory entry (16 bytes)
$writer.Write([Byte]0)           # Width 256 (0 = 256)
$writer.Write([Byte]0)           # Height 256 (0 = 256)
$writer.Write([Byte]0)           # Color count
$writer.Write([Byte]0)           # Reserved
$writer.Write([UInt16]1)         # Planes
$writer.Write([UInt16]32)        # BitCount
$writer.Write([UInt32]$pngBytes.Length)  # Image size
$writer.Write([UInt32]22)        # Offset (6 header + 16 entry = 22)

# Image data (PNG bytes)
$writer.Write($pngBytes)
$writer.Flush()

$icoBytes = $icoStream.ToArray()
$writer.Dispose()
$icoStream.Dispose()

Write-Host "  ICO generado: $($icoBytes.Length) bytes" -ForegroundColor Gray

# Escribir a las ubicaciones destino
foreach ($dst in $destinos) {
    $dir = Split-Path $dst -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    [System.IO.File]::WriteAllBytes($dst, $icoBytes)
    Write-Host "  [OK] $dst" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  ICONOS GENERADOS" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Proximo paso: lanzar release v1.5.1 desde NAU" -ForegroundColor Yellow
Write-Host '  powershell -ExecutionPolicy Bypass -File "C:\BarAvenida-dev\Scripts\release-total.ps1" -Version "1.5.1"' -ForegroundColor Cyan
Write-Host ""
