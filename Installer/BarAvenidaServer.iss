; Bar Avenida - Server Installer (Inno Setup script)
; Para compilar: iscc BarAvenidaServer.iss  (desde la carpeta Installer/)
; Prerequisito: Inno Setup 6+ instalado desde https://jrsoftware.org/isinfo.php
;
; v1.3.0 - Robustez del auto-arranque:
;   * Setup SQL preventivo antes de crear servicio
;   * Reintentos automaticos si el servicio no arranca
;   * Shortcuts a Admin/KDS/Tablet en menu Inicio + escritorio
;   * Tarea de auto-update se registra automaticamente
;   * Validacion de prerequisitos (SQL Server + drive F:)

#define SOURCE_ROOT "..\"

[Setup]
AppId={{A1B2C3D4-BAR-AVENIDA-SERVER-INSTALL}}
AppName=Bar Avenida Server
AppVersion=1.10.0
AppPublisher=Bar Avenida
AppPublisherURL=https://baravenida.local
AppSupportURL=https://baravenida.local
DefaultDirName={autopf}\Bar Avenida\Server
DefaultGroupName=Bar Avenida
OutputDir=dist
OutputBaseFilename=Bar Avenida Server Setup 1.10.0
Compression=zip/9
SolidCompression=no
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
WizardStyle=modern
DisableWelcomePage=no
DisableDirPage=no
UninstallDisplayName=Bar Avenida Server
UninstallDisplayIcon={app}\BarAvenida.API.exe

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "iniciarservicio";  Description: "Iniciar el servicio Bar Avenida API al terminar (recomendado)"; GroupDescription: "Servicio Windows:"; Flags: checkedonce
Name: "tareabackup";       Description: "Instalar tarea de backup automatico cada hora";                GroupDescription: "Backups:";        Flags: checkedonce
Name: "tareaautoupdate";   Description: "Instalar notificador de updates al iniciar sesion (recomendado)"; GroupDescription: "Auto-Update:";   Flags: checkedonce
Name: "shortcutdesktop";   Description: "Crear acceso directo a la Tablet de meseras en el escritorio";  GroupDescription: "Atajos:";         Flags: checkedonce

[Files]
; Backend publicado self-contained (.NET runtime incluido, no requiere SDK en la PC)
Source: "{#SOURCE_ROOT}BarAvenida.API\publish-installer\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; Scripts auxiliares de backup/restore
Source: "{#SOURCE_ROOT}Backups\backup-baravenida.ps1";              DestDir: "{commonappdata}\Bar Avenida\Backups"; Flags: ignoreversion
Source: "{#SOURCE_ROOT}Backups\install-tarea-backup.ps1";           DestDir: "{commonappdata}\Bar Avenida\Backups"; Flags: ignoreversion
Source: "{#SOURCE_ROOT}Backups\restore-baravenida.ps1";             DestDir: "{commonappdata}\Bar Avenida\Backups"; Flags: ignoreversion
Source: "{#SOURCE_ROOT}Backups\restore-baravenida-encriptado.ps1";  DestDir: "{commonappdata}\Bar Avenida\Backups"; Flags: ignoreversion
Source: "{#SOURCE_ROOT}Backups\limpieza-pre-produccion.sql";        DestDir: "{commonappdata}\Bar Avenida\Backups"; Flags: ignoreversion

; SQL scripts (preventivo y fix manual)
Source: "{#SOURCE_ROOT}Backups\setup-sql-baravenida.sql";     DestDir: "{commonappdata}\Bar Avenida\Backups"; Flags: ignoreversion
Source: "{#SOURCE_ROOT}Backups\fix-permisos-sql-system.sql";  DestDir: "{commonappdata}\Bar Avenida\Backups"; Flags: ignoreversion

; Scripts del flujo auto-update (se copian a C:\BarAvenida para que las tareas los encuentren)
Source: "{#SOURCE_ROOT}Scripts\actualizar-bar.ps1";            DestDir: "{sd}\BarAvenida"; Flags: ignoreversion
Source: "{#SOURCE_ROOT}Scripts\notificador-update.ps1";        DestDir: "{sd}\BarAvenida"; Flags: ignoreversion
Source: "{#SOURCE_ROOT}Scripts\instalar-con-ui.ps1";           DestDir: "{sd}\BarAvenida"; Flags: ignoreversion
Source: "{#SOURCE_ROOT}Scripts\install-tarea-auto-update.ps1"; DestDir: "{sd}\BarAvenida"; Flags: ignoreversion

; Scripts de seguridad HTTPS (v1.9.0)
Source: "{#SOURCE_ROOT}Scripts\generar-cert-https.ps1";        DestDir: "{sd}\BarAvenida"; Flags: ignoreversion
Source: "{#SOURCE_ROOT}Scripts\confiar-cert-cliente.ps1";      DestDir: "{sd}\BarAvenida"; Flags: ignoreversion

