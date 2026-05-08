# PROD-4 — KDS como instalador profesional

## Objetivo

Pulir `BarAvenida.KDS.Desktop` (wrapper Electron del KDS de la barra) para que sea instalable en **cualquier PC del bar** con la misma calidad que el Admin pulido en PROD-3.

## Contexto

Hoy `BarAvenida.KDS.Desktop` existe pero tiene 2 bugs:

1. **URL incorrecta:** apunta a `http://192.168.100.10:3001` — pero el backend sirve el KDS en `/kds` del puerto 7000. Debería ser `http://192.168.100.10:7000/kds`.
2. **URL hardcoded:** si el bar cambia de IP, hay que recompilar.

Además le falta la pantalla de configuración + config persistente + iconos + atajos.

## Resultado esperado

Mismo flujo que el Admin (PROD-3):

1. Al primer arranque intenta auto-detectar el backend (`localhost:7000`, `192.168.100.10:7000`, etc.) y le pega `/kds`.
2. Si no responde ninguno → muestra pantalla de configuración con IP+puerto.
3. Persiste config en `%APPDATA%\Bar Avenida KDS\config.json`.
4. `Ctrl+Shift+S` abre la pantalla de configuración.
5. Build genera `dist/Bar Avenida KDS Setup 1.1.0.exe`.
6. Build 0/0.

## Cambios a hacer

### 1. Reemplazar `BarAvenida.KDS.Desktop/main.js`

Copiar la lógica del Admin (PROD-3 sección 1) con dos diferencias:

- `CONFIG_DIR = path.join(app.getPath('appData'), 'Bar Avenida KDS')`
- Cuando llame a `cargarApp(servidorUrl)`, la URL final debe ser `${servidorUrl}/kds` (no `/admin`).

```javascript
const { app, BrowserWindow, Menu, session, globalShortcut, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')

const CONFIG_DIR  = path.join(app.getPath('appData'), 'Bar Avenida KDS')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')
const RETRY_DELAY = 5000
const RUTA_KDS    = '/kds'

const CANDIDATOS_AUTO = [
  'http://localhost:7000',
  'http://192.168.100.10:7000',
  'http://192.168.1.10:7000',
  'http://192.168.0.10:7000',
]

let config = { servidor: null, version: 1 }
let win

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

function probarServidor(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url)
      const req = http.get({
        host: u.hostname,
        port: u.port,
        path: '/api/auth/test',
        timeout: 2000,
      }, (res) => { resolve(true); res.resume() })
      req.on('error', () => resolve(false))
      req.on('timeout', () => { req.destroy(); resolve(false) })
    } catch {
      resolve(false)
    }
  })
}

async function autoDetectarServidor() {
  for (const url of CANDIDATOS_AUTO) {
    if (await probarServidor(url)) return url
  }
  return null
}

function createWindow() {
  win = new BrowserWindow({
    title: 'Bar Avenida — KDS Barra',
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
  if (config.servidor && await probarServidor(config.servidor)) {
    cargarApp(config.servidor)
    return
  }
  const detectado = await autoDetectarServidor()
  if (detectado) {
    config.servidor = detectado
    guardarConfig()
    cargarApp(detectado)
    return
  }
  win.loadFile(path.join(__dirname, 'config-servidor.html'))
}

function cargarApp(servidorUrl) {
  const url = `${servidorUrl}${RUTA_KDS}`
  win.loadURL(url).catch(() => {})
  win.webContents.removeAllListeners('did-fail-load')
  win.webContents.on('did-fail-load', (_e, _c, _d, urlFallida) => {
    if (urlFallida === url || urlFallida.startsWith(servidorUrl)) {
      setTimeout(() => { if (win) win.loadURL(url).catch(() => {}) }, RETRY_DELAY)
    }
  })
}

ipcMain.handle('probar-servidor', async (_e, url) => probarServidor(url))
ipcMain.handle('guardar-servidor', async (_e, url) => {
  config.servidor = url
  guardarConfig()
  cargarApp(url)
  return true
})
ipcMain.handle('cancelar-config', () => app.quit())

app.whenReady().then(async () => {
  cargarConfig()
  try {
    await session.defaultSession.clearCache()
  } catch {}
  createWindow()
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (win) win.loadFile(path.join(__dirname, 'config-servidor.html'))
  })
  globalShortcut.register('F12', () => {
    if (win) win.webContents.toggleDevTools()
  })
})
app.on('window-all-closed', () => { globalShortcut.unregisterAll(); app.quit() })
app.on('activate', () => { if (win === null) createWindow() })
```

### 2. Crear `BarAvenida.KDS.Desktop/preload.js`

```javascript
const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('baravenida', {
  probarServidor:   (url) => ipcRenderer.invoke('probar-servidor', url),
  guardarServidor:  (url) => ipcRenderer.invoke('guardar-servidor', url),
  cancelarConfig:   ()    => ipcRenderer.invoke('cancelar-config'),
})
```

### 3. Crear `BarAvenida.KDS.Desktop/splash.html`

Copiar el splash del Admin (`F:\BarAvenida\BarAvenida.Desktop\splash.html`) y cambiar texto a "Bar Avenida — KDS Barra".

### 4. Crear `BarAvenida.KDS.Desktop/config-servidor.html`

Copiar de `BarAvenida.Desktop/config-servidor.html` (PROD-3 sección 2). El HTML es idéntico — solo cambia el título a "Bar Avenida — Configurar KDS".

### 5. Modificar `BarAvenida.KDS.Desktop/package.json`

```json
{
  "name": "baravenida-kds-desktop",
  "version": "1.1.0",
  "description": "Bar Avenida — KDS Barra",
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
    "appId": "com.baravenida.kds",
    "productName": "Bar Avenida KDS",
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
      "shortcutName": "Bar Avenida KDS",
      "uninstallDisplayName": "Bar Avenida KDS"
    }
  }
}
```

### 6. Iconos

Si no existe `assets/icon.ico` en `BarAvenida.KDS.Desktop`, copiar el del Admin (`BarAvenida.Desktop/assets/icon.ico`) o usar el mismo. (Eventualmente se puede diferenciar visualmente pero no es crítico.)

### 7. Build

```powershell
cd F:\BarAvenida\BarAvenida.KDS.Desktop
npm install
npm run build
```

## Reglas duras

- 0 errors, 0 warnings.
- NO instalar librerías nuevas.
- NO modificar el código del KDS Vite (`BarAvenida.KDS\`) — solo el wrapper Electron.
- La URL final que carga debe ser `<servidor>/kds`.

## Aceptación

- ✅ Instalar el `.exe` en una PC NUEVA → muestra config si no detecta backend.
- ✅ Auto-detección: prende el backend en localhost → app carga directo.
- ✅ Cambiar IP del backend → `Ctrl+Shift+S` muestra config.
- ✅ KDS muestra las órdenes en tiempo real igual que cuando se accedía desde browser.
- ✅ Build genera `Bar Avenida KDS Setup 1.1.0.exe`.
- ✅ Build 0/0.

## Archivos esperados al cierre

- Modificados: `main.js`, `package.json`
- Nuevos: `preload.js`, `splash.html`, `config-servidor.html`, posiblemente `assets/icon.ico`
- Build: `dist/Bar Avenida KDS Setup 1.1.0.exe`
