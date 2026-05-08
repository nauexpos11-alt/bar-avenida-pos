# PROD-5 — Instalador todo-en-uno del Backend

## Objetivo

Generar un instalador `.exe` profesional para la PC central del bar que pone TODO lo necesario para correr el backend de Bar Avenida: binarios, archivos web (Admin/KDS), carpetas auxiliares, y registra el servicio Windows automáticamente. Incluye verificación de prerequisitos.

## Contexto

Hoy el backend solo arranca con `dotnet run` desde la PC de desarrollo. Si Coronado quiere mover el bar a otra PC (o reinstalar en la misma), tiene que:
1. Instalar SDK .NET 8.
2. Clonar/copiar el código.
3. Restaurar paquetes.
4. Compilar.
5. Configurar SQL Server.
6. Aplicar migraciones.
7. Levantar el backend.

Eso es para desarrolladores, no para uso real. Necesitamos un `.exe` que haga todo eso por él.

## Prerequisitos del usuario

- Windows 10 / 11 x64.
- **SQL Server (Express o superior)** ya instalado con instancia `MSSQLSERVER01` o configurable.
- Permisos de Administrador para registrar el servicio.

> Nota: El instalador NO instala SQL Server por sí mismo (es complejo y pesado). En su lugar, valida que esté presente y, si no lo está, abre la página de descarga oficial de Microsoft y aborta hasta que el usuario lo instale.

## Resultado esperado

1. Un solo archivo: `Bar Avenida Server Setup 1.0.0.exe` (~80-150 MB con .NET self-contained).
2. Al ejecutarlo:
   - Pantalla de bienvenida con logo del bar.
   - Verifica SQL Server.
   - Pide ruta de instalación (default: `C:\Program Files\Bar Avenida\Server`).
   - Pide datos de conexión a SQL: nombre de instancia (default `localhost\MSSQLSERVER01`).
   - Copia el binario .NET self-contained + wwwroot.
   - Crea carpetas: `F:\BarAvenida\TicketsImpresos`, `F:\BarAvenida\Backups`, `F:\BarAvenida\Logs`.
   - Aplica migraciones EF Core a la BD (crea la BD si no existe).
   - Registra el servicio Windows "Bar Avenida API" con inicio automático.
   - Pregunta si quiere arrancar el servicio ahora → arranca y verifica con `curl localhost:7000/swagger`.
   - Pregunta si quiere instalar también la tarea horaria de backup → si sí, registra `BarAvenida_BackupHorario`.
3. En "Programas instalados" aparece "Bar Avenida Server" con publisher "Bar Avenida".
4. El uninstaller detiene el servicio, lo desinstala, y opcionalmente conserva la BD y los Backups.

## Stack del instalador

**Inno Setup** (gratuito, simple, ampliamente usado para instaladores Windows). Alternativa: NSIS o WiX si se prefiere.

## Archivos a generar

### 1. Publicar el backend self-contained

Antes de armar el instalador, hay que publicar el backend con runtime incluido (no requiere .NET instalado en la PC destino):

```powershell
cd F:\BarAvenida\BarAvenida.API
dotnet publish -c Release -r win-x64 --self-contained true -o publish-installer
```

Esto genera ~150 MB en `F:\BarAvenida\BarAvenida.API\publish-installer\`.

### 2. Crear `F:\BarAvenida\Installer\BarAvenidaServer.iss`

Script de Inno Setup. Estructura básica:

```ini
; Bar Avenida — Server Installer (Inno Setup script)

[Setup]
AppId={{A1B2C3D4-BAR-AVENIDA-SERVER-INSTALL}}
AppName=Bar Avenida Server
AppVersion=1.0.0
AppPublisher=Bar Avenida
AppPublisherURL=https://baravenida.local
AppSupportURL=https://baravenida.local
DefaultDirName={autopf}\Bar Avenida\Server
DefaultGroupName=Bar Avenida
OutputDir=F:\BarAvenida\Installer\dist
OutputBaseFilename=Bar Avenida Server Setup 1.0.0
SetupIconFile=F:\BarAvenida\BarAvenida.Desktop\assets\icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin
WizardStyle=modern
LicenseFile=
DisableWelcomePage=no
DisableDirPage=no
UninstallDisplayName=Bar Avenida Server
UninstallDisplayIcon={app}\BarAvenida.API.exe

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "iniciarservicio";  Description: "Iniciar el servicio Bar Avenida API al terminar"; GroupDescription: "Servicio Windows:"; Flags: checkedonce
Name: "tareabackup";       Description: "Instalar tarea de backup automático cada hora";    GroupDescription: "Backups:";        Flags: checkedonce

[Files]
; Backend publicado self-contained
Source: "F:\BarAvenida\BarAvenida.API\publish-installer\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; Scripts auxiliares
Source: "F:\BarAvenida\Backups\backup-baravenida.ps1";       DestDir: "{commonappdata}\Bar Avenida\Backups"; Flags: ignoreversion
Source: "F:\BarAvenida\Backups\install-tarea-backup.ps1";    DestDir: "{commonappdata}\Bar Avenida\Backups"; Flags: ignoreversion
Source: "F:\BarAvenida\Backups\restore-baravenida.ps1";      DestDir: "{commonappdata}\Bar Avenida\Backups"; Flags: ignoreversion
Source: "F:\BarAvenida\Backups\limpieza-pre-produccion.sql"; DestDir: "{commonappdata}\Bar Avenida\Backups"; Flags: ignoreversion

[Dirs]
; Carpetas de runtime con permisos de escritura
Name: "F:\BarAvenida\TicketsImpresos"; Permissions: users-modify
Name: "F:\BarAvenida\Backups";          Permissions: users-modify
Name: "F:\BarAvenida\Logs";             Permissions: users-modify

