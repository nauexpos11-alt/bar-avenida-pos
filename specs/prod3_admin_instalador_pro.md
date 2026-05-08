# PROD-3 — Admin como instalador profesional

## Objetivo

Convertir `BarAvenida.Desktop` (el wrapper Electron del Admin) en un **instalador `.exe` que funcione en cualquier PC Windows**, no solo en la del bar. Hoy la URL del backend está hardcoded a `http://localhost:7000/admin` — si Coronado lo instala en una segunda PC, no conecta al servidor.

## Contexto

Hoy ya existe `BarAvenida.Desktop` con:
- `main.js` (URL hardcoded `http://localhost:7000/admin`)
- `preload.js`
- `splash.html`
- `assets/icon.ico`
- `package.json` con `electron-builder` configurado para NSIS oneClick

Y ya existe el binario `dist/Bar Avenida Monitor Admin Setup 1.0.0.exe`.

Lo que falta para que sea instalable en CUALQUIER PC del bar:

1. **URL del backend configurable** (no hardcoded).
2. **Pantalla de configuración al primer arranque** que pida la IP del servidor.
3. **Persistir esa config** en `%APPDATA%\Bar Avenida\config.json`.
4. **Detección automática del backend** en LAN (intentar `192.168.x.10:7000`, `localhost:7000`, etc.) antes de pedir manual.
5. Botón de "Cambiar servidor" desde menú/atajo (Ctrl+Shift+S).
6. Icono profesional + accesos directos en escritorio y menú inicio.

## Resultado esperado

1. Coronado descarga `Bar Avenida Admin Setup.exe`, lo abre en cualquier PC con Windows 10+ y Chrome instalado.
2. Al primer arranque, el Admin intenta conectar a `http://localhost:7000` (PC central) y `http://192.168.100.10:7000`. Si responde alguno → guarda y carga el Admin.
3. Si ninguno responde → muestra una pantalla de configuración pidiendo la IP del servidor (campo IP + puerto + botón "Probar conexión" + "Guardar y entrar").
4. Si la conexión funciona → guarda en `%APPDATA%\Bar Avenida\config.json` y nunca vuelve a preguntar (a menos que truene el servidor).
5. Atajo `Ctrl+Shift+S` en cualquier momento abre la pantalla de configuración para cambiar IP.
6. Si el backend cambia de IP y deja de responder → la app muestra un banner "No se puede conectar al servidor [Cambiar servidor]" sin tirarse abajo.
7. Build genera `Bar Avenida Admin Setup 1.1.0.exe` con icono dorado, accesos directos creados, entrada en "Agregar/quitar programas" con icono y nombre de fabricante.
8. Build 0 errors, 0 warnings.

## Cambios a hacer

### 1. Modificar `BarAvenida.Desktop/main.js`

Reemplazar la lógica actual con detección + configuración persistente:

