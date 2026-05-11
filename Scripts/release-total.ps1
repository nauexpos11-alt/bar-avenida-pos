# ============================================================================
# Bar Avenida - RELEASE TOTAL
# Bumpa version, compila TODOS los instaladores, publica GitHub Release.
#
# Uso:
#   .\release-total.ps1 -Version "1.2.0"
#   .\release-total.ps1 -Version "1.2.0" -SkipGitHubRelease   (solo builds)
#
# Requisitos:
#   - Inno Setup 6+ (se auto-instala via winget si falta)
#   - Node.js + npm
#   - .NET 8 SDK
#   - GitHub CLI (gh) autenticado (gh auth login)
#
# Lo que hace:
#   1. Verifica prerequisitos
#   2. Bumpa version en todos los package.json + Inno Setup .iss
#   3. Compila Backend self-contained (dotnet publish)
#   4. Compila Inno Setup del Server -> Bar Avenida Server Setup X.Y.Z.exe
#   5. Compila Admin Electron -> Bar Avenida Admin Setup X.Y.Z.exe
#   6. Compila KDS Electron -> Bar Avenida KDS Setup X.Y.Z.exe
#   7. Junta los 3 .exe en F:\BarAvenida\Releases\
#   8. (Opcional) Crea GitHub Release con los 3 .exe + LEEME
#   9. Imprime URLs para descargar
# ============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,

    [switch]$SkipGitHubRelease = $false,

    [switch]$SkipBackend = $false,
    [switch]$SkipAdmin   = $false,
    [switch]$SkipKDS     = $false
)

$ErrorActionPreference = "Continue"

# ──────────────────────────────────────────────────────────
# Paths del proyecto - auto-detectar segun donde este este script
# ──────────────────────────────────────────────────────────
# Si el script vive en algun/Scripts/, el repo root es algun/
$RepoRoot = Split-Path $PSScriptRoot -Parent

# Fallback: probar ubicaciones conocidas si $PSScriptRoot no aplica
if (-not (Test-Path "$RepoRoot\BarAvenida.API")) {
    foreach ($candidato in @("C:\BarAvenida-dev", "F:\BarAvenida", "E:\bar-avenida-pos")) {
        if (Test-Path "$candidato\BarAvenida.API") {
            $RepoRoot = $candidato
            break
        }
    }
}

$ApiDir        = "$RepoRoot\BarAvenida.API"
$AdminDir      = "$RepoRoot\BarAvenida.Admin"
$KdsDir        = "$RepoRoot\BarAvenida.KDS"
$TabletDir     = "$RepoRoot\BarAvenida.Tablet"
$DesktopDir    = "$RepoRoot\BarAvenida.Desktop"
$KdsDeskDir    = "$RepoRoot\BarAvenida.KDS.Desktop"
$TabletDeskDir = "$RepoRoot\BarAvenida.Tablet.Desktop"
$InstallerDir  = "$RepoRoot\Installer"
$ReleasesDir   = "$RepoRoot\Releases"

Write-Host "[INFO] Repo detectado: $RepoRoot" -ForegroundColor Yellow

function Log([string]$msg, [string]$color = "White") {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor $color
}

function LogStep([string]$msg) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Log $msg "Cyan"
    Write-Host "========================================" -ForegroundColor Cyan
}

function Verificar-Version([string]$v) {
    if ($v -notmatch '^\d+\.\d+\.\d+$') {
        Log "Version invalida: $v (formato: X.Y.Z)" "Red"
        exit 1
    }
}

function BumpJson([string]$file, [string]$ver) {
    if (-not (Test-Path $file)) {
        Log "  [SKIP] $file no existe" "Gray"
        return
    }
    # Lectura sin BOM para no romper package.json
    $json = Get-Content $file -Raw -Encoding UTF8 | ConvertFrom-Json
    $json.version = $ver

    # Escribir SIN BOM (UTF-8 puro)
    $utf8 = New-Object System.Text.UTF8Encoding $false
    $text = ($json | ConvertTo-Json -Depth 100)
    [System.IO.File]::WriteAllText($file, $text, $utf8)
    Log "  [OK] $file -> $ver" "Green"
}

function BumpInnoSetup([string]$file, [string]$ver) {
    if (-not (Test-Path $file)) {
        Log "  [SKIP] $file no existe" "Gray"
        return
    }
    $content = Get-Content $file -Raw
    $content = $content -replace 'AppVersion=[\d\.]+', "AppVersion=$ver"
    $content = $content -replace 'OutputBaseFilename=Bar Avenida Server Setup [\d\.]+', "OutputBaseFilename=Bar Avenida Server Setup $ver"
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($file, $content, $utf8)
    Log "  [OK] $file -> $ver" "Green"
}

