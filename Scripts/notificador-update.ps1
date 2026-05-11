# ============================================================================
# Bar Avenida - Notificador de actualización (al iniciar sesión)
# ----------------------------------------------------------------------------
# Se ejecuta cuando un usuario inicia sesión en Windows.
# Chequea GitHub Releases. Si hay versión nueva, muestra ventana nativa con
# 3 opciones: Instalar ahora / Más tarde / Saltar esta versión.
#
# Uso: corre automático al login. Para testear manual:
#   powershell -ExecutionPolicy Bypass -File notificador-update.ps1
# ============================================================================

param(
    [string]$Repo = "nauexpos11-alt/bar-avenida-pos"
)

$ErrorActionPreference = "Continue"

# ──────────────────────────────────────────────────────────
# Paths y archivos de estado
# ──────────────────────────────────────────────────────────
$WorkDir       = "C:\BarAvenida"
$LogFile       = "$WorkDir\notificador-update.log"
$VersionFile   = "$WorkDir\version-instalada.txt"
$SkippedFile   = "$WorkDir\version-saltada.txt"

New-Item -ItemType Directory -Path $WorkDir -Force | Out-Null

function Log([string]$msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

function Get-VersionInstalada {
    if (Test-Path $VersionFile) {
        return (Get-Content $VersionFile -Raw).Trim()
    }
    return "0.0.0"
}

function Get-VersionSaltada {
    if (Test-Path $SkippedFile) {
        return (Get-Content $SkippedFile -Raw).Trim()
    }
    return ""
}

function Set-VersionSaltada([string]$v) {
    Set-Content -Path $SkippedFile -Value $v -Encoding UTF8
}

function Es-VersionMayor([string]$nueva, [string]$actual) {
    try {
        return ([version]$nueva -gt [version]$actual)
    } catch { return $false }
}

# ──────────────────────────────────────────────────────────
# Esperar un poco después del login para no abrumar
# ──────────────────────────────────────────────────────────
Start-Sleep -Seconds 20

Log "=== NOTIFICADOR - check al login ==="

# ──────────────────────────────────────────────────────────
# 1. Consultar GitHub
# ──────────────────────────────────────────────────────────
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $headers = @{ "User-Agent" = "BarAvenida-Notificador" }
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest" -Headers $headers -TimeoutSec 15
} catch {
    Log "No se pudo consultar GitHub: $($_.Exception.Message). Posiblemente sin internet."
    exit 0
}

if (-not $release.tag_name) {
    Log "Release sin tag_name. Salida."
    exit 0
}

$versionNueva  = $release.tag_name -replace '^v', ''
$versionActual = Get-VersionInstalada
$versionSaltada = Get-VersionSaltada

Log "Version actual: $versionActual | Disponible: $versionNueva | Saltada: $versionSaltada"

# ──────────────────────────────────────────────────────────
# 2. Decidir si preguntar
# ──────────────────────────────────────────────────────────
if (-not (Es-VersionMayor $versionNueva $versionActual)) {
    Log "Ya estamos al dia. Salida silenciosa."
    exit 0
}

if ($versionNueva -eq $versionSaltada) {
    Log "Esta version ($versionNueva) ya fue saltada por el usuario. No preguntar otra vez."
    exit 0
}

# Calcular tamano total aproximado
$tamMB = 0
foreach ($a in $release.assets) {
    if ($a.name -like "Bar Avenida*.exe") { $tamMB += [math]::Round($a.size / 1MB, 0) }
}

$notas = $release.body
if (-not $notas) { $notas = "Sin notas para esta version." }
# Truncar notas si son largas
if ($notas.Length -gt 300) { $notas = $notas.Substring(0, 300) + "..." }

Log "Hay update real. Mostrando dialogo al usuario."

# ──────────────────────────────────────────────────────────
# 3. Mostrar ventana nativa WPF
# ──────────────────────────────────────────────────────────
Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore

