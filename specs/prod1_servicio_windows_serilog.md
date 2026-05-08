# PROD-1 — Backend como Servicio Windows + Serilog persistente

## Objetivo

Convertir `BarAvenida.API` en un **Servicio de Windows** que arranque automáticamente al boot de la PC central del bar, sin necesidad de abrir terminal. Y agregar **logs persistentes a archivo** con Serilog para tener forensics si algo truena en producción.

## Contexto

Hoy el backend corre con `dotnet run` desde terminal. Si Coronado reinicia la PC del bar, nadie levanta el backend y las meseras se quedan sin sistema. Además, si algo truena, los logs solo van a la consola y se pierden cuando se cierra la ventana.

## Resultado esperado

1. Backend corre como `BarAvenida API` en Servicios de Windows.
2. Inicia automáticamente al arrancar la PC.
3. Logs en `F:\BarAvenida\Logs\baravenida-YYYY-MM-DD.log` con rotación diaria, retención 30 días.
4. Console logging sigue activo cuando se ejecuta en modo desarrollo (`dotnet run`).
5. Scripts PowerShell para instalar/desinstalar/iniciar/detener el servicio.
6. Build 0 errors, 0 warnings.

## Cambios a hacer

### 1. NuGet — agregar paquetes en `BarAvenida.API.csproj`

```xml
<PackageReference Include="Microsoft.Extensions.Hosting.WindowsServices" Version="8.0.1" />
<PackageReference Include="Serilog.AspNetCore" Version="8.0.3" />
<PackageReference Include="Serilog.Sinks.File" Version="6.0.0" />
<PackageReference Include="Serilog.Sinks.Console" Version="6.0.0" />
```

### 2. Modificar `Program.cs`

Al inicio del archivo, ANTES de `var builder = WebApplication.CreateBuilder(args);`:

```csharp
using Serilog;
using Serilog.Events;
```

Y agregar al inicio del método (después del `QuestPDF.Settings.License`):

```csharp
// ============================================================================
// SERILOG — Logs persistentes a archivo + consola
// ============================================================================
var logsPath = @"F:\BarAvenida\Logs";
Directory.CreateDirectory(logsPath);

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Database.Command", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console(
        outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.File(
        path: Path.Combine(logsPath, "baravenida-.log"),
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30,
        fileSizeLimitBytes: 50_000_000,
        rollOnFileSizeLimit: true,
        outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();
```

Después de `var builder = WebApplication.CreateBuilder(args);`:

```csharp
// Sustituir el logger default por Serilog
builder.Host.UseSerilog();

// Habilitar Servicio de Windows (no afecta cuando corre con dotnet run)
builder.Host.UseWindowsService(opts =>
{
    opts.ServiceName = "Bar Avenida API";
});

// Configurar ContentRoot para que funcione cuando corre como servicio
// (los servicios arrancan con working directory = C:\Windows\System32)
builder.Environment.ContentRootPath = AppContext.BaseDirectory;
```

Al final, envolver el `app.Run();` en try/catch:

```csharp
try
{
    Log.Information("================================================================");
    Log.Information("Bar Avenida API arrancando — modo: {Modo}",
        WindowsServiceHelpers.IsWindowsService() ? "Windows Service" : "Console");
    Log.Information("================================================================");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "El backend se cayó por una excepción no manejada");
    throw;
}
finally
{
    Log.CloseAndFlush();
}
```

Importar al inicio:
```csharp
using Microsoft.Extensions.Hosting.WindowsServices;
```

### 3. Cambiar `Console.WriteLine` que ya hay en `Program.cs` por `Log.Information`

Hay 4 lugares (BD lista, banner, swagger, KDS, signalr). Mantenerlos pero pasarlos por `Log.Information` para que también queden en archivo.

### 4. Crear scripts en `F:\BarAvenida\Scripts\`

**`install-service.ps1`** — registra el servicio:

