# ============================================================================
# Bar Avenida — Publicar el proyecto en GitHub privado
# ----------------------------------------------------------------------------
# 1. Instala GitHub CLI (gh) si no lo tienes
# 2. Te autentica abriendo el browser
# 3. Inicializa git, agrega todo, commit inicial
# 4. Crea el repo privado en tu cuenta
# 5. Sube el codigo
#
# USO (PowerShell normal, no admin):
#   F:\BarAvenida\Scripts\publicar-en-github.ps1
# ============================================================================

$ErrorActionPreference = "Stop"
$RepoDir = "F:\BarAvenida"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  PUBLICAR BAR AVENIDA EN GITHUB" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Verificar git ──────────────────────────────────────────────────────────
Write-Host "[1/6] Verificando git..." -ForegroundColor Yellow
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: 'git' no esta instalado." -ForegroundColor Red
    Write-Host "Instalar con: winget install --id Git.Git -e" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] git: $(git --version)" -ForegroundColor Green

# ── 2. Verificar / instalar gh ────────────────────────────────────────────────
Write-Host ""
Write-Host "[2/6] Verificando GitHub CLI (gh)..." -ForegroundColor Yellow
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "GitHub CLI no esta instalado. Instalando con winget..." -ForegroundColor Yellow
    winget install --id GitHub.cli --silent --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: No se pudo instalar gh." -ForegroundColor Red
        exit 1
    }
    # Recargar PATH para que gh este disponible en esta sesion
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
Write-Host "[OK] gh: $(gh --version | Select-Object -First 1)" -ForegroundColor Green

# ── 3. Autenticar con GitHub ──────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/6] Verificando autenticacion con GitHub..." -ForegroundColor Yellow
# Bajar Stop temporalmente porque gh escribe a stderr cuando NO hay sesion (y eso no es error)
$prevPref = $ErrorActionPreference
$ErrorActionPreference = "Continue"
gh auth status *> $null
$authedOk = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevPref

if (-not $authedOk) {
    Write-Host "No hay sesion. Voy a abrir tu browser para autenticarte..." -ForegroundColor Yellow
    Write-Host "  En el browser: dale 'Authorize GitHub CLI'." -ForegroundColor Cyan
    Write-Host "  En esta terminal: presiona ENTER cuando te lo pida y copia el codigo de un solo uso." -ForegroundColor Cyan
    gh auth login --hostname github.com --git-protocol https --web
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Auth fallo." -ForegroundColor Red
        exit 1
    }
}
$user = gh api user --jq .login
Write-Host "[OK] Autenticado como: $user" -ForegroundColor Green

# ── 4. Configurar git user.name y user.email si no estan ──────────────────────
Push-Location $RepoDir
$gitUserName  = git config user.name  2>$null
$gitUserEmail = git config user.email 2>$null
if (-not $gitUserName -or -not $gitUserEmail) {
    Write-Host "Configurando git user a partir de tu perfil de GitHub..." -ForegroundColor Yellow
    $ghEmail = gh api user --jq '.email' 2>$null
    if (-not $ghEmail) { $ghEmail = "$user@users.noreply.github.com" }
    git config user.name  "$user"
    git config user.email "$ghEmail"
}

# ── 5. git init / add / commit ────────────────────────────────────────────────
Write-Host ""
Write-Host "[4/6] Inicializando repo git..." -ForegroundColor Yellow
if (-not (Test-Path "$RepoDir\.git")) {
    git init -b main | Out-Null
    Write-Host "[OK] git init" -ForegroundColor Green
} else {
    Write-Host "[OK] El repo ya esta inicializado" -ForegroundColor Green
}

Write-Host ""
Write-Host "[5/6] Agregando archivos al primer commit (puede tardar 1-2 min)..." -ForegroundColor Yellow
git add -A
$staged = git diff --cached --stat | Measure-Object | Select-Object -ExpandProperty Count
if ($staged -eq 0) {
    Write-Host "[OK] Nada nuevo que commitear (ya estaba todo)" -ForegroundColor Green
} else {
    git commit -m "Initial commit - Bar Avenida POS completo" `
               -m "Backend .NET 8 + Tablet PWA + Admin Electron + KDS Electron." `
               -m "Features: cobro, cancelaciones, caja inteligente, dashboard vivo, reportes IA, KDS auto-pilot, anti-fuga." | Out-Null
    Write-Host "[OK] Commit inicial creado" -ForegroundColor Green
}

# ── 6. Crear el repo privado en GitHub y push ─────────────────────────────────
Write-Host ""
Write-Host "[6/6] Creando repo privado en GitHub y haciendo push..." -ForegroundColor Yellow

$repoName = "bar-avenida-pos"
$prevPref = $ErrorActionPreference
$ErrorActionPreference = "Continue"
gh repo view "$user/$repoName" *> $null
$repoExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = $prevPref
if ($repoExists) {
    Write-Host "El repo $user/$repoName ya existe. Solo agrego remote y hago push." -ForegroundColor Yellow
}

if (-not $repoExists) {
    gh repo create $repoName `
        --private `
        --description "Sistema POS multi-app para Bar Avenida (Saltillo, Coahuila). Backend .NET + Tablet PWA + Admin/KDS Electron." `
        --source=. `
        --push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: gh repo create fallo." -ForegroundColor Red
        Pop-Location
        exit 1
    }
} else {
    # El repo existe, agregar remote si no esta y hacer push
    $remoteExists = git remote get-url origin 2>$null
    if (-not $remoteExists) {
        git remote add origin "https://github.com/$user/$repoName.git"
    }
    git push -u origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: git push fallo." -ForegroundColor Red
        Pop-Location
        exit 1
    }
}

Pop-Location

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  REPO PUBLICADO" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  URL:  https://github.com/$user/$repoName" -ForegroundColor Cyan
Write-Host "  Privado: SI (solo tu lo ves)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para hacer commits futuros:" -ForegroundColor Yellow
Write-Host "  cd F:\BarAvenida" -ForegroundColor Gray
Write-Host "  git add -A" -ForegroundColor Gray
Write-Host "  git commit -m 'mensaje'" -ForegroundColor Gray
Write-Host "  git push" -ForegroundColor Gray
Write-Host ""
Write-Host "O abre GitHub Desktop -> File -> Add Local Repository -> F:\BarAvenida" -ForegroundColor Yellow
Write-Host "y maneja todo con clicks." -ForegroundColor Yellow
Write-Host ""
