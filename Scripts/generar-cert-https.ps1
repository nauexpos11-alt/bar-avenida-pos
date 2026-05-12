# ============================================================================
# Bar Avenida - Generar cert PFX self-signed para HTTPS Kestrel (v1.9.0)
# ----------------------------------------------------------------------------
# Genera un certificado RSA-2048 valido por 10 anios para localhost,
# 192.168.100.10 y BarAvenida-LAN. Lo exporta como .pfx (con password) y
# como .cer (publico, sin password) en la misma carpeta.
#
# Uso (default):
#   .\generar-cert-https.ps1
#
# Uso (custom):
#   .\generar-cert-https.ps1 -OutPath "D:\certs\BarAvenida.pfx" `
#                            -Password "MiPassSegura!" `
#                            -Cn "BarAvenida-LAN"
#
# Tip Coronado: cuando un cliente Electron rechace HTTPS, distribuye el .cer
# y corre `confiar-cert-cliente.ps1` en esa PC.
# ============================================================================

param(
    [string]$OutPath  = "C:\ProgramData\Bar Avenida\cert\BarAvenida.pfx",
    [string]$Password = "BarAvenida2026!",
    [string]$Cn       = "BarAvenida-LAN"
)

$ErrorActionPreference = "Stop"

# --- Asegurar carpeta destino ----------------------------------------------
$outDir = Split-Path -Parent $OutPath
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    Write-Host "Carpeta creada: $outDir" -ForegroundColor Cyan
}

# --- Generar certificado ----------------------------------------------------
Write-Host ""
Write-Host "Generando certificado self-signed..." -ForegroundColor Cyan
Write-Host "  CN:        $Cn" -ForegroundColor Gray
Write-Host "  DnsNames:  localhost, 192.168.100.10, BarAvenida-LAN" -ForegroundColor Gray
Write-Host "  Vigencia:  10 anios" -ForegroundColor Gray
Write-Host "  Algoritmo: RSA 2048" -ForegroundColor Gray

$cert = New-SelfSignedCertificate `
    -Subject            "CN=$Cn" `
    -DnsName            "localhost", "192.168.100.10", "BarAvenida-LAN" `
    -KeyAlgorithm       "RSA" `
    -KeyLength          2048 `
    -NotAfter           (Get-Date).AddYears(10) `
    -CertStoreLocation  "Cert:\CurrentUser\My" `
    -KeyExportPolicy    Exportable `
    -KeyUsage           DigitalSignature, KeyEncipherment `
    -TextExtension      @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")

Write-Host ""
Write-Host "Certificado creado." -ForegroundColor Green
Write-Host "  Thumbprint: $($cert.Thumbprint)" -ForegroundColor Yellow
Write-Host "  Subject:    $($cert.Subject)" -ForegroundColor Gray
Write-Host "  NotAfter:   $($cert.NotAfter)" -ForegroundColor Gray

# --- Exportar PFX (con password) -------------------------------------------
$pfxPassword = ConvertTo-SecureString -String $Password -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $OutPath -Password $pfxPassword | Out-Null
Write-Host ""
Write-Host "PFX exportado (con password): $OutPath" -ForegroundColor Green

# --- Exportar .cer (publico, sin password) ----------------------------------
$cerPath = [System.IO.Path]::ChangeExtension($OutPath, ".cer")
Export-Certificate -Cert $cert -FilePath $cerPath -Type CERT | Out-Null
Write-Host ".cer exportado (publico):     $cerPath" -ForegroundColor Green

# --- Resumen final ----------------------------------------------------------
Write-Host ""
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host " Cert HTTPS Bar Avenida listo." -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " Thumbprint del cert:  $($cert.Thumbprint)" -ForegroundColor Yellow
Write-Host ""
Write-Host " PFX (servidor, va en Kestrel):" -ForegroundColor White
Write-Host "   $OutPath" -ForegroundColor Gray
Write-Host ""
Write-Host " .cer (publico, distribuir a PCs cliente):" -ForegroundColor White
Write-Host "   $cerPath" -ForegroundColor Gray
Write-Host ""
Write-Host " Tip Coronado: cuando un cliente Electron (Admin/KDS) rechace" -ForegroundColor White
Write-Host " el HTTPS, copia el .cer a esa PC y corre alli:" -ForegroundColor White
Write-Host "   confiar-cert-cliente.ps1 -PathCer `"...\BarAvenida.cer`"" -ForegroundColor Cyan
Write-Host ""

exit 0
