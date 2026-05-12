# ============================================================================
# Bar Avenida - Confiar cert HTTPS en una PC cliente (v1.9.0)
# ----------------------------------------------------------------------------
# Importa el .cer publico al store Trusted Root (LocalMachine\Root) y a
# TrustedPublisher (LocalMachine\TrustedPublisher) para que las apps Electron
# (Admin, KDS) acepten el HTTPS del backend de Bar Avenida sin warnings.
#
# Uso:
#   .\confiar-cert-cliente.ps1 -PathCer "C:\temp\BarAvenida.cer"
#
# Requiere ejecutar como Administrador (escribe en LocalMachine).
# ============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$PathCer
)

$ErrorActionPreference = "Stop"

# --- Validar archivo --------------------------------------------------------
if (-not (Test-Path $PathCer)) {
    Write-Host "ERROR: No se encontro $PathCer" -ForegroundColor Red
    exit 1
}

# --- Verificar privilegios de Administrador --------------------------------
$esAdmin = ([Security.Principal.WindowsPrincipal] `
            [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
            [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Write-Host "ERROR: Este script requiere Administrador (escribe en LocalMachine)." -ForegroundColor Red
    Write-Host "Click derecho en PowerShell -> Ejecutar como administrador." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Importando $PathCer ..." -ForegroundColor Cyan

# --- Leer thumbprint para verificacion -------------------------------------
$certInfo = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2 $PathCer
$thumbprint = $certInfo.Thumbprint
Write-Host "  Subject:    $($certInfo.Subject)" -ForegroundColor Gray
Write-Host "  Thumbprint: $thumbprint" -ForegroundColor Yellow

# --- Importar a Trusted Root (Cert:\LocalMachine\Root) ---------------------
Write-Host ""
Write-Host "Importando a Cert:\LocalMachine\Root (Trusted Root)..." -ForegroundColor Cyan
Import-Certificate -FilePath $PathCer -CertStoreLocation Cert:\LocalMachine\Root | Out-Null

# --- Importar a TrustedPublisher (Cert:\LocalMachine\TrustedPublisher) -----
Write-Host "Importando a Cert:\LocalMachine\TrustedPublisher..." -ForegroundColor Cyan
Import-Certificate -FilePath $PathCer -CertStoreLocation Cert:\LocalMachine\TrustedPublisher | Out-Null

# --- Verificar -------------------------------------------------------------
$enRoot = Get-ChildItem Cert:\LocalMachine\Root | Where-Object { $_.Thumbprint -eq $thumbprint }
$enPub  = Get-ChildItem Cert:\LocalMachine\TrustedPublisher | Where-Object { $_.Thumbprint -eq $thumbprint }

if ($enRoot -eq $null -or $enPub -eq $null) {
    Write-Host ""
    Write-Host "ERROR: la verificacion fallo." -ForegroundColor Red
    Write-Host "  En Trusted Root:        $([bool]$enRoot)" -ForegroundColor Red
    Write-Host "  En TrustedPublisher:    $([bool]$enPub)"  -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "===========================================================" -ForegroundColor Green
Write-Host " Listo. Esta PC ya confia en el cert HTTPS de Bar Avenida." -ForegroundColor Green
Write-Host " Reinicia las apps Admin/KDS para que usen HTTPS."          -ForegroundColor Green
Write-Host "===========================================================" -ForegroundColor Green
Write-Host ""
Write-Host " Thumbprint instalado: $thumbprint" -ForegroundColor Gray
Write-Host ""

exit 0