[Dirs]
; Carpetas de runtime con permisos de escritura para el servicio
; Si F: existe, las crea ahi. Si no, fallback a C:\BarAvenida-data\
Name: "F:\BarAvenida\TicketsImpresos"; Permissions: users-modify; Check: VerificarDriveF
Name: "F:\BarAvenida\Backups";         Permissions: users-modify; Check: VerificarDriveF
Name: "F:\BarAvenida\Logs";            Permissions: users-modify; Check: VerificarDriveF
Name: "C:\BarAvenida-data\TicketsImpresos"; Permissions: users-modify
Name: "C:\BarAvenida-data\Backups";         Permissions: users-modify
Name: "C:\BarAvenida-data\Logs";            Permissions: users-modify
Name: "{sd}\BarAvenida";               Permissions: users-modify

[Icons]
; Iconos en el menu Inicio
Name: "{group}\Bar Avenida Server (panel)";    Filename: "{cmd}"; Parameters: "/k sc query BarAvenidaAPI"
Name: "{group}\Tablet de Meseras (navegador)"; Filename: "http://localhost:7000/tablet/"
Name: "{group}\Admin (navegador)";              Filename: "http://localhost:7000/admin/"
Name: "{group}\KDS (navegador)";                Filename: "http://localhost:7000/kds"
Name: "{group}\Carpeta de tickets";             Filename: "F:\BarAvenida\TicketsImpresos"
Name: "{group}\Carpeta de backups";             Filename: "F:\BarAvenida\Backups"
Name: "{group}\Logs del backend";               Filename: "F:\BarAvenida\Logs"
Name: "{group}\Desinstalar Bar Avenida Server"; Filename: "{uninstallexe}"

; Acceso directo en el escritorio comun (opcional via task)
Name: "{commondesktop}\Bar Avenida - Tablet"; Filename: "http://localhost:7000/tablet/"; Tasks: shortcutdesktop

[Run]
; ========== PASO 1: Detener y borrar servicio anterior si existia ==========
Filename: "{cmd}"; Parameters: "/c sc stop BarAvenidaAPI"; Flags: runhidden waituntilterminated; Check: ServiceExists
Filename: "{cmd}"; Parameters: "/c timeout /t 3 /nobreak"; Flags: runhidden waituntilterminated; Check: ServiceExists
Filename: "{cmd}"; Parameters: "/c sc delete BarAvenidaAPI"; Flags: runhidden waituntilterminated; Check: ServiceExists

; ========== PASO 2: SETUP SQL PREVENTIVO ==========
; Crea login NT AUTHORITY\SYSTEM con dbcreator + securityadmin.
; ESTO evita el bug 1.2.0 donde el servicio no arrancaba por falta de permisos.
Filename: "sqlcmd"; Parameters: "-S ""localhost\MSSQLSERVER01"" -E -i ""{commonappdata}\Bar Avenida\Backups\setup-sql-baravenida.sql"" -b"; StatusMsg: "Configurando permisos SQL para el servicio..."; Flags: runhidden waituntilterminated

; ========== PASO 3: Registrar servicio Windows con inicio automatico ==========
Filename: "{cmd}"; Parameters: "/c sc create BarAvenidaAPI binPath= ""{app}\BarAvenida.API.exe"" start= auto DisplayName= ""Bar Avenida API"""; StatusMsg: "Registrando servicio..."; Flags: runhidden waituntilterminated
Filename: "{cmd}"; Parameters: "/c sc description BarAvenidaAPI ""Backend del POS de Bar Avenida (.NET 8 + EF Core + SignalR)"""; Flags: runhidden waituntilterminated
Filename: "{cmd}"; Parameters: "/c sc failure BarAvenidaAPI reset= 86400 actions= restart/60000/restart/60000/restart/60000"; Flags: runhidden waituntilterminated

; ========== PASO 4: Arrancar servicio (primera vez crea la BD via migraciones) ==========
Filename: "{cmd}"; Parameters: "/c sc start BarAvenidaAPI"; Tasks: iniciarservicio; StatusMsg: "Iniciando servicio..."; Flags: runhidden waituntilterminated

; ========== PASO 5: Esperar a que la BD se cree (migraciones EF) ==========
Filename: "{cmd}"; Parameters: "/c timeout /t 15 /nobreak"; Tasks: iniciarservicio; StatusMsg: "Esperando que la base de datos se inicialice..."; Flags: runhidden waituntilterminated