# ──────────────────────────────────────────────────────────
# 0. Pre-flight checks
# ──────────────────────────────────────────────────────────
LogStep "0. PRE-FLIGHT CHECKS"

Verificar-Version $Version

# .NET
$dotnetOk = (Get-Command dotnet -ErrorAction SilentlyContinue) -ne $null
if ($dotnetOk) { Log "[OK] dotnet" "Green" } else { Log "[FAIL] dotnet no encontrado" "Red"; exit 1 }

# Node
$nodeOk = (Get-Command npm -ErrorAction SilentlyContinue) -ne $null
if ($nodeOk) { Log "[OK] npm" "Green" } else { Log "[FAIL] npm no encontrado" "Red"; exit 1 }

# Repo
if (-not (Test-Path $RepoRoot)) { Log "[FAIL] $RepoRoot no existe" "Red"; exit 1 }
Log "[OK] Repo: $RepoRoot" "Green"

# GitHub CLI
$ghOk = $false
if (-not $SkipGitHubRelease) {
    $ghCmd = Get-Command gh -ErrorAction SilentlyContinue
    if ($ghCmd) {
        $ghStatus = & gh auth status 2>&1
        if ($LASTEXITCODE -eq 0) {
            Log "[OK] gh CLI autenticado" "Green"
            $ghOk = $true
        } else {
            Log "[WARN] gh CLI instalado pero no autenticado. Corre: gh auth login" "Yellow"
            Log "       (Continuamos pero NO se subira el Release a GitHub)" "Yellow"
        }
    } else {
        Log "[WARN] gh CLI no instalado. Instala con: winget install --id GitHub.cli" "Yellow"
        Log "       (Continuamos pero NO se subira el Release a GitHub)" "Yellow"
    }
}

# ──────────────────────────────────────────────────────────
# 1. Bump versions
# ──────────────────────────────────────────────────────────
LogStep "1. BUMP VERSIONS a $Version"

BumpJson "$DesktopDir\package.json"   $Version
BumpJson "$KdsDeskDir\package.json"   $Version
BumpJson "$AdminDir\package.json"     $Version
BumpJson "$KdsDir\package.json"       $Version
BumpJson "$TabletDir\package.json"    $Version
BumpJson "$TabletDeskDir\package.json" $Version

BumpInnoSetup "$InstallerDir\BarAvenidaServer.iss" $Version

# ──────────────────────────────────────────────────────────
# 2. Build Tablet, Admin, KDS web (sirven el wwwroot del backend)
# Admin y KDS tienen vite outDir -> ../BarAvenida.API/wwwroot/{slug}/ directo.
# Tablet usa dist/ default, hay que copiarlo manualmente a wwwroot/tablet/.
# ──────────────────────────────────────────────────────────
LogStep "2. BUILD FRONTENDS WEB + SYNC A WWWROOT"

foreach ($fe in @(
    @{ Dir = $TabletDir; Name = "Tablet"; WwwRootSlug = "tablet"; SyncManual = $true  },
    @{ Dir = $AdminDir;  Name = "Admin";  WwwRootSlug = "admin";  SyncManual = $false },
    @{ Dir = $KdsDir;    Name = "KDS";    WwwRootSlug = "kds";    SyncManual = $false }
)) {
    if (-not (Test-Path $fe.Dir)) {
        Log "[SKIP] $($fe.Name) no existe" "Gray"
        continue
    }
    Log "Build $($fe.Name)..." "Yellow"
    Push-Location $fe.Dir
    try {
        # Install si node_modules falta
        if (-not (Test-Path "node_modules")) {
            Log "  Instalando dependencias..." "Gray"
            npm install --silent 2>&1 | Out-Null
        }
        # Capturar output del build para diagnosticar fallas
        $buildLog = npm run build 2>&1
        if ($LASTEXITCODE -eq 0) {
            Log "  [OK] $($fe.Name) build" "Green"
        } else {
            Log "  [FAIL] $($fe.Name) build fallo (exit $LASTEXITCODE)" "Red"
            $buildLog | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
            Pop-Location
            exit 1
        }
    } finally {
        Pop-Location
    }

    # ─── Sync manual de dist/ -> wwwroot/{slug}/ (solo Tablet) ────────────────
    if ($fe.SyncManual) {
        $distSrc = Join-Path $fe.Dir "dist"
        $wwwDst  = Join-Path $ApiDir "wwwroot\$($fe.WwwRootSlug)"
        if (-not (Test-Path $distSrc)) {
            Log "  [FAIL] $($fe.Name) dist/ no existe despues del build" "Red"
            exit 1
        }
        Log "  Sync $($fe.Name) -> wwwroot\$($fe.WwwRootSlug)" "Yellow"
        if (Test-Path $wwwDst) {
            Remove-Item -Recurse -Force "$wwwDst\*" -ErrorAction SilentlyContinue
        } else {
            New-Item -ItemType Directory -Path $wwwDst -Force | Out-Null
        }
        Copy-Item -Recurse -Force "$distSrc\*" $wwwDst
        Log "  [OK] $($fe.Name) copiado a wwwroot" "Green"
    }
}