```javascript
const { app, BrowserWindow, Menu, session, globalShortcut, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')

// ──────────────────────────────────────────────────────────
// Configuración persistente
// ──────────────────────────────────────────────────────────
const CONFIG_DIR  = path.join(app.getPath('appData'), 'Bar Avenida')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')
const RETRY_DELAY = 5000

// Candidatos para auto-detección
const CANDIDATOS_AUTO = [
  'http://localhost:7000',
  'http://192.168.100.10:7000',
  'http://192.168.1.10:7000',
  'http://192.168.0.10:7000',
]

let config = { servidor: null, version: 1 }
let win

// Cargar config al arrancar
function cargarConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) }
    }
  } catch (e) {
    console.warn('Config corrupta, se ignora:', e.message)
  }
}

function guardarConfig() {
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
  } catch (e) {
    console.error('No se pudo guardar config:', e.message)
  }
}

// Probar si una URL responde con 200/302/404 dentro de 2 segundos
function probarServidor(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url)
      const req = http.get({
        host: u.hostname,
        port: u.port,
        path: '/api/auth/test',  // O cualquier endpoint que exista; si 404, igual significa que el servidor responde
        timeout: 2000,
      }, (res) => {
        // Cualquier respuesta HTTP cuenta como "el servidor está vivo"
        resolve(true)
        res.resume()
      })
      req.on('error', () => resolve(false))
      req.on('timeout', () => { req.destroy(); resolve(false) })
    } catch {
      resolve(false)
    }
  })
}

async function autoDetectarServidor() {
  for (const url of CANDIDATOS_AUTO) {
    if (await probarServidor(url)) {
      return url
    }
  }
  return null
}

// ──────────────────────────────────────────────────────────
// Ventana
// ──────────────────────────────────────────────────────────
function createWindow() {
  win = new BrowserWindow({
    title: 'Bar Avenida — Monitor Admin',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    show: false,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  Menu.setApplicationMenu(null)
  win.maximize()
  win.loadFile(path.join(__dirname, 'splash.html'))
  win.show()

  arrancarFlujoCarga()

  win.on('closed', () => { win = null })
}

async function arrancarFlujoCarga() {
  // 1. Si ya hay servidor guardado, intentarlo primero
  if (config.servidor && await probarServidor(config.servidor)) {
    cargarApp(config.servidor)
    return
  }
  // 2. Auto-detectar
  const detectado = await autoDetectarServidor()
  if (detectado) {
    config.servidor = detectado
    guardarConfig()
    cargarApp(detectado)
    return
  }
  // 3. Mostrar pantalla de configuración
  win.loadFile(path.join(__dirname, 'config-servidor.html'))
}

function cargarApp(servidorUrl) {
  const url = `${servidorUrl}/admin`
  win.loadURL(url, { extraHeaders: 'pragma: no-cache\n' }).catch(() => {})

  win.webContents.removeAllListeners('did-fail-load')
  win.webContents.on('did-fail-load', (_event, _code, _desc, urlFallida) => {
    if (urlFallida === url || urlFallida.startsWith(servidorUrl)) {
      setTimeout(() => {
        if (win) win.loadURL(url, { extraHeaders: 'pragma: no-cache\n' }).catch(() => {})
      }, RETRY_DELAY)
    }
  })
}

// ──────────────────────────────────────────────────────────
// IPC desde la pantalla de configuración
// ──────────────────────────────────────────────────────────
ipcMain.handle('probar-servidor', async (_e, url) => {
  return await probarServidor(url)
})

ipcMain.handle('guardar-servidor', async (_e, url) => {
  config.servidor = url
  guardarConfig()
  cargarApp(url)
  return true
})

ipcMain.handle('cancelar-config', () => {
  app.quit()
})

ipcMain.handle('abrir-carpeta-tickets', () => {
  shell.openPath(String.raw`F:\BarAvenida\TicketsImpresos`)
})

// ──────────────────────────────────────────────────────────
// Lifecycle
// ──────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  cargarConfig()

  try {
    await session.defaultSession.clearCache()
    await session.defaultSession.clearStorageData({ storages: ['cachestorage', 'shadercache'] })
  } catch (e) {
    console.log('Cache clear failed:', e.message)
  }

  createWindow()

  globalShortcut.register('CommandOrControl+Shift+R', async () => {
    if (win) {
      await session.defaultSession.clearCache()
      win.webContents.reloadIgnoringCache()
    }
  })

  globalShortcut.register('F12', () => {
    if (win) win.webContents.toggleDevTools()
  })

  // Atajo para abrir pantalla de cambio de servidor
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (win) win.loadFile(path.join(__dirname, 'config-servidor.html'))
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  app.quit()
})

app.on('activate', () => {
  if (win === null) createWindow()
})
```

### 2. Crear `BarAvenida.Desktop/config-servidor.html`

