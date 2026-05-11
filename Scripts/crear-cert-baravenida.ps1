# ============================================================================
# Bar Avenida - Crear Certificado Self-Signed para firmar .exe
# ----------------------------------------------------------------------------
# Genera un cert valido por 20 anos para firmar Server, Admin, KDS, Tablet.
# Solo se corre UNA VEZ. Guarda PFX (privado) + CER (publico) en cert/
# ============================================================================

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path $PSScriptRoot -Parent
$certDir  = Join-Path $repoRoot "cert"
$pfxPath  = Join-Path $certDir "BarAvenidaCodeSigning.pfx"
$cerPath  = Join-Path $certDir "BarAvenidaCodeSigning.cer"
$pwdFile  = Join-Path $certDir "cert-password.txt"

New-Item -ItemType Directory -Path $certDir -Force | Out-Null

if (Test-Path $pfxPath) {
    Write-Host "[INFO] Ya existe $pfxPath" -ForegroundColor Yellow
    Write-Host "       Si quieres regenerar, borralo manualmente primero." -ForegroundColor Yellow
    exit 0
}

# 1. Generar cert
Write-Host "Generando cert..." -ForegroundColor Cyan
$cert = New-SelfSignedCertificate `
    -Subject "CN=Bar Avenida POS, O=Bar Avenida, L=Saltillo, S=Coahuila, C=MX" `
    -Type CodeSigningCert `
    -KeyAlgorithm RSA `
    -KeyLength 4096 `
    -KeyUsage DigitalSignature `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3") `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -NotAfter (Get-Date).AddYears(20)

Write-Host "[OK] Cert generado: $($cert.Thumbprint)" -ForegroundColor Green

# 2. Generar password aleatorio
$pwd = -join ((33..126) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
$securePwd = ConvertTo-SecureString -String $pwd -Force -AsPlainText

# 3. Exportar PFX (privado, para firmar)
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePwd | Out-Null
Write-Host "[OK] PFX guardado: $pfxPath" -ForegroundColor Green

# 4. Exportar CER (publico, para instalar en las PCs cliente)
Export-Certificate -Cert $cert -FilePath $cerPath | Out-Null
Write-Host "[OK] CER guardado: $cerPath" -ForegroundColor Green

# 5. Guardar password en archivo (este archivo NO va a git)
Set-Content -Path $pwdFile -Value $pwd -Encoding UTF8 -NoNewline
Write-Host "[OK] Password guardada en: $pwdFile" -ForegroundColor Green

# 6. Asegurar que cert/cert-password.txt y cert/*.pfx NO se commiten
$gitignore = Join-Path $repoRoot ".gitignore"
$lineas = @(
    "cert/*.pfx",
    "cert/cert-password.txt"
)
if (Test-Path $gitignore) {
    $contenido = Get-Content $gitignore -Raw
    foreach ($l in $lineas) {
        if ($contenido -notmatch [regex]::Escape($l)) {
            Add-Content -Path $gitignore -Value $l
        }
    }
}

# 7. Eliminar el cert del store de usuario (ya esta en PFX, no lo necesitamos en el store)
Remove-Item "Cert:\CurrentUser\My\$($cert.Thumbprint)" -DeleteKey -Force

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  CERTIFICADO CREADO" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Archivos:" -ForegroundColor Cyan
Write-Host "  PFX (privado, no compartir): $pfxPath" -ForegroundColor Gray
Write-Host "  CER (publico, distribuir):   $cerPath" -ForegroundColor Gray
Write-Host "  Password:                    $pwdFile" -ForegroundColor Gray
Write-Host ""
Write-Host "Proximos pasos automaticos:" -ForegroundColor Yellow
Write-Host "  - release-total.ps1 usara el PFX para firmar los .exe" -ForegroundColor Gray
Write-Host "  - INSTALAR-EN-BAR.ps1 instalara el CER en la PC del bar" -ForegroundColor Gray
Write-Host ""