# ──────────────────────────────────────────────────────────
# 3. Backend self-contained publish
# ──────────────────────────────────────────────────────────
if (-not $SkipBackend) {
    LogStep "3. BUILD BACKEND SELF-CONTAINED"

    Push-Location $ApiDir
    try {
        Log "Limpiando publish-installer..." "Yellow"
        Remove-Item -Recurse -Force "$ApiDir\publish-installer" -ErrorAction SilentlyContinue

        Log "dotnet publish self-contained win-x64..." "Yellow"
        dotnet publish -c Release -r win-x64 --self-contained true -o publish-installer 2>&1 | Tee-Object -Variable buildOut | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Log "[FAIL] dotnet publish fallo" "Red"
            $buildOut | Where-Object { $_ -match "error|Error" } | ForEach-Object { Write-Host $_ -ForegroundColor Red }
            Pop-Location
            exit 1
        }
        Log "[OK] Backend publicado en $ApiDir\publish-installer" "Green"
    } finally {
        Pop-Location
    }
}

# ──────────────────────────────────────────────────────────
# 4. Compilar Inno Setup del Backend
# ──────────────────────────────────────────────────────────
if (-not $SkipBackend) {
    LogStep "4. COMPILAR INSTALADOR DEL BACKEND"

    & "$InstallerDir\compilar-instalador.ps1"
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
        Log "[FAIL] Compilar Inno Setup fallo" "Red"
        exit 1
    }
    Log "[OK] Server Setup $Version.exe generado" "Green"
}

# ──────────────────────────────────────────────────────────
# 5. Build Admin Electron .exe
# ──────────────────────────────────────────────────────────
if (-not $SkipAdmin) {
    LogStep "5. BUILD ADMIN ELECTRON"

    Push-Location $DesktopDir
    try {
        if (-not (Test-Path "node_modules")) {
            Log "  Instalando dependencias..." "Gray"
            npm install --silent 2>&1 | Out-Null
        }
        Log "electron-builder --win..." "Yellow"
        npm run build 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Log "[OK] Admin .exe generado en $DesktopDir\dist" "Green"
        } else {
            Log "[FAIL] electron-builder Admin fallo" "Red"
            Pop-Location
            exit 1
        }
    } finally {
        Pop-Location
    }
}

# ──────────────────────────────────────────────────────────
# 6. Build KDS Electron .exe
# ──────────────────────────────────────────────────────────
if (-not $SkipKDS) {
    LogStep "6. BUILD KDS ELECTRON"

    Push-Location $KdsDeskDir
    try {
        if (-not (Test-Path "node_modules")) {
            Log "  Instalando dependencias..." "Gray"
            npm install --silent 2>&1 | Out-Null
        }
        Log "electron-builder --win..." "Yellow"
        npm run build 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Log "[OK] KDS .exe generado en $KdsDeskDir\dist" "Green"
        } else {
            Log "[FAIL] electron-builder KDS fallo" "Red"
            Pop-Location
            exit 1
        }
    } finally {
        Pop-Location
    }
}

# ──────────────────────────────────────────────────────────
# 6.5. Build TABLET Electron .exe
# ──────────────────────────────────────────────────────────
$TabletDeskDir = "$RepoRoot\BarAvenida.Tablet.Desktop"
if (-not $SkipKDS -and (Test-Path $TabletDeskDir)) {
    LogStep "6.5. BUILD TABLET ELECTRON"

    Push-Location $TabletDeskDir
    try {
        if (-not (Test-Path "node_modules")) {
            Log "  Instalando dependencias..." "Gray"
            npm install --silent 2>&1 | Out-Null
        }
        Log "electron-builder --win..." "Yellow"
        npm run build 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Log "[OK] Tablet .exe generado en $TabletDeskDir\dist" "Green"
        } else {
            Log "[WARN] electron-builder Tablet fallo" "Yellow"
        }
    } finally {
        Pop-Location
    }
}

