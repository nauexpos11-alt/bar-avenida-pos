; Bar Avenida — Server Installer (Inno Setup script)
; Para compilar: iscc BarAvenidaServer.iss  (desde la carpeta Installer/)
; Prerequisito: Inno Setup 6+ instalado desde https://jrsoftware.org/isinfo.php
;
; Los paths SOURCE son RELATIVOS al .iss (asi funciona en NAU y en F:\BarAvenida).
; Los paths DESTINATION quedan F:\BarAvenida porque eso es lo que asume el bar.
; Si en el futuro hay PCs sin F:\, hay que migrar a {commonappdata}\Bar Avenida.

#define SOURCE_ROOT "..\"

[Setup]
AppId={{A1B2C3D4-BAR-AVENIDA-SERVER-INSTALL}}
AppName=Bar Avenida Server
AppVersion=1.0.0
AppPublisher=Bar Avenida
AppPublisherURL=https://baravenida.local
AppSupportURL=https://baravenida.local
DefaultDirName={autopf}\Bar Avenida\Server
DefaultGroupName=Bar Avenida
OutputDir=dist
OutputBaseFilename=Bar Avenida Server Setup 1.0.0
; SetupIconFile: descomentar cuando exista
; SetupIconFile={#SOURCE_ROOT}BarAvenida.Desktop\assets\icon.ico
Compression=zip/9
SolidCompression=no
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin
WizardStyle=modern
DisableWelcomePage=no
DisableDirPage=no
UninstallDisplayName=Bar Avenida Server
UninstallDisplayIcon={app}\BarAvenida.API.exe

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "iniciarservicio"; Description: "Iniciar el servicio Bar Avenida API al terminar"; GroupDescription: "Servicio Windows:"; Flags: checkedonce
Name: "tareabackup";     Description: "Instalar tarea de backup automatico cada hora";   GroupDescription: "Backups:";          Flags: checkedonce

[Files]
; Backend publicado self-contained (.NET runtime incluido, no requiere SDK en la PC)
Source: "{#SOURCE_ROOT}BarAvenida.API\publish-installer\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; Scripts auxiliares de backup/restore
Source: "{#SOURCE_ROOT}Backups\backup-baravenida.ps1";       DestDir: "{commonappdata}\Bar Avenida\Backups"; Flags: ignoreversion
Source: "{#SOURCE_ROOT}Backups\install-tarea-backup.ps1";    DestDir: "{commonappdata}\Bar Avenida\Backups"; Flags: ignoreversion
Source: "{#SOURCE_ROOT}Backups\restore-baravenida.ps1";      DestDir: "{commonappdata}\Bar Avenida\Backups"; Flags: ignoreversion
Source: "{#SOURCE_ROOT}Backups\limpieza-pre-produccion.sql"; DestDir: "{commonappdata}\Bar Avenida\Backups"; Flags: ignoreversion

[Dirs]
; Carpetas de runtime con permisos de escritura para el servicio
; NOTA: el bar usa F:\BarAvenida. Si una PC no tiene F:\, hay que migrar
;       estos paths a {commonappdata} o configurarlos al instalar.
Name: "F:\BarAvenida\TicketsImpresos"; Permissions: users-modify
Name: "F:\BarAvenida\Backups";         Permissions: users-modify
Name: "F:\BarAvenida\Logs";            Permissions: users-modify

[Icons]
Name: "{group}\Bar Avenida Server (panel)";    Filename: "{cmd}"; Parameters: "/k sc query BarAvenidaAPI"
Name: "{group}\Carpeta de tickets";             Filename: "F:\BarAvenida\TicketsImpresos"
Name: "{group}\Carpeta de backups";             Filename: "F:\BarAvenida\Backups"
Name: "{group}\Logs del backend";               Filename: "F:\BarAvenida\Logs"
Name: "{group}\Desinstalar Bar Avenida Server"; Filename: "{uninstallexe}"

[Run]
; 1. Parar servicio anterior si existia
Filename: "{cmd}"; Parameters: "/c sc stop BarAvenidaAPI"; Flags: runhidden; Check: ServiceExists

; 2. Eliminar servicio anterior si existia
Filename: "{cmd}"; Parameters: "/c sc delete BarAvenidaAPI"; Flags: runhidden; Check: ServiceExists

; 3. Registrar servicio con inicio automatico
Filename: "{cmd}"; Parameters: "/c sc create BarAvenidaAPI binPath= ""{app}\BarAvenida.API.exe"" start= auto DisplayName= ""Bar Avenida API"""; StatusMsg: "Registrando servicio..."; Flags: runhidden

; 4. Descripcion del servicio
Filename: "{cmd}"; Parameters: "/c sc description BarAvenidaAPI ""Backend del POS de Bar Avenida (.NET 8 + EF Core + SignalR)"""; Flags: runhidden

; 5. Politica de reinicio automatico (3 intentos, 1 min entre cada uno)
Filename: "{cmd}"; Parameters: "/c sc failure BarAvenidaAPI reset= 86400 actions= restart/60000/restart/60000/restart/60000"; Flags: runhidden

; 6. Arrancar servicio si la tarea esta marcada
Filename: "{cmd}"; Parameters: "/c sc start BarAvenidaAPI"; Tasks: iniciarservicio; StatusMsg: "Iniciando servicio..."; Flags: runhidden

; 7. Registrar tarea de backup si esta marcada
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{commonappdata}\Bar Avenida\Backups\install-tarea-backup.ps1"""; Tasks: tareabackup; StatusMsg: "Registrando tarea de backup..."; Flags: runhidden

[UninstallRun]
Filename: "{cmd}"; Parameters: "/c sc stop BarAvenidaAPI";                                Flags: runhidden
Filename: "{cmd}"; Parameters: "/c sc delete BarAvenidaAPI";                              Flags: runhidden
Filename: "{cmd}"; Parameters: "/c schtasks /delete /tn BarAvenida_BackupHorario /f";     Flags: runhidden

[Code]
// Verifica si el servicio BarAvenidaAPI ya existe (para el [Run] condicional)
function ServiceExists(): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('sc.exe', 'query BarAvenidaAPI', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

// Verifica que SQL Server este disponible con sqlcmd
function VerificarSqlServer(): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('sqlcmd', '-S "localhost\MSSQLSERVER01" -E -Q "SELECT 1" -b', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

// Se ejecuta al iniciar el wizard — valida prerequisitos
function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  if not VerificarSqlServer() then
  begin
    if MsgBox(
      'No se detecto SQL Server en localhost\MSSQLSERVER01.' + #13#10 + #13#10 +
      'Bar Avenida necesita SQL Server (Express o superior) instalado antes de continuar.' + #13#10 + #13#10 +
      'Quieres abrir la pagina de descarga ahora?',
      mbConfirmation, MB_YESNO) = IDYES then
    begin
      ShellExec('open', 'https://www.microsoft.com/es-mx/sql-server/sql-server-downloads', '', '', SW_SHOW, ewNoWait, ResultCode);
    end;
    Result := False;
    Exit;
  end;
  Result := True;
end;