; ========== PASO 6: Re-aplicar permisos SQL ahora que la BD ya existe ==========
; Esto agrega db_owner sobre BarAvenida para SYSTEM (no se podia antes porque la BD no existia).
Filename: "sqlcmd"; Parameters: "-S ""localhost\MSSQLSERVER01"" -E -i ""{commonappdata}\Bar Avenida\Backups\setup-sql-baravenida.sql"" -b"; Tasks: iniciarservicio; StatusMsg: "Finalizando permisos sobre la BD..."; Flags: runhidden waituntilterminated

; ========== PASO 7: Reiniciar servicio para que tome los permisos finales ==========
Filename: "{cmd}"; Parameters: "/c sc stop BarAvenidaAPI"; Tasks: iniciarservicio; Flags: runhidden waituntilterminated
Filename: "{cmd}"; Parameters: "/c timeout /t 3 /nobreak"; Tasks: iniciarservicio; Flags: runhidden waituntilterminated
Filename: "{cmd}"; Parameters: "/c sc start BarAvenidaAPI"; Tasks: iniciarservicio; StatusMsg: "Reiniciando servicio con permisos finales..."; Flags: runhidden waituntilterminated

; ========== PASO 8: Configurar firewall (puerto 7000) ==========
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -Command ""Get-NetFirewallRule -DisplayName 'Bar Avenida API (puerto 7000)' -ErrorAction SilentlyContinue | Remove-NetFirewallRule; New-NetFirewallRule -DisplayName 'Bar Avenida API (puerto 7000)' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 7000 -Profile Any -Enabled True | Out-Null"""; StatusMsg: "Configurando firewall..."; Flags: runhidden waituntilterminated

; ========== PASO 8b: Generar cert HTTPS si no existe (v1.9.0) ==========
; Solo corre si no existe C:\ProgramData\Bar Avenida\cert\BarAvenida.pfx
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{sd}\BarAvenida\generar-cert-https.ps1"""; StatusMsg: "Generando certificado HTTPS self-signed..."; Flags: runhidden waituntilterminated; Check: CertHttpsNoExiste

; ========== PASO 9: Tarea de backup ==========
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{commonappdata}\Bar Avenida\Backups\install-tarea-backup.ps1"""; Tasks: tareabackup; StatusMsg: "Registrando tarea de backup..."; Flags: runhidden waituntilterminated

; ========== PASO 10: Tareas de auto-update (notificador al login + fallback 3:30am) ==========
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{sd}\BarAvenida\install-tarea-auto-update.ps1"""; Tasks: tareaautoupdate; StatusMsg: "Registrando notificador de updates..."; Flags: runhidden waituntilterminated

; ========== PASO 11: Abrir la Tablet en el navegador al terminar (postinstall) ==========
Filename: "http://localhost:7000/tablet/"; Description: "Abrir la Tablet de meseras en el navegador"; Tasks: iniciarservicio; Flags: postinstall shellexec skipifsilent

[UninstallRun]
Filename: "{cmd}"; Parameters: "/c sc stop BarAvenidaAPI";                                Flags: runhidden; RunOnceId: "uninstStopService"
Filename: "{cmd}"; Parameters: "/c sc delete BarAvenidaAPI";                              Flags: runhidden; RunOnceId: "uninstDeleteService"
Filename: "{cmd}"; Parameters: "/c schtasks /delete /tn BarAvenida_BackupHorario /f";     Flags: runhidden; RunOnceId: "uninstBackupTask"
Filename: "{cmd}"; Parameters: "/c schtasks /delete /tn BarAvenida_AutoUpdate /f";        Flags: runhidden; RunOnceId: "uninstUpdateTask"
Filename: "{cmd}"; Parameters: "/c schtasks /delete /tn BarAvenida_Notificador /f";      Flags: runhidden; RunOnceId: "uninstNotifTask"

[Code]
// Verifica si el servicio BarAvenidaAPI ya existe
function ServiceExists(): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('sc.exe', 'query BarAvenidaAPI', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

// Verifica si NO existe el cert HTTPS (para regenerarlo)
function CertHttpsNoExiste(): Boolean;
begin
  Result := not FileExists(ExpandConstant('{commonappdata}\Bar Avenida\cert\BarAvenida.pfx'));
end;

// Verifica que SQL Server este disponible con sqlcmd
function VerificarSqlServer(): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('sqlcmd', '-S "localhost\MSSQLSERVER01" -E -Q "SELECT 1" -b', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

// Verifica que existe el drive F:
function VerificarDriveF(): Boolean;
begin
  Result := DirExists('F:\') or FileExists('F:\');
end;

// Se ejecuta al iniciar el wizard.
// NO valida nada bloqueante - todas las validaciones las hace el script
// instalar-pc-nueva.ps1 (PowerShell wrapper) antes de invocar este setup.
// Para instalacion 100% automatica sin cuadritos al usuario.
function InitializeSetup(): Boolean;
begin
  Result := True;
end;