# ──────────────────────────────────────────────────────────
# 6.9. FIRMAR los .exe Electron con el cert self-signed
# ──────────────────────────────────────────────────────────
LogStep "6.9. FIRMANDO los .exe con cert self-signed"

$pfxPath = "$RepoRoot\cert\BarAvenidaCodeSigning.pfx"
$pwdFile = "$RepoRoot\cert\cert-password.txt"

if (-not (Test-Path $pfxPath)) {
    Log "[WARN] No existe $pfxPath. Corre Scripts\crear-cert-baravenida.ps1 primero." "Yellow"
    Log "Saltando firma. Los .exe iran sin firma." "Yellow"
} else {
    $certPwdRaw = (Get-Content $pwdFile -Raw).Trim()
    try {
        # Importar el cert al store temporalmente para poder firmar
        $certPwd = ConvertTo-SecureString -String $certPwdRaw -Force -AsPlainText
        $cert = Import-PfxCertificate -FilePath $pfxPath -CertStoreLocation "Cert:\CurrentUser\My" -Password $certPwd -Exportable
        if (-not $cert.HasPrivateKey) {
            Log "[FAIL] El cert no tiene private key" "Red"
            $cert = $null
        } else {
            Log "[OK] Cert cargado (thumbprint: $($cert.Thumbprint.Substring(0,10))...)" "Green"
        }
    } catch {
        Log "[FAIL] No se pudo cargar el cert: $($_.Exception.Message)" "Red"
        $cert = $null
    }

    if ($cert) {
        $dirs = @($DesktopDir, $KdsDeskDir, $TabletDeskDir)

        foreach ($d in $dirs) {
            $distPath = Join-Path $d "dist"
            if (-not (Test-Path $distPath)) { continue }

            # Solo firmar el .exe del Version actual (no los builds viejos)
            $exes = Get-ChildItem $distPath -Filter "*Setup*$Version*.exe" -ErrorAction SilentlyContinue
            foreach ($exe in $exes) {
                if ($exe.Name -like "*.blockmap") { continue }
                $exePath = $exe.FullName
                $nombreCorto = $exe.Name
                try {
                    # Sin TimestampServer (es opcional y a veces falla)
                    $r = Set-AuthenticodeSignature -FilePath $exePath -Certificate $cert -ErrorAction Stop
                    if ($r.Status -eq "Valid") {
                        Log "  [OK] Firmado: $nombreCorto" "Green"
                    } else {
                        Log "  [WARN] Status: $($r.Status) - $($r.StatusMessage) en $nombreCorto" "Yellow"
                    }
                } catch {
                    Log "  [FAIL] $nombreCorto - $($_.Exception.Message)" "Red"
                }
            }
        }
        Log "[OK] Firma completada" "Green"
    }
}

# ──────────────────────────────────────────────────────────
# 7. Juntar los 3 instaladores en Releases\
# ──────────────────────────────────────────────────────────
LogStep "7. JUNTAR INSTALADORES EN Releases/"

if (Test-Path "$RepoRoot\Scripts\juntar-instaladores.ps1") {
    & "$RepoRoot\Scripts\juntar-instaladores.ps1"
} else {
    Log "[WARN] juntar-instaladores.ps1 no existe, saltando" "Yellow"
}

