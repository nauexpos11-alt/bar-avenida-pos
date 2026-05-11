# Commit + push v1.5.0: pantalla QR para conectar tablets + bug fix
$ErrorActionPreference = "Continue"
git config --global --add safe.directory C:/BarAvenida-dev 2>&1 | Out-Null
Push-Location "C:\BarAvenida-dev"

try {
    Write-Host "=== git status ===" -ForegroundColor Cyan
    git status --short
    Write-Host ""

    git add BarAvenida.API/Controllers/SistemaController.cs        2>&1 | Out-Null
    git add BarAvenida.Admin/src/screens/QRTabletScreen.jsx        2>&1 | Out-Null
    git add BarAvenida.Admin/src/screens/QRTabletScreen.css        2>&1 | Out-Null
    git add BarAvenida.Admin/src/App.jsx                           2>&1 | Out-Null
    git add BarAvenida.Admin/src/components/TopMenuBar.jsx         2>&1 | Out-Null
    git add Scripts/install-tarea-auto-update.ps1                  2>&1 | Out-Null
    git add Scripts/commit-v1.5.0-qr.ps1                           2>&1 | Out-Null

    $msg = @"
feat(qr): v1.5.0 pantalla Conectar Tablets con QR dinamico

Backend:
- SistemaController nuevo endpoint GET /api/sistema/ip-real.
  Devuelve la IP local real de WiFi/Ethernet (filtra WSL,
  Hyper-V, VMware, APIPA). Preferencia 192.168.x > 10.x > 172.x.
  Retorna: ip, puerto, urlTablet, urlAdmin, urlKds, ipsCandidatas.

Frontend Admin:
- QRTabletScreen.jsx + .css nueva pantalla.
  Consulta /api/sistema/ip-real al montar.
  Genera QR via api.qrserver.com con la URL de la tablet.
  Hoja imprimible con tema dorado/negro: marca BAR AVENIDA arriba,
  QR grande 320x320 con borde dorado, IP + URL en texto,
  5 pasos numerados para meseras nuevas.
  Boton Imprimir esta hoja usa window.print con @media print.
  Las meseras escanean una vez y la PWA queda como app.
- App.jsx: case conectar-tablets agregado al switch.
- TopMenuBar.jsx: item Conectar tablets en menu Configuracion.

Bug fixes:
- install-tarea-auto-update.ps1: detecta si source y destination
  son el mismo archivo antes de Copy-Item. Evita el error
  No se puede sobrescribir consigo mismo visto en v1.4.0.

Resultado: el admin va a Config -> Conectar tablets, ve la URL,
imprime una hoja con QR, la pega en la barra. Mesera nueva escanea
con su camara y queda lista en 30 segundos sin escribir IPs.
"@

    git commit -m $msg 2>&1 | Out-Host

    Write-Host ""
    Write-Host "==> PUSH" -ForegroundColor Green
    git push origin main 2>&1 | Out-Host

    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "  v1.5.0 PUSHEADO" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "PROXIMO: lanzar release v1.5.0" -ForegroundColor Yellow
    Write-Host '  powershell -ExecutionPolicy Bypass -File "C:\BarAvenida-dev\Scripts\release-total.ps1" -Version "1.5.0"' -ForegroundColor Cyan
    Write-Host ""
}
finally {
    Pop-Location
}