[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Bar Avenida - Actualizacion disponible"
        Height="430" Width="520"
        WindowStartupLocation="CenterScreen"
        ResizeMode="NoResize"
        Background="#0a0a0a"
        ShowInTaskbar="True"
        Topmost="True">
    <Grid Margin="20">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <!-- Header -->
        <StackPanel Grid.Row="0" Orientation="Horizontal" Margin="0,0,0,12">
            <TextBlock Text="BAR AVENIDA" FontSize="24" FontWeight="Bold" Foreground="#f0c842"/>
            <TextBlock Text="  POS" FontSize="20" Foreground="#888888" VerticalAlignment="Center"/>
        </StackPanel>

        <!-- Subtitulo -->
        <TextBlock Grid.Row="1" Text="Hay una actualizacion disponible" FontSize="16" Foreground="#ffffff" Margin="0,0,0,16"/>

        <!-- Info y notas -->
        <Border Grid.Row="2" Background="#1a1a1a" BorderBrush="#f0c842" BorderThickness="1" CornerRadius="6" Padding="16">
            <StackPanel>
                <Grid Margin="0,0,0,12">
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="160"/>
                        <ColumnDefinition Width="*"/>
                    </Grid.ColumnDefinitions>
                    <Grid.RowDefinitions>
                        <RowDefinition Height="Auto"/>
                        <RowDefinition Height="Auto"/>
                        <RowDefinition Height="Auto"/>
                    </Grid.RowDefinitions>
                    <TextBlock Grid.Row="0" Grid.Column="0" Text="Version actual:" Foreground="#888888" FontSize="14"/>
                    <TextBlock Grid.Row="0" Grid.Column="1" x:Name="LblActual" Text="0.0.0" Foreground="#cccccc" FontSize="14" FontWeight="SemiBold"/>
                    <TextBlock Grid.Row="1" Grid.Column="0" Text="Version nueva:" Foreground="#888888" FontSize="14"/>
                    <TextBlock Grid.Row="1" Grid.Column="1" x:Name="LblNueva" Text="0.0.0" Foreground="#f0c842" FontSize="14" FontWeight="Bold"/>
                    <TextBlock Grid.Row="2" Grid.Column="0" Text="Tamano descarga:" Foreground="#888888" FontSize="14"/>
                    <TextBlock Grid.Row="2" Grid.Column="1" x:Name="LblTamano" Text="0 MB" Foreground="#cccccc" FontSize="14"/>
                </Grid>

                <TextBlock Text="Notas:" Foreground="#888888" FontSize="13" Margin="0,4,0,4"/>
                <TextBlock x:Name="LblNotas" Text="" Foreground="#bbbbbb" FontSize="12" TextWrapping="Wrap"/>
            </StackPanel>
        </Border>

        <!-- Botones -->
        <StackPanel Grid.Row="3" Orientation="Horizontal" HorizontalAlignment="Right" Margin="0,16,0,0">
            <Button x:Name="BtnSaltar" Content="Saltar esta version" Width="140" Height="36" Margin="0,0,8,0" Background="#333333" Foreground="#cccccc" BorderBrush="#555555" FontSize="13"/>
            <Button x:Name="BtnMasTarde" Content="Mas tarde" Width="100" Height="36" Margin="0,0,8,0" Background="#444444" Foreground="#ffffff" BorderBrush="#666666" FontSize="13"/>
            <Button x:Name="BtnInstalar" Content="Instalar ahora" Width="140" Height="36" Background="#f0c842" Foreground="#0a0a0a" FontWeight="Bold" FontSize="13"/>
        </StackPanel>
    </Grid>
</Window>
"@

$reader  = New-Object System.Xml.XmlNodeReader $xaml
$window  = [Windows.Markup.XamlReader]::Load($reader)

$window.FindName("LblActual").Text  = $versionActual
$window.FindName("LblNueva").Text   = $versionNueva
$window.FindName("LblTamano").Text  = "$tamMB MB"
$window.FindName("LblNotas").Text   = $notas

$decision = "MasTarde"  # default

$window.FindName("BtnInstalar").Add_Click({
    $script:decision = "Instalar"
    $window.Close()
})

$window.FindName("BtnMasTarde").Add_Click({
    $script:decision = "MasTarde"
    $window.Close()
})

$window.FindName("BtnSaltar").Add_Click({
    $script:decision = "Saltar"
    $window.Close()
})

# Mostrar
[void]$window.ShowDialog()

Log "Usuario eligio: $decision"

# ──────────────────────────────────────────────────────────
# 4. Actuar segun decision
# ──────────────────────────────────────────────────────────
switch ($decision) {
    "Instalar" {
        Log "Lanzando instalar-con-ui.ps1 (wrapper con UI de progreso)"
        $wrapperUI         = "$WorkDir\instalar-con-ui.ps1"
        $actualizarScript  = "$WorkDir\actualizar-bar.ps1"

        if (Test-Path $wrapperUI) {
            # Wrapper visual con barra de progreso + mensaje "Completado"
            Start-Process -FilePath "powershell.exe" `
                -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-File",$wrapperUI `
                -Verb RunAs
        } elseif (Test-Path $actualizarScript) {
            # Fallback: wrapper no existe (version vieja), lanzar el script crudo
            Log "[WARN] instalar-con-ui.ps1 no existe, usando actualizar-bar.ps1 directo"
            Start-Process -FilePath "powershell.exe" `
                -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-File",$actualizarScript,"-Force" `
                -Verb RunAs
        } else {
            Log "[ERROR] Ningun script de update en C:\BarAvenida\. Reinstala Bar Avenida desde el USB."
            [System.Windows.MessageBox]::Show(
                "No se pudo encontrar el script de actualizacion en C:\BarAvenida\.`n`nReinstala Bar Avenida desde el USB con la version v1.4.0 o superior.",
                "Bar Avenida - Error",
                "OK", "Error")
        }
    }
    "MasTarde" {
        Log "Usuario eligio 'mas tarde'. Volvera a aparecer en el proximo login."
    }
    "Saltar" {
        Set-VersionSaltada $versionNueva
        Log "Usuario salto v$versionNueva. No volvera a preguntar de esta version."
    }
}

Log "=== FIN ==="
