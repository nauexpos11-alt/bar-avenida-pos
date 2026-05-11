# ============================================================================
# Bar Avenida - Wrapper visual del actualizar-bar.ps1
# ----------------------------------------------------------------------------
# Lanza actualizar-bar.ps1 -Force en background y muestra ventana WPF con:
#   - ProgressBar animada
#   - Mensaje de estado en vivo (lee actualizar-bar.log)
#   - Al terminar: "Actualizacion completada" + boton "Aceptar"
#
# Uso: lo invoca notificador-update.ps1 cuando el usuario pica "Instalar".
# Tambien se puede correr directo:
#   powershell -ExecutionPolicy Bypass -File instalar-con-ui.ps1
# ============================================================================

$ErrorActionPreference = "Continue"

$WorkDir          = "C:\BarAvenida"
$ScriptActualizar = "$WorkDir\actualizar-bar.ps1"
$LogFile          = "$WorkDir\actualizar-bar.log"

if (-not (Test-Path $ScriptActualizar)) {
    [System.Windows.Forms.MessageBox]::Show("No se encuentra $ScriptActualizar.", "Bar Avenida - Error")
    exit 1
}

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

# ──────────────────────────────────────────────────────────
# WPF window
# ──────────────────────────────────────────────────────────
[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Bar Avenida - Instalando actualizacion"
        Height="320" Width="540"
        WindowStartupLocation="CenterScreen"
        ResizeMode="NoResize"
        Background="#0a0a0a"
        Topmost="True"
        ShowInTaskbar="True">
    <Grid Margin="24">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <StackPanel Grid.Row="0" Orientation="Horizontal" Margin="0,0,0,4">
            <TextBlock Text="BAR AVENIDA" FontSize="22" FontWeight="Bold" Foreground="#f0c842"/>
            <TextBlock Text="  POS" FontSize="18" Foreground="#888888" VerticalAlignment="Center"/>
        </StackPanel>

        <TextBlock Grid.Row="1" x:Name="LblTitulo" Text="Instalando actualizacion..." FontSize="16" Foreground="#ffffff" Margin="0,8,0,16"/>

        <TextBlock Grid.Row="2" x:Name="LblPaso" Text="Iniciando..." FontSize="13" Foreground="#bbbbbb" Margin="0,0,0,8" TextWrapping="Wrap"/>

        <ProgressBar Grid.Row="3" x:Name="Barra" Height="24" Background="#1a1a1a" Foreground="#f0c842" BorderBrush="#444444" IsIndeterminate="True" Minimum="0" Maximum="100"/>

        <TextBlock Grid.Row="4" x:Name="LblNota" Text="No apagues ni cierres esta ventana. La actualizacion tarda 1-3 minutos." FontSize="12" Foreground="#888888" Margin="0,16,0,0" TextWrapping="Wrap"/>

        <Button Grid.Row="5" x:Name="BtnOk" Content="Aceptar" Width="140" Height="38"
                HorizontalAlignment="Right" Margin="0,16,0,0"
                Background="#f0c842" Foreground="#0a0a0a" FontWeight="Bold" FontSize="14"
                IsEnabled="False" Visibility="Hidden"/>
    </Grid>
</Window>
"@

$reader = New-Object System.Xml.XmlNodeReader $xaml
$window = [Windows.Markup.XamlReader]::Load($reader)

$lblTitulo = $window.FindName("LblTitulo")
$lblPaso   = $window.FindName("LblPaso")
$lblNota   = $window.FindName("LblNota")
$barra     = $window.FindName("Barra")
$btnOk     = $window.FindName("BtnOk")

$btnOk.Add_Click({ $window.Close() })

# ──────────────────────────────────────────────────────────
# Marcar inicio en el log
# ──────────────────────────────────────────────────────────
$marcaInicio = "=== UI WRAPPER inicio: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==="
Add-Content -Path $LogFile -Value $marcaInicio -Encoding UTF8 -ErrorAction SilentlyContinue

$tickInicio  = Get-Date
$ultimaLinea = ""

# ──────────────────────────────────────────────────────────
# Lanzar actualizar-bar.ps1 -Force en background
# ──────────────────────────────────────────────────────────
$proceso = Start-Process -FilePath "powershell.exe" `
    -ArgumentList @("-NoProfile","-ExecutionPolicy","Bypass","-WindowStyle","Hidden","-File",$ScriptActualizar,"-Force") `
    -PassThru -WindowStyle Hidden

# ──────────────────────────────────────────────────────────
# Timer: cada 2s lee el log y actualiza UI
# ──────────────────────────────────────────────────────────
$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromSeconds(2)

$timer.Add_Tick({
    # Leer ultimas lineas del log para detectar progreso
    if (Test-Path $LogFile) {
        try {
            $todas = Get-Content $LogFile -Tail 30 -ErrorAction SilentlyContinue
            # Tomar la ultima linea con [
            $candidatos = $todas | Where-Object { $_ -match '\[\d{4}-\d{2}-\d{2}|\[OK\]|\[INFO\]|\[FAIL\]|\[WARN\]|Descargando|Instalando|Reiniciando' }
            if ($candidatos.Count -gt 0) {
                $ultimo = $candidatos[-1]
                if ($ultimo -ne $ultimaLinea) {
                    $script:ultimaLinea = $ultimo
                    # Limpiar el timestamp
                    $msg = $ultimo -replace '^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]\s*', ''
                    $msg = $msg -replace '^\[\d{2}:\d{2}:\d{2}\]\s*', ''
                    if ($msg.Length -gt 90) { $msg = $msg.Substring(0, 90) + "..." }
                    $lblPaso.Text = $msg
                }
            }
        } catch {
            # Log podria estar bloqueado por el otro proceso, ignorar
        }
    }

    # Verificar si el proceso ya termino
    if ($proceso.HasExited) {
        $timer.Stop()
        $duracion = [int]((Get-Date) - $tickInicio).TotalSeconds

        if ($proceso.ExitCode -eq 0) {
            $lblTitulo.Text = "Actualizacion completada"
            $lblPaso.Text   = "Listo. Las apps se actualizaron en $duracion segundos."
            $lblNota.Text   = "Pico Aceptar para cerrar. Las apps Admin/KDS/Tablet se reinician solas."
            $barra.IsIndeterminate = $false
            $barra.Value           = 100
            $barra.Foreground      = [System.Windows.Media.Brushes]::LimeGreen
        } else {
            $lblTitulo.Text = "Hubo un problema"
            $lblPaso.Text   = "El instalador termino con error (codigo $($proceso.ExitCode))."
            $lblNota.Text   = "Revisa el log: C:\BarAvenida\actualizar-bar.log. Pide ayuda si necesitas."
            $barra.IsIndeterminate = $false
            $barra.Value           = 100
            $barra.Foreground      = [System.Windows.Media.Brushes]::OrangeRed
        }
        $btnOk.IsEnabled  = $true
        $btnOk.Visibility = "Visible"
    }
})

$timer.Start()

# Mostrar ventana modal hasta que el usuario pique Aceptar
[void]$window.ShowDialog()

Add-Content -Path $LogFile -Value "=== UI WRAPPER fin: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" -Encoding UTF8 -ErrorAction SilentlyContinue
