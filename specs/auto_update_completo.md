# AUTO-UPDATE COMPLETO — electron-updater + Backend self-update

## Objetivo

Hoy ya hay un flujo de auto-update via `Scripts/actualizar-bar.ps1` + tarea programada (chequea GitHub Releases cada 6h y reinstala silent). Funciona pero tiene 2 problemas:

1. Las apps Electron (Admin, KDS) **no notifican** al usuario que se está actualizando — solo se reinstalan en silencio cuando la tarea corre.
2. Si Coronado quiere **forzar** una actualización desde casa, tiene que entrar por TeamViewer o esperar el ciclo de 6h.

Este spec implementa el modelo "pro":

- **Electron apps** usan `electron-updater` con publish a GitHub: la app chequea al arrancar, descarga la nueva versión, muestra notificación de "Reinicia para actualizar", y al cerrar aplica el update sola.
- **Backend** expone endpoint `POST /api/admin/sistema/update-now` (PIN admin requerido) que dispara la actualización desde la propia UI del Admin: muestra modal "Actualizando..." → backend lanza un script BAT desadosado que detiene servicio, corre el instalador silent, reinicia servicio. El admin recupera la conexión cuando el backend vuelve.

## Hand-off para Claude Code

> Lee este spec entero antes de empezar. **No corras `dotnet run`** — usa solo builds.
> Antes de tocar el backend, detener servicio con `Stop-Service BarAvenidaAPI`.
> Reglas de oro del proyecto aplican (UTF-8 sin BOM, PS5.x sin `&&`, etc).

### Bloque 1 — electron-updater en BarAvenida.Desktop (Admin)

1. **Instalar dependencia:**

   ```powershell
   cd F:\BarAvenida\BarAvenida.Desktop
   npm install electron-updater@latest --save
   ```

2. **Configurar `package.json`** — agregar sección `publish`:

   ```json
   "build": {
     "appId": "com.baravenida.admin",
     "productName": "Bar Avenida Admin",
     "publish": [
       {
         "provider": "github",
         "owner": "nauexpos11-alt",
         "repo": "bar-avenida-pos",
         "releaseType": "release"
       }
     ],
     ...
   }
   ```

3. **Modificar `main.js`** — agregar al inicio (después de los `require`):

   ```js
   const { autoUpdater } = require('electron-updater')

   autoUpdater.autoDownload = true
   autoUpdater.autoInstallOnAppQuit = true

   autoUpdater.on('update-available', (info) => {
     if (win) {
       win.webContents.executeJavaScript(
         `console.log('Update disponible:', ${JSON.stringify(info.version)})`
       )
       // Mostrar notificacion nativa
       const { Notification } = require('electron')
       new Notification({
         title: 'Bar Avenida — Actualizacion disponible',
         body: `Version ${info.version}. Se descargara automatico.`,
       }).show()
     }
   })

   autoUpdater.on('update-downloaded', (info) => {
     const { Notification } = require('electron')
     new Notification({
       title: 'Bar Avenida — Listo para actualizar',
       body: `Version ${info.version}. Cierra la app para instalar.`,
     }).show()
   })

   autoUpdater.on('error', (err) => {
     console.log('Update error (no critico):', err.message)
   })
   ```

4. **Llamar `checkForUpdatesAndNotify` al arrancar** — al final de `app.whenReady().then(...)`:

   ```js
   // Chequear updates cada hora (sin notificar si no hay)
   setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 60 * 60 * 1000)
   // Y al arrancar
   setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 30 * 1000)
   ```

5. **Probar:** después de un `npm run build`, el `.exe` ya incluye electron-updater. Hace falta que el siguiente release de GitHub tenga el archivo `latest.yml` que electron-builder genera automático.

### Bloque 2 — electron-updater en BarAvenida.KDS.Desktop (KDS)