```powershell
$ErrorActionPreference = "Stop"

$esAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) {
    Write-Host "Hay que correr esto como Administrador." -ForegroundColor Red
    exit 1
}

$NombreServicio = "BarAvenidaAPI"
$DisplayName    = "Bar Avenida API"
$Descripcion    = "Backend del POS de Bar Avenida (.NET 8 + EF Core + SignalR)."
$Ejecutable     = "F:\BarAvenida\BarAvenida.API\bin\Release\net8.0\publish\BarAvenida.API.exe"

if (-not (Test-Path $Ejecutable)) {
    Write-Host "ERROR: No existe $Ejecutable" -ForegroundColor Red
    Write-Host "Primero hay que publicar:" -ForegroundColor Yellow
    Write-Host "  cd F:\BarAvenida\BarAvenida.API" -ForegroundColor Cyan
    Write-Host "  dotnet publish -c Release -o bin\Release\net8.0\publish" -ForegroundColor Cyan
    exit 1
}

# Si existe, parar y borrar primero
if (Get-Service -Name $NombreServicio -ErrorAction SilentlyContinue) {
    Write-Host "Eliminando servicio anterior..." -ForegroundColor Yellow
    Stop-Service -Name $NombreServicio -Force -ErrorAction SilentlyContinue
    sc.exe delete $NombreServicio | Out-Null
    Start-Sleep -Seconds 2
}

# Registrar
sc.exe create $NombreServicio binPath= "`"$Ejecutable`"" start= auto DisplayName= "`"$DisplayName`"" | Out-Null
sc.exe description $NombreServicio "$Descripcion" | Out-Null
sc.exe failure $NombreServicio reset= 86400 actions= restart/60000/restart/60000/restart/60000 | Out-Null

Write-Host "Servicio '$DisplayName' instalado." -ForegroundColor Green
Write-Host ""
Write-Host "Para arrancarlo ahora:" -ForegroundColor Yellow
Write-Host "  Start-Service -Name '$NombreServicio'" -ForegroundColor Cyan
```

**`uninstall-service.ps1`**:

```powershell
$NombreServicio = "BarAvenidaAPI"
Stop-Service -Name $NombreServicio -Force -ErrorAction SilentlyContinue
sc.exe delete $NombreServicio
Write-Host "Servicio eliminado." -ForegroundColor Green
```

**`publish-y-reinstalar.ps1`** — flujo completo:

```powershell
# Detener servicio
Stop-Service -Name "BarAvenidaAPI" -Force -ErrorAction SilentlyContinue

# Limpiar build
Push-Location F:\BarAvenida\BarAvenida.API
Remove-Item -Recurse -Force bin, obj -ErrorAction SilentlyContinue

# Publicar Release
dotnet publish -c Release -o bin\Release\net8.0\publish
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build fallo." -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

# Reinstalar y arrancar
& F:\BarAvenida\Scripts\install-service.ps1
Start-Service -Name "BarAvenidaAPI"
Start-Sleep -Seconds 3
Get-Service -Name "BarAvenidaAPI"
```

### 5. Probar

```powershell
# 1. Compilar y publicar
cd F:\BarAvenida\BarAvenida.API
dotnet publish -c Release -o bin\Release\net8.0\publish

# 2. Instalar como servicio (admin)
F:\BarAvenida\Scripts\install-service.ps1

# 3. Arrancar
Start-Service -Name "BarAvenidaAPI"

# 4. Verificar
Get-Service -Name "BarAvenidaAPI"          # Debe estar Running
curl http://localhost:7000/swagger/v1/swagger.json   # Debe responder

# 5. Ver logs
Get-Content F:\BarAvenida\Logs\baravenida-*.log -Tail 30

# 6. Reiniciar la PC y verificar que arranca solo
Restart-Computer
# (después del reboot)
Get-Service -Name "BarAvenidaAPI"          # Debe seguir Running
```

## Reglas duras

- 0 errors, 0 warnings al compilar.
- NO modificar lógica de negocio existente.
- NO cambiar el puerto 7000.
- NO romper el comportamiento actual cuando se ejecuta con `dotnet run` desde terminal.
- Logs en archivo deben rotar diario y mantener 30 días máximo.
- El servicio debe sobrevivir reinicios de la PC.

## Aceptación

- ✅ Servicio "Bar Avenida API" aparece en `services.msc` con Estado=Running, Tipo=Automático.
- ✅ `Get-Service BarAvenidaAPI` responde Running después de un reboot.
- ✅ `F:\BarAvenida\Logs\baravenida-YYYY-MM-DD.log` se crea y se llena.
- ✅ Tablet y Admin siguen conectándose al backend en `192.168.100.10:7000` igual que antes.
- ✅ El swagger sigue accesible en `http://localhost:7000/swagger`.

## Archivos esperados al cierre

- Modificados: `BarAvenida.API.csproj`, `Program.cs`
- Nuevos: `F:\BarAvenida\Scripts\install-service.ps1`, `uninstall-service.ps1`, `publish-y-reinstalar.ps1`
- Generados al ejecutar: `F:\BarAvenida\Logs\baravenida-*.log`