Pantalla negra con dorado, formulario para configurar IP:

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Bar Avenida — Configurar servidor</title>
  <style>
    body {
      margin: 0;
      background: #0a0a0a;
      color: #f0c842;
      font-family: 'Segoe UI', system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }
    .box {
      width: 480px;
      padding: 2.5rem;
      border: 2px solid #f0c842;
      border-radius: 12px;
      background: #111;
    }
    h1 { margin: 0 0 .5rem; font-size: 1.6rem; }
    p  { color: #aaa; margin: 0 0 1.5rem; }
    label { display: block; font-size: .8rem; margin: .8rem 0 .3rem; letter-spacing: .1em; }
    input {
      width: 100%;
      padding: .8rem;
      border: 1px solid #333;
      background: #0a0a0a;
      color: #f0c842;
      font-size: 1.1rem;
      border-radius: 6px;
      box-sizing: border-box;
    }
    input:focus { outline: none; border-color: #f0c842; }
    .row { display: flex; gap: .6rem; }
    .row > .ip   { flex: 1; }
    .row > .port { width: 100px; }
    button {
      width: 100%;
      padding: .9rem;
      margin-top: 1.2rem;
      background: #f0c842;
      color: #0a0a0a;
      font-weight: 700;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1rem;
      letter-spacing: .05em;
    }
    button:disabled { opacity: .4; cursor: wait; }
    .btn-cancel {
      background: transparent;
      color: #888;
      border: 1px solid #333;
      margin-top: .6rem;
    }
    #msg { margin-top: 1rem; min-height: 1.3em; font-size: .9rem; }
    .ok    { color: #4ade80; }
    .error { color: #ef4444; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Configurar servidor</h1>
    <p>Escribe la IP de la PC que tiene el backend de Bar Avenida.</p>

    <label>IP del servidor</label>
    <div class="row">
      <input class="ip"   id="ip"   placeholder="192.168.100.10" value="192.168.100.10">
      <input class="port" id="port" placeholder="7000"            value="7000">
    </div>

    <button id="btnProbar">PROBAR Y GUARDAR</button>
    <button class="btn-cancel" id="btnCancelar">Cancelar y salir</button>

    <p id="msg"></p>
  </div>

  <script>
    const $ip       = document.getElementById('ip')
    const $port     = document.getElementById('port')
    const $btn      = document.getElementById('btnProbar')
    const $cancel   = document.getElementById('btnCancelar')
    const $msg      = document.getElementById('msg')

    $btn.addEventListener('click', async () => {
      const url = `http://${$ip.value.trim()}:${$port.value.trim()}`
      $btn.disabled = true
      $btn.textContent = 'PROBANDO...'
      $msg.className = ''
      $msg.textContent = ''
      try {
        const ok = await window.baravenida.probarServidor(url)
        if (ok) {
          $msg.className = 'ok'
          $msg.textContent = 'Conectado. Guardando...'
          await window.baravenida.guardarServidor(url)
        } else {
          $msg.className = 'error'
          $msg.textContent = 'No respondió. Revisa IP/puerto y que el backend esté corriendo.'
          $btn.disabled = false
          $btn.textContent = 'PROBAR Y GUARDAR'
        }
      } catch (e) {
        $msg.className = 'error'
        $msg.textContent = 'Error: ' + e.message
        $btn.disabled = false
        $btn.textContent = 'PROBAR Y GUARDAR'
      }
    })

    $cancel.addEventListener('click', () => {
      window.baravenida.cancelarConfig()
    })
  </script>
</body>
</html>
```

### 3. Modificar `BarAvenida.Desktop/preload.js`

Exponer las APIs IPC al renderer:

```javascript
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('baravenida', {
  abrirCarpetaTickets: () => ipcRenderer.invoke('abrir-carpeta-tickets'),
  probarServidor:      (url) => ipcRenderer.invoke('probar-servidor', url),
  guardarServidor:     (url) => ipcRenderer.invoke('guardar-servidor', url),
  cancelarConfig:      ()    => ipcRenderer.invoke('cancelar-config'),
})
```

(Si ya hay otras keys expuestas, conservarlas.)

### 4. Modificar `BarAvenida.Desktop/package.json`

Subir versión y mejorar config NSIS:

```json
{
  "name": "baravenida-desktop",
  "version": "1.1.0",
  "description": "Bar Avenida — Monitor Admin",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder --win",
    "build:dir": "electron-builder --win --dir"
  },
  "devDependencies": {
    "electron": "^31.0.0",
    "electron-builder": "^24.13.3"
  },
  "build": {
    "appId": "com.baravenida.admin",
    "productName": "Bar Avenida Admin",
    "copyright": "Bar Avenida",
    "directories": { "output": "dist" },
    "files": [
      "main.js",
      "preload.js",
      "splash.html",
      "config-servidor.html",
      "assets/**/*"
    ],
    "win": {
      "icon": "assets/icon.ico",
      "publisherName": "Bar Avenida",
      "target": [
        { "target": "nsis", "arch": ["x64"] }
      ]
    },
    "nsis": {
      "oneClick": false,
      "perMachine": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "Bar Avenida Admin",
      "uninstallDisplayName": "Bar Avenida Admin",
      "deleteAppDataOnUninstall": false
    }
  }
}
```

### 5. Iconos `assets/icon.ico`

Si no existe `assets/icon.ico` o se ve genérico, generar uno nuevo:

- Usar el mismo diseño de los iconos PWA (BA en dorado sobre negro).
- Tamaños recomendados en el .ico: 16, 24, 32, 48, 64, 128, 256.
- Coronado puede generarlo con un convertidor online (PNG → ICO) usando los `icon-512.png` de la Tablet, o con el script Python `generar-iconos.py` adaptado.
- Si Claude Code no puede generarlo, dejar el icono actual y anotarlo.

### 6. Build

```powershell
cd F:\BarAvenida\BarAvenida.Desktop
npm install
npm run build
```

Genera `dist/Bar Avenida Admin Setup 1.1.0.exe`.

## Reglas duras

- 0 errors, 0 warnings.
- NO romper el comportamiento actual cuando hay backend en `localhost:7000`.
- NO instalar librerías nuevas más allá de las ya listadas (electron, electron-builder).
- Mantener tema dorado/negro.
- Persistir config solo en `%APPDATA%\Bar Avenida\config.json` (no escribir en el directorio de instalación).

## Aceptación

- ✅ Instalar el `.exe` en una PC NUEVA sin backend → muestra la pantalla de configuración con campos IP/puerto.
- ✅ Escribir IP correcta + clic "PROBAR Y GUARDAR" → entra al Admin normalmente.
- ✅ Reiniciar la app → entra directo (no vuelve a preguntar).
- ✅ Apagar el backend → la app muestra splash + reintenta cada 5s, no se cierra.
- ✅ `Ctrl+Shift+S` desde dentro del Admin → muestra de nuevo la pantalla de configuración.
- ✅ Instalación NSIS crea acceso directo en escritorio Y en menú inicio, con icono del bar.
- ✅ Aparece en "Agregar o quitar programas" como "Bar Avenida Admin" con publisher "Bar Avenida".
- ✅ Build 0/0.

## Archivos esperados al cierre

- Modificados: `main.js`, `preload.js`, `package.json`
- Nuevos: `config-servidor.html`
- Opcional: `assets/icon.ico` (renovado)
- Build: `dist/Bar Avenida Admin Setup 1.1.0.exe`
