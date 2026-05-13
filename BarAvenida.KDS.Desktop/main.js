const { app, BrowserWindow, Menu, session, globalShortcut, ipcMain } = require('electron')
const path = require('path')
const fs   = require('fs')
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

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.ico')
  win = new BrowserWindow({
    title: 'Bar Avenida — KDS Barra',
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
  // Cache-busting: timestamp para forzar index.html fresco cada arranque
  const cb = Date.now()
  const url = `${servidorUrl}${RUTA_KDS}?_=${cb}`
  win.loadURL(url, { extraHeaders: 'pragma: no-cache\ncache-control: no-cache, no-store, must-revalidate\n' }).catch(() => {})
  win.webContents.removeAllListeners('did-fail-load')
  win.webContents.on('did-fail-load', (_e, _c, _d, urlFallida) => {
    if (urlFallida.startsWith(servidorUrl)) {
      setTimeout(() => {
        if (win) {
          const cb2 = Date.now()
          win.loadURL(`${servidorUrl}${RUTA_KDS}?_=${cb2}`, { extraHeaders: 'pragma: no-cache\n' }).catch(() => {})
        }
      }, RETRY_DELAY)
    }
  })
}

ipcMain.handle('probar-servidor',  async (_e, url) => probarServidor(url))
ipcMain.handle('guardar-servidor', async (_e, url) => {
  config.servidor = url
  guardarConfig()
  cargarApp(url)
  return true
})
ipcMain.handle('cancelar-config', () => app.quit())

app.whenReady().then(async () => {
  cargarConfig()
  // Limpiar TODO el storage en cada arranque (cache + cookies + indexedDB + service workers)
  try {
    await session.defaultSession.clearCache()
    await session.defaultSession.clearStorageData({
      storages: ['appcache', 'cookies', 'filesystem', 'indexdb', 'localstorage',
                 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
    })
  } catch (e) { console.error('clearStorageData fallo:', e.message) }
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