# ──────────────────────────────────────────────────────────
# 8. Crear GitHub Release con los 3 .exe
# ──────────────────────────────────────────────────────────
if ($ghOk -and (-not $SkipGitHubRelease)) {
    LogStep "8. PUBLICAR GITHUB RELEASE v$Version"

    Push-Location $RepoRoot
    try {
        # Construir lista de assets
        $assets = @()
        $exe1 = Get-ChildItem "$DesktopDir\dist" -Filter "Bar Avenida Admin Setup *.exe" -ErrorAction SilentlyContinue |
                Where-Object { $_.Name -notlike "*.blockmap" } |
                Sort-Object LastWriteTime -Descending |
                Select-Object -First 1
        if ($exe1) { $assets += $exe1.FullName }

        $exe2 = Get-ChildItem "$KdsDeskDir\dist" -Filter "Bar Avenida KDS Setup *.exe" -ErrorAction SilentlyContinue |
                Where-Object { $_.Name -notlike "*.blockmap" } |
                Sort-Object LastWriteTime -Descending |
                Select-Object -First 1
        if ($exe2) { $assets += $exe2.FullName }

        $exe3 = Get-ChildItem "$InstallerDir\dist" -Filter "Bar Avenida Server Setup *.exe" -ErrorAction SilentlyContinue |
                Sort-Object LastWriteTime -Descending |
                Select-Object -First 1
        if ($exe3) { $assets += $exe3.FullName }

        # Tablet.Desktop (v1.7.0+)
        if (Test-Path "$TabletDeskDir\dist") {
            $exe4 = Get-ChildItem "$TabletDeskDir\dist" -Filter "Bar Avenida Tablet Setup *.exe" -ErrorAction SilentlyContinue |
                    Where-Object { $_.Name -notlike "*.blockmap" } |
                    Sort-Object LastWriteTime -Descending |
                    Select-Object -First 1
            if ($exe4) { $assets += $exe4.FullName }
        }

        # CERTIFICADO PUBLICO (.cer) - para que las PCs cliente lo instalen
        $cerPath = "$RepoRoot\cert\BarAvenidaCodeSigning.cer"
        if (Test-Path $cerPath) {
            $assets += $cerPath
        }

        if ($assets.Count -eq 0) {
            Log "[FAIL] No se encontraron .exe para subir" "Red"
            exit 1
        }

        Log "Assets a subir:" "Yellow"
        foreach ($a in $assets) { Log "  - $a" "Gray" }

        # Notas del release - construidas via array + join
        $fechaActual = Get-Date -Format "yyyy-MM-dd HH:mm"
        $lineasNotas = @()
        $lineasNotas += "# Bar Avenida v${Version}"
        $lineasNotas += ""
        $lineasNotas += "## Instaladores"
        $lineasNotas += "Descarga los .exe y sigue el orden de instalacion."
        $lineasNotas += ""
        $lineasNotas += "## Instalacion en PC nueva"
        $lineasNotas += "1. Instala SQL Server Express con instancia MSSQLSERVER01"
        $lineasNotas += "2. Corre Server Setup ${Version}"
        $lineasNotas += "3. Corre Admin Setup ${Version}"
        $lineasNotas += "4. Corre KDS Setup ${Version}"
        $lineasNotas += "5. Corre Tablet Setup ${Version} - opcional para PC"
        $lineasNotas += "6. Meseras abren http://IP-DEL-BAR:7000/tablet en su celular"
        $lineasNotas += ""
        $lineasNotas += "## Actualizar PC ya instalada"
        $lineasNotas += "Si tienes tarea BarAvenida_AutoUpdate registrada se actualiza sola."
        $lineasNotas += "Forzar manualmente: actualizar-bar.ps1 -Force"
        $lineasNotas += ""
        $lineasNotas += "Fecha: ${fechaActual}"
        $notes = $lineasNotas -join "`n"

        # Crear release
        $tag = "v$Version"
        Log "Creando release $tag..." "Yellow"

        $createArgs = @(
            "release", "create", $tag,
            "--title", "Bar Avenida v$Version",
            "--notes", $notes
        ) + $assets

        & gh @createArgs 2>&1 | ForEach-Object { Write-Host $_ }

        if ($LASTEXITCODE -eq 0) {
            Log "[OK] Release publicado" "Green"
            Log "URL: https://github.com/nauexpos11-alt/bar-avenida-pos/releases/tag/$tag" "Cyan"
        } else {
            Log "[FAIL] gh release create fallo. Si el tag ya existe, borralo:" "Red"
            Log "       gh release delete $tag --yes" "Yellow"
            Log "       git push --delete origin $tag" "Yellow"
        }
    } finally {
        Pop-Location
    }
}

# ──────────────────────────────────────────────────────────
# 9. Resumen final
# ──────────────────────────────────────────────────────────
LogStep "RELEASE TOTAL v$Version - COMPLETADO"

Log "Carpeta local con instaladores:  $ReleasesDir" "Cyan"
if ($ghOk) {
    Log "GitHub Release:                  https://github.com/nauexpos11-alt/bar-avenida-pos/releases/tag/v$Version" "Cyan"
}

Write-Host ""
Write-Host "PROXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "  - PC nueva del bar: descarga los 3 .exe del Release de GitHub" -ForegroundColor Gray
Write-Host "  - PC del bar ya instalada: corre actualizar-bar.ps1 para auto-actualizar" -ForegroundColor Gray
Write-Host ""