Repetir Bloque 1 idéntico en `F:\BarAvenida\BarAvenida.KDS.Desktop\`, ajustando:

- `appId: com.baravenida.kds`
- `productName: Bar Avenida KDS`
- Mismo `publish` config apuntando a `nauexpos11-alt/bar-avenida-pos`

### Bloque 3 — Backend self-update endpoint

1. **Crear `BarAvenida.API/Services/AutoUpdateService.cs`:**

   ```csharp
   using System.Net.Http.Json;
   using System.Text.Json;

   namespace BarAvenida.API.Services;

   public class AutoUpdateService
   {
       private readonly IHttpClientFactory _http;
       private readonly ILogger<AutoUpdateService> _log;

       public AutoUpdateService(IHttpClientFactory http, ILogger<AutoUpdateService> log)
       {
           _http = http;
           _log  = log;
       }

       public async Task<(string Tag, string ExeUrl, long SizeMB)?> CheckLatest()
       {
           var client = _http.CreateClient();
           client.DefaultRequestHeaders.UserAgent.ParseAdd("BarAvenida-Backend");
           var resp = await client.GetAsync("https://api.github.com/repos/nauexpos11-alt/bar-avenida-pos/releases/latest");
           if (!resp.IsSuccessStatusCode) return null;
           var json = await resp.Content.ReadAsStringAsync();
           using var doc = JsonDocument.Parse(json);
           var tag    = doc.RootElement.GetProperty("tag_name").GetString() ?? "";
           var assets = doc.RootElement.GetProperty("assets");
           foreach (var asset in assets.EnumerateArray())
           {
               var name = asset.GetProperty("name").GetString() ?? "";
               if (name.StartsWith("Bar Avenida Server Setup") && name.EndsWith(".exe"))
               {
                   var url  = asset.GetProperty("browser_download_url").GetString() ?? "";
                   var size = asset.GetProperty("size").GetInt64() / 1024 / 1024;
                   return (tag, url, size);
               }
           }
           return null;
       }

       public async Task<bool> UpdateNow(string downloadUrl, string targetExePath)
       {
           // 1. Descargar a temp
           var client = _http.CreateClient();
           var bytes = await client.GetByteArrayAsync(downloadUrl);
           await File.WriteAllBytesAsync(targetExePath, bytes);

           // 2. Generar BAT desadosado que: detiene servicio, corre installer, reinicia servicio
           var batPath = Path.Combine(Path.GetDirectoryName(targetExePath)!, "do-update.bat");
           var bat = $@"@echo off
   timeout /t 3 /nobreak >nul
   sc stop BarAvenidaAPI
   timeout /t 5 /nobreak >nul
   ""{targetExePath}"" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART
   timeout /t 5 /nobreak >nul
   sc start BarAvenidaAPI
   ";
           await File.WriteAllTextAsync(batPath, bat);

           // 3. Lanzar el BAT como proceso INDEPENDIENTE (sin esperar)
           var psi = new System.Diagnostics.ProcessStartInfo
           {
               FileName        = batPath,
               UseShellExecute = true,
               CreateNoWindow  = true,
               WindowStyle     = System.Diagnostics.ProcessWindowStyle.Hidden,
           };
           System.Diagnostics.Process.Start(psi);
           return true;
       }
   }
   ```

2. **Registrar en `Program.cs`** (en sección de servicios, junto a otros singletons):

   ```csharp
   builder.Services.AddSingleton<AutoUpdateService>();
   ```

3. **Agregar endpoints en `AdminController.cs`** (al final de la clase):

   ```csharp
   [HttpGet("sistema/update-check")]
   [Authorize(Roles = "Admin")]
   public async Task<IActionResult> UpdateCheck([FromServices] AutoUpdateService svc)
   {
       var latest = await svc.CheckLatest();
       if (latest == null) return Ok(new { hayActualizacion = false });

       var versionActual = typeof(Program).Assembly.GetName().Version?.ToString() ?? "0.0.0";
       var versionNueva  = latest.Value.Tag.TrimStart('v');
       var hay = string.Compare(versionNueva, versionActual) > 0;

       return Ok(new {
           hayActualizacion = hay,
           versionActual,
           versionNueva,
           sizeMB = latest.Value.SizeMB,
           downloadUrl = latest.Value.ExeUrl
       });
   }

   [HttpPost("sistema/update-now")]
   [Authorize(Roles = "Admin")]
   public async Task<IActionResult> UpdateNow([FromBody] UpdateNowDto dto, [FromServices] AutoUpdateService svc)
   {
       if (string.IsNullOrWhiteSpace(dto.Pin))
           return BadRequest(new { mensaje = "PIN requerido" });

       // Validar PIN admin
       var admin = await _context.Usuarios.FirstOrDefaultAsync(u =>
           u.Rol == "Admin" && u.Activo);
       if (admin == null || !BCrypt.Net.BCrypt.Verify(dto.Pin, admin.PinHash))
           return Unauthorized(new { mensaje = "PIN admin incorrecto" });

       var latest = await svc.CheckLatest();
       if (latest == null) return BadRequest(new { mensaje = "No hay actualizacion disponible" });

       var temp = Path.Combine(Path.GetTempPath(), "BarAvenidaServerSetup.exe");
       _ = svc.UpdateNow(latest.Value.ExeUrl, temp); // fire-and-forget

       return Ok(new {
           mensaje = "Actualizando. El servicio se reiniciara en ~30 segundos.",
           versionNueva = latest.Value.Tag
       });
   }
   ```

4. **DTO en `BarAvenida.API/DTOs/UpdateDtos.cs`:**

   ```csharp
   namespace BarAvenida.API.DTOs;

   public class UpdateNowDto
   {
       public string Pin { get; set; } = "";
   }
   ```

### Bloque 4 — UI en Admin para forzar update

1. **Nuevo screen `BarAvenida.Admin/src/screens/ActualizacionScreen.jsx`:**

   - Muestra versión actual del backend (de `/api/sistema/info` — agregarlo si no existe)
   - Botón "Chequear actualizaciones" → llama `/api/admin/sistema/update-check`
   - Si hay nueva: muestra "Hay v$nueva ($size MB) — [Actualizar ahora]"
   - Botón abre modal pidiendo PIN admin
   - POST a `/api/admin/sistema/update-now` con PIN
   - Muestra spinner "Actualizando..." y reconecta cuando el backend vuelve (poll cada 5s a `/api/sistema/hora`)

2. **Agregar item en `TopMenuBar.jsx`** sección CONFIG → "🔄 Actualizar sistema".

### Validación E2E (Cowork via Chrome MCP)

1. Después de un `release-total.ps1` con la version 1.2.0, abrir Admin Electron.
2. Esperar ~30 segundos → notificación nativa "Actualizacion disponible 1.2.0".
3. Cerrar Admin → debe instalar y reabrir con 1.2.0.
4. En Admin web, ir a Actualizar Sistema → debe decir "Estás al día".
5. Bumpar versión a 1.2.1 con `release-total.ps1`, esperar que el endpoint detecte → click "Actualizar ahora" con PIN admin → debe reiniciar servicio y volver con 1.2.1.

### Aceptación

- ✅ 0 errors, 0 warnings en backend, Admin, KDS, Tablet
- ✅ `electron-updater` instalado y configurado en Admin y KDS
- ✅ Notificación nativa al detectar update
- ✅ Endpoint `update-check` retorna info
- ✅ Endpoint `update-now` requiere PIN admin
- ✅ Pantalla en Admin para forzar update con PIN
- ✅ Self-update del backend funciona (BAT desadosado → servicio se reinicia con binario nuevo)

### Archivos esperados

**Modificados:**
- `BarAvenida.Desktop/package.json` (agrega electron-updater + publish)
- `BarAvenida.Desktop/main.js` (autoUpdater + listeners)
- `BarAvenida.KDS.Desktop/package.json`
- `BarAvenida.KDS.Desktop/main.js`
- `BarAvenida.API/Program.cs` (registra AutoUpdateService)
- `BarAvenida.API/Controllers/AdminController.cs` (2 endpoints)
- `BarAvenida.Admin/src/components/TopMenuBar.jsx` (item nuevo)
- `BarAvenida.Admin/src/App.jsx` (case nuevo)

**Nuevos:**
- `BarAvenida.API/Services/AutoUpdateService.cs`
- `BarAvenida.API/DTOs/UpdateDtos.cs`
- `BarAvenida.Admin/src/screens/ActualizacionScreen.jsx`
- `BarAvenida.Admin/src/screens/ActualizacionScreen.css`

### Notas

- `electron-updater` requiere que el `.exe` tenga **publisher firmado** para producción (en dev no, pero al instalar el .exe sin firma sale warning de SmartScreen). Para no firmar, usar `--win.publisherName` en electron-builder lo mitiga.
- El BAT del self-update se ejecuta como SYSTEM (el servicio corre con SYSTEM), por lo que `sc stop`/`sc start` funcionan sin UAC prompt.
- Si quieres rollback automático: agregar al BAT una verificación post-install (`curl localhost:7000/api/sistema/hora`) y si falla, restaurar el binario backup. Más complejo, no incluido aquí.