[Icons]
Name: "{group}\Bar Avenida Server (panel)"; Filename: "{cmd}"; Parameters: "/k sc query BarAvenidaAPI"
Name: "{group}\Carpeta de tickets";          Filename: "F:\BarAvenida\TicketsImpresos"
Name: "{group}\Carpeta de backups";          Filename: "F:\BarAvenida\Backups"
Name: "{group}\Logs del backend";            Filename: "F:\BarAvenida\Logs"
Name: "{group}\Desinstalar Bar Avenida Server"; Filename: "{uninstallexe}"

[Run]
; Registrar servicio
Filename: "{cmd}"; Parameters: "/c sc create BarAvenidaAPI binPath= ""\""{app}\BarAvenida.API.exe\"""" start= auto DisplayName= ""Bar Avenida API"""; StatusMsg: "Registrando servicio..."; Flags: runhidden
Filename: "{cmd}"; Parameters: "/c sc description BarAvenidaAPI ""Backend del POS de Bar Avenida"""; Flags: runhidden
Filename: "{cmd}"; Parameters: "/c sc failure BarAvenidaAPI reset= 86400 actions= restart/60000/restart/60000/restart/60000"; Flags: runhidden

; Aplicar migraciones EF (el backend lo hace solo al arrancar la primera vez gracias a context.Database.Migrate())

; Arrancar servicio si la tarea está marcada
Filename: "{cmd}"; Parameters: "/c sc start BarAvenidaAPI"; Tasks: iniciarservicio; StatusMsg: "Iniciando servicio..."; Flags: runhidden

; Registrar tarea de backup si está marcada
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{commonappdata}\Bar Avenida\Backups\install-tarea-backup.ps1"""; Tasks: tareabackup; StatusMsg: "Registrando tarea de backup..."; Flags: runhidden

[UninstallRun]
Filename: "{cmd}"; Parameters: "/c sc stop BarAvenidaAPI"; Flags: runhidden
Filename: "{cmd}"; Parameters: "/c sc delete BarAvenidaAPI"; Flags: runhidden
Filename: "{cmd}"; Parameters: "/c schtasks /delete /tn BarAvenida_BackupHorario /f"; Flags: runhidden

[Code]
function VerificarSqlServer(): Boolean;
var
  ResultCode: Integer;
begin
  // Probar la instancia con sqlcmd
  Result := Exec('sqlcmd', '-S "localhost\MSSQLSERVER01" -E -Q "SELECT 1"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function InitializeSetup(): Boolean;
begin
  if not VerificarSqlServer() then
  begin
    if MsgBox(
      'No se detectó SQL Server en localhost\MSSQLSERVER01.' #13#10 #13#10
      'Bar Avenida necesita SQL Server (Express o superior) instalado antes de continuar.' #13#10 #13#10
      '¿Quieres abrir la página de descarga ahora?',
      mbConfirmation, MB_YESNO) = IDYES then
    begin
      ShellExec('open', 'https://www.microsoft.com/es-mx/sql-server/sql-server-downloads', '', '', SW_SHOW, ewNoWait, ResultCode);
    end;
    Result := False;
    exit;
  end;
  Result := True;
end;
```

### 3. Compilar el instalador

Coronado instala Inno Setup desde https://jrsoftware.org/isinfo.php (uno solo, ~10MB). Después:

```powershell
cd F:\BarAvenida\Installer
iscc BarAvenidaServer.iss
```

Esto genera `dist\Bar Avenida Server Setup 1.0.0.exe`.

### 4. Probar en PC limpia

Idealmente en una VM o segunda PC:
1. Asegurar que tiene SQL Server.
2. Doble click en el .exe.
3. Seguir el wizard.
4. Verificar que el servicio "Bar Avenida API" quedó Running.
5. Abrir `http://localhost:7000/swagger` en browser → debe responder.
6. Instalar también el Admin (PROD-3) → debe conectar y mostrar todo.

## Reglas duras

- 0 errors, 0 warnings al compilar el backend.
- El instalador debe correr en español (incluido como `compiler:Languages\Spanish.isl`).
- Privilegios de Administrador requeridos.
- Si SQL Server no está, abortar con mensaje claro.
- Las migraciones EF las aplica el propio backend al arrancar (`context.Database.Migrate()` ya está en `Program.cs`).
- Mantener compatibilidad con el modo desarrollo (`dotnet run`).

## Aceptación

- ✅ El `.exe` instala todo en una PC limpia con SQL Server preinstalado.
- ✅ El servicio "Bar Avenida API" queda registrado, automático, y arranca.
- ✅ La BD `BarAvenida` se crea con todas las migraciones aplicadas.
- ✅ Las carpetas `TicketsImpresos`, `Backups`, `Logs` quedan creadas con permisos de escritura.
- ✅ Si se marcó "tarea de backup", la tarea horaria queda registrada.
- ✅ El uninstaller deja de servicio y borra todo limpio (BD opcional).
- ✅ Aparece en "Agregar/quitar programas" como "Bar Avenida Server".

## Archivos esperados al cierre

- Nuevos:
  - `F:\BarAvenida\Installer\BarAvenidaServer.iss`
  - `F:\BarAvenida\BarAvenida.API\publish-installer\` (generado por `dotnet publish`)
- Build: `F:\BarAvenida\Installer\dist\Bar Avenida Server Setup 1.0.0.exe`

## Notas para el futuro

- Para auto-update entre versiones se puede agregar luego `electron-updater` para Admin/KDS y un mecanismo similar para el server (descargar nuevo .exe, parar servicio, reemplazar binario, reiniciar).
- Si en algún momento Coronado quiere correr el backend en la nube, este instalador deja de aplicar — pero por ahora el modelo es local.
