# Cómo instalar Bar Avenida en una PC nueva

Esto te lleva de una **PC limpia con Windows 10/11** a un **sistema completamente funcional** en ~15 minutos.

## Lo que necesitas tener antes

- PC con Windows 10/11 x64
- Conexión a internet (solo para la instalación)
- WiFi del bar conectada (para que tablets/celulares se conecten después)
- USB con SQL Server Express (opcional pero recomendado, ahorra descarga)

## Paso 1 — Instalar SQL Server Express (una sola vez)

Bar Avenida usa SQL Server con instancia `MSSQLSERVER01`. La opción más simple:

1. Descarga **SQL Server Express** desde https://www.microsoft.com/es-mx/sql-server/sql-server-downloads
2. Doble click → "Basic" o "Custom"
3. Cuando pida nombre de instancia, escribe: **`MSSQLSERVER01`**
4. Autenticación: **Windows** (la default)
5. Termina la instalación

> **Tip:** si ya tenías SQL Server con otro nombre de instancia, edita
> `appsettings.json` del backend después de instalar para apuntar a la correcta.

## Paso 2 — Bajar e instalar Bar Avenida (un solo comando)

Abre **PowerShell como Administrador** (clic derecho → "Ejecutar como administrador") y pega:

```powershell
irm https://raw.githubusercontent.com/nauexpos11-alt/bar-avenida-pos/main/Scripts/instalar-todo.ps1 | iex
```

El script hace todo:

- Verifica que SQL Server esté listo
- Descarga la última versión de GitHub Releases (3 instaladores, ~250MB total)
- Instala el Backend como servicio Windows `BarAvenidaAPI`
- Instala el Admin Electron
- Instala el KDS Electron
- Abre el firewall en puerto 7000
- Te imprime la IP local y las URLs

> Si tienes los .exe en un USB, no necesitas internet — copia `instalar-todo-offline.ps1` (lo agregamos después) y los 3 .exe a la PC.

## Paso 3 — Instalar la auto-actualización

Para que esta PC se actualice sola cuando mandes una nueva versión desde casa:

```powershell
powershell -ExecutionPolicy Bypass -File C:\BarAvenida\install-tarea-auto-update.ps1
```

Esto registra una tarea de Windows que cada 6 horas:
- Chequea GitHub Releases
- Si hay versión nueva, la descarga y la instala silent
- Reinicia el servicio
- Loguea todo a `C:\BarAvenida\actualizar-bar.log`

## Paso 4 — Conectar las tablets y celulares de meseras

La PC del bar tiene una IP local (te la imprime el script de instalación). Por ejemplo `192.168.100.10`.

En cada celular de mesera:

1. Conectarse al **mismo WiFi** del bar
2. Abrir Chrome
3. Entrar a `http://IP-DEL-BAR:7000/tablet/`
4. Menú Chrome (⋮) → **"Añadir a pantalla de inicio"**
5. Listo, tienes la PWA instalada

## Paso 5 — Primer login

| Usuario  | Código  | PIN    |
|----------|---------|--------|
| Admin    | `ADMIN` | `1234` |
| ABBY     | `23`    | `0001` |
| BAR1     | `BAR1`  | `0002` |

**Cambia el PIN admin cuanto antes** desde el Admin Electron → Configuración → Cambiar PIN.

---

# Cómo enviar actualizaciones desde casa

Cuando trabajes en tu PC personal y quieras mandar una versión nueva al bar:

```powershell
.\Scripts\release-total.ps1 -Version "1.2.0"
```

El script hace en un paso:

1. Bumpa la versión en todos los `package.json` y `.iss`
2. Compila los frontends (Tablet, Admin web, KDS web)
3. Hace `dotnet publish` self-contained del backend
4. Corre Inno Setup para generar `Bar Avenida Server Setup 1.2.0.exe`
5. Corre electron-builder para `Bar Avenida Admin Setup 1.2.0.exe` y `Bar Avenida KDS Setup 1.2.0.exe`
6. Junta los 3 .exe en `Releases/`
7. Crea un **GitHub Release `v1.2.0`** con los 3 .exe como assets

Después puedes:

- **Esperar** que la PC del bar se actualice sola en las próximas 6 horas
- **Forzar** la actualización ahora mismo si tienes acceso (vía Escritorio Remoto o TeamViewer): correr `powershell -ExecutionPolicy Bypass -File C:\BarAvenida\actualizar-bar.ps1` en la PC del bar

## Requisitos en tu PC personal

- **Node.js + npm** (para los frontends)
- **.NET 8 SDK** (para el backend)
- **Inno Setup 6+** (se auto-instala vía winget si falta)
- **GitHub CLI** (`gh`): instala con `winget install --id GitHub.cli` y autentica con `gh auth login`

---

# Troubleshooting

## "El servicio BarAvenidaAPI no arranca"

Probablemente falta permiso del usuario SYSTEM en SQL Server. Corre:

```powershell
sqlcmd -S "localhost\MSSQLSERVER01" -E -i "F:\BarAvenida\Backups\fix-permisos-sql-system.sql"
```

## "Las tablets no encuentran el backend"

1. Verifica que estén en el **mismo WiFi** que la PC del bar
2. Verifica que el router **no tenga "AP Isolation"** activado
3. Verifica que el firewall esté abierto en puerto 7000:
   ```powershell
   Get-NetFirewallRule -DisplayName "Bar Avenida API (puerto 7000)"
   ```

## "Quiero forzar una actualización ya"

```powershell
powershell -ExecutionPolicy Bypass -File C:\BarAvenida\actualizar-bar.ps1 -Force
```

## "El Admin/KDS Electron quedó apuntando a la IP vieja"

Atajo dentro de la app: **`Ctrl+Shift+S`** abre la pantalla de configurar servidor.

## Logs útiles

- Backend: `F:\BarAvenida\Logs\baravenida-YYYY-MM-DD.log`
- Auto-update: `C:\BarAvenida\actualizar-bar.log`
- Backups: `F:\BarAvenida\Backups\*.bak` (cada hora, retención 7 días)

---

# Pendientes para versión futura

- Implementar `electron-updater` real en Admin y KDS (hoy se actualizan vía el script externo)
- Endpoint admin en el backend para forzar update remoto (hoy hay que entrar por TeamViewer)
- Round 1+2 de seguridad (lockout, rate limit, audit, HTTPS, headers)
- Cifrado AES-256 de backups
