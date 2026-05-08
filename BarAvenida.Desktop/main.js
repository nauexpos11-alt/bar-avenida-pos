const { app, BrowserWindow, Menu, session, globalShortcut, ipcMain, shell } = require('electron')
const path = require('path')
const fs   = require('fs')
const http = require('http')

// ──────────────────────────────────────────────────────────
// Configuración persistente
// ──────────────────────────────────────────────────────────
const CONFIG_DIR  = path.join(app.getPath('appData'), 'Bar Avenida')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')
const RETRY_DELAY = 5000

// Candidatos para auto-detección en LAN
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

// Probar si una URL responde dentro de 2 segundos
function probarServidor(url) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url)
      const req = http.get({
        host: u.hostname,
        port: u.port,
        path: '/api/auth/test',
        timeout: 2000,
      }, (res) => {
        resolve(true)
        res.resume()
      })
      req.on('error',   () => resolve(false))
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

// ──────────────────────────────────────────────────────────
// Ventana
// ──────────────────────────────────────────────────────────
function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico')
  win = new BrowserWindow({
    title: 'Bar Avenida — Monitor Admin',
    icon:  fs.existsSync(iconPath) ? iconPath : undefined,
    show:  false,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration:  false,
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
  // 2. Auto-detectar en la LAN
  const detectado = await autoDetectarServidor()
  if (detectado) {
    config.servidor = detectado
    guardarConfig()
    cargarApp(detectado)
    return
  }
  // 3. Mostrar pantalla de configuración manual
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

  // Limpiar TODO el storage en cada arranque para evitar caches viejos del bundle
  // (mismo fix aplicado al KDS — sino se queda con assets viejos despues de un deploy)
  try {
    await session.defaultSession.clearCache()
    await session.defaultSession.clearStorageData({
      storages: ['appcache', 'cookies', 'filesystem', 'indexdb', 'localstorage',
                 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
    })
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

  // Ctrl+Shift+S — abrir pantalla de cambio de servidor
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
