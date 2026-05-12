# ============================================================================
# Bar Avenida - Wrapper visual del actualizar-bar.ps1
# ----------------------------------------------------------------------------
# Lanza actualizar-bar.ps1 -Force en background y muestra ventana WPF con:
#   - ProgressBar animada
#   - Mensaje de estado en vivo (lee actualizar-bar.log)
#   - Al terminar: "Actualizacion completada" + boton "Aceptar"
#   - Si hay error: muestra ultimas 20 lineas del log + boton "Copiar log"
#
# Uso: lo invoca notificador-update.ps1 cuando el usuario pica "Instalar".
# ============================================================================

$ErrorActionPreference = "Continue"

$WorkDir          = "C:\BarAvenida"
$ScriptActualizar = "$WorkDir\actualizar-bar.ps1"
$LogFile          = "$WorkDir\actualizar-bar.log"

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName System.Windows.Forms

if (-not (Test-Path $ScriptActualizar)) {
    [System.Windows.MessageBox]::Show("No se encuentra $ScriptActualizar.", "Bar Avenida - Error", "OK", "Error")
    exit 1
}

# ──────────────────────────────────────────────────────────
# WPF window
# ──────────────────────────────────────────────────────────
[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Bar Avenida - Instalando actualizacion"
        Height="540" Width="640"
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

        <Border Grid.Row="5" x:Name="LogPanel" Background="#1a1a1a" BorderBrush="#444444" BorderThickness="1" CornerRadius="4" Margin="0,16,0,0" Visibility="Collapsed">
            <ScrollViewer VerticalScrollBarVisibility="Auto" HorizontalScrollBarVisibility="Auto" Padding="10">
                <TextBox x:Name="TxtLog" Text="" Background="#1a1a1a" Foreground="#cccccc" FontFamily="Consolas" FontSize="11" BorderThickness="0" IsReadOnly="True" TextWrapping="NoWrap" />
            </ScrollViewer>
        </Border>

        <StackPanel Grid.Row="6" Orientation="Horizontal" HorizontalAlignment="Right" Margin="0,16,0,0">
            <Button x:Name="BtnCopiarLog" Content="Copiar log" Width="120" Height="38" Margin="0,0,8,0"
                    Background="#444444" Foreground="#ffffff" FontSize="13" Visibility="Collapsed"/>
            <Button x:Name="BtnReintentar" Content="Reintentar" Width="120" Height="38" Margin="0,0,8,0"
                    Background="#666666" Foreground="#ffffff" FontSize="13" Visibility="Collapsed"/>
            <Button x:Name="BtnOk" Content="Aceptar" Width="140" Height="38"
                    Background="#f0c842" Foreground="#0a0a0a" FontWeight="Bold" FontSize="14"
                    IsEnabled="False" Visibility="Hidden"/>
        </StackPanel>
    </Grid>
</Window>
"@

$reader = New-Object System.Xml.XmlNodeReader $xaml
$window = [Windows.Markup.XamlReader]::Load($reader)

$lblTitulo    = $window.FindName("LblTitulo")
$lblPaso      = $window.FindName("LblPaso")
$lblNota      = $window.FindName("LblNota")
$barra        = $window.FindName("Barra")
$btnOk        = $window.FindName("BtnOk")
$btnCopiarLog = $window.FindName("BtnCopiarLog")
$btnReintentar = $window.FindName("BtnReintentar")
$logPanel     = $window.FindName("LogPanel")
$txtLog       = $window.FindName("TxtLog")

$btnOk.Add_Click({ $window.Close() })

$btnCopiarLog.Add_Click({
    try {
        $contenido = if (Test-Path $LogFile) { (Get-Content $LogFile -Tail 80 -Raw) } else { "Log no encontrado" }
        [System.Windows.Forms.Clipboard]::SetText($contenido)
        $btnCopiarLog.Content = "Copiado!"
    } catch {
        $btnCopiarLog.Content = "Error al copiar"
    }
})

# Variables para reintento
$script:procesoActual = $null
$script:tickInicio    = $null
$script:ultimaLinea   = ""

function LanzarInstalacion {
    $script:tickInicio  = Get-Date
    $script:ultimaLinea = ""

    # Marcar inicio en el log
    $marcaInicio = "=== UI WRAPPER inicio: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==="
    Add-Content -Path $LogFile -Value $marcaInicio -Encoding UTF8 -ErrorAction SilentlyContinue

    # UI: reset a estado "instalando"
    $lblTitulo.Text = "Instalando actualizacion..."
    $lblPaso.Text   = "Iniciando..."
    $lblNota.Text   = "No apagues ni cierres esta ventana. La actualizacion tarda 1-3 minutos."
    $barra.IsIndeterminate = $true
    $barra.Value           = 0
    $barra.Foreground      = [System.Windows.Media.Brushes]::Goldenrod
    $btnOk.Visibility       = "Hidden"
    $btnCopiarLog.Visibility = "Collapsed"
    $btnReintentar.Visibility = "Collapsed"
    $logPanel.Visibility    = "Collapsed"
    $txtLog.Text            = ""

    # Lanzar actualizar-bar.ps1 -Force en background
    $script:procesoActual = Start-Process -FilePath "powershell.exe" `
        -ArgumentList @("-NoProfile","-ExecutionPolicy","Bypass","-WindowStyle","Hidden","-File",$ScriptActualizar,"-Force") `
        -PassThru -WindowStyle Hidden

    $timer.Start()
}

$btnReintentar.Add_Click({
    LanzarInstalacion
})

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
            $candidatos = $todas | Where-Object { $_ -match '\[\d{4}-\d{2}-\d{2}|\[OK\]|\[INFO\]|\[FAIL\]|\[WARN\]|Descargando|Instalando|Reiniciando' }
            if ($candidatos.Count -gt 0) {
                $ultimo = $candidatos[-1]
                if ($ultimo -ne $script:ultimaLinea) {
                    $script:ultimaLinea = $ultimo
                    $msg = $ultimo -replace '^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]\s*', ''
                    $msg = $msg -replace '^\[\d{2}:\d{2}:\d{2}\]\s*', ''
                    if ($msg.Length -gt 110) { $msg = $msg.Substring(0, 110) + "..." }
                    $lblPaso.Text = $msg
                }
            }
        } catch {}
    }

    # Verificar si el proceso ya termino
    if ($script:procesoActual.HasExited) {
        $timer.Stop()
        $duracion = [int]((Get-Date) - $script:tickInicio).TotalSeconds

        if ($script:procesoActual.ExitCode -eq 0) {
            $lblTitulo.Text = "Actualizacion completada"
            $lblPaso.Text   = "Listo. Las apps se actualizaron en $duracion segundos."
            $lblNota.Text   = "Pico Aceptar para cerrar. Las apps Admin/KDS/Tablet se reinician solas."
            $barra.IsIndeterminate = $false
            $barra.Value           = 100
            $barra.Foreground      = [System.Windows.Media.Brushes]::LimeGreen
        } else {
            $lblTitulo.Text = "Hubo un problema (codigo $($script:procesoActual.ExitCode))"
            $lblPaso.Text   = "La instalacion fallo. Abajo estan las ultimas lineas del log:"
            $lblNota.Text   = "Pico 'Copiar log' y mandalo a soporte. O 'Reintentar' para intentar otra vez."
            $barra.IsIndeterminate = $false
            $barra.Value           = 100
            $barra.Foreground      = [System.Windows.Media.Brushes]::OrangeRed

            # MOSTRAR LAS ULTIMAS 20 LINEAS DEL LOG en el text box
            try {
                $logContent = Get-Content $LogFile -Tail 20 -ErrorAction SilentlyContinue
                if ($logContent) {
                    $txtLog.Text = ($logContent -join "`r`n")
                } else {
                    $txtLog.Text = "(Log vacio o no se pudo leer)"
                }
            } catch {
                $txtLog.Text = "Error leyendo log: $($_.Exception.Message)"
            }
            $logPanel.Visibility    = "Visible"
            $btnCopiarLog.Visibility = "Visible"
            $btnReintentar.Visibility = "Visible"
        }
        $btnOk.IsEnabled  = $true
        $btnOk.Visibility = "Visible"
    }
})

# Lanzar primera instalacion
LanzarInstalacion

# Mostrar ventana modal hasta que el usuario pique Aceptar
[void]$window.ShowDialog()

Add-Content -Path $LogFile -Value "=== UI WRAPPER fin: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" -Encoding UTF8 -ErrorAction SilentlyContinue
