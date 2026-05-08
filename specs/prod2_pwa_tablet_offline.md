# PROD-2 — PWA tablet con offline queue

## Objetivo

Convertir la app `BarAvenida.Tablet` en una **PWA instalable y resistente a fallas de red**. Cuando se cae el WiFi entre la tablet y el backend, las órdenes no se pierden — se encolan localmente en IndexedDB y se sincronizan automáticamente cuando vuelve la conexión.

## Contexto

Hoy la tablet ya tiene los huesos de una PWA: `manifest.json`, `sw.js` con caché network-first, registro del SW en `main.jsx`, meta tags de Apple. Lo que **falta** para producción real:

1. Iconos PNG (192 y 512). Hay un script `public/generar-iconos.py` que los genera. Coronado lo corre antes de empezar.
2. **Offline queue de órdenes** — lo más crítico. Sin esto, una caída de WiFi en medio de una captura tira la orden a la basura.
3. Indicador visual `online/offline` en el header.
4. Página `/offline.html` para fallback.
5. Sync automático al recuperar la red.

## Estado actual (NO romper)

- `BarAvenida.Tablet/public/manifest.json` — listo, no tocar.
- `BarAvenida.Tablet/public/sw.js` — listo, vamos a EXTENDERLO.
- `BarAvenida.Tablet/index.html` — listo, no tocar.
- `BarAvenida.Tablet/src/main.jsx` — registro del SW listo, no tocar.
- `BarAvenida.Tablet/src/api.js` — vamos a envolver `enviarOrden` con la lógica de queue.

## Resultado esperado

1. Iconos `/icon-192.png` y `/icon-512.png` presentes (Coronado los genera con `generar-iconos.py`).
2. Si la tablet está online: `enviarOrden` funciona igual que hoy.
3. Si la tablet está offline al hacer click de "Enviar al KDS": la orden se guarda en IndexedDB, se muestra un toast amarillo "Sin conexión — orden encolada", y la mesa queda en estado "Pendiente de sync".
4. Cuando vuelve la red: se procesan automáticamente todas las órdenes encoladas, en orden FIFO, y aparece un toast "X órdenes sincronizadas".
5. Indicador en el header de la tablet: punto verde "ONLINE" / punto rojo pulsante "SIN CONEXIÓN".
6. Si la tablet está completamente offline al cargar (sin caché), muestra `/offline.html`.
7. Build 0 errors, 0 warnings.

## Cambios a hacer

### 1. Generar iconos (manual, antes de empezar)

Coronado corre desde PowerShell:
```powershell
cd F:\BarAvenida\BarAvenida.Tablet\public
pip install Pillow
python generar-iconos.py
```

Esto genera `icon-192.png` y `icon-512.png` en `public/`.

### 2. Crear `BarAvenida.Tablet/src/lib/offlineQueue.js`

Wrapper sobre IndexedDB para encolar/leer/borrar órdenes pendientes.

```javascript
const DB_NAME = 'baravenida-offline'
const DB_VERSION = 1
const STORE_ORDENES = 'ordenes_pendientes'

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_ORDENES)) {
        const store = db.createObjectStore(STORE_ORDENES, {
          keyPath: 'id',
          autoIncrement: true
        })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('cuentaId', 'cuentaId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function encolarOrden(payload) {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ORDENES, 'readwrite')
    const req = tx.objectStore(STORE_ORDENES).add({
      ...payload,
      timestamp: Date.now(),
      reintentos: 0,
    })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function listarPendientes() {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ORDENES, 'readonly')
    const req = tx.objectStore(STORE_ORDENES)
              .index('timestamp')
              .getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function borrarOrden(id) {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ORDENES, 'readwrite')
    const req = tx.objectStore(STORE_ORDENES).delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function incrementarReintento(id) {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ORDENES, 'readwrite')
    const store = tx.objectStore(STORE_ORDENES)
    const get = store.get(id)
    get.onsuccess = () => {
      const orden = get.result
      if (!orden) return resolve()
      orden.reintentos = (orden.reintentos || 0) + 1
      orden.ultimoError = Date.now()
      const upd = store.put(orden)
      upd.onsuccess = () => resolve()
      upd.onerror = () => reject(upd.error)
    }
    get.onerror = () => reject(get.error)
  })
}

export async function contarPendientes() {
  const lista = await listarPendientes()
  return lista.length
}
```

### 3. Crear `BarAvenida.Tablet/src/lib/syncOfflineQueue.js`

Servicio que intenta flushear la cola cuando hay red.

```javascript
import { listarPendientes, borrarOrden, incrementarReintento } from './offlineQueue'

const MAX_REINTENTOS = 5

export async function sincronizarCola(apiClient, onProgreso) {
  const pendientes = await listarPendientes()
  if (pendientes.length === 0) return { exitosas: 0, fallidas: 0 }

  let exitosas = 0
  let fallidas = 0

  for (const orden of pendientes) {
    if (orden.reintentos >= MAX_REINTENTOS) {
      // Demasiados intentos, descartar
      await borrarOrden(orden.id)
      fallidas++
      continue
    }
    try {
      await apiClient.enviarOrdenDirecto(orden.token, orden.payload)
      await borrarOrden(orden.id)
      exitosas++
      onProgreso?.({ exitosas, fallidas, total: pendientes.length })
    } catch (e) {
      await incrementarReintento(orden.id)
      fallidas++
    }
  }

  return { exitosas, fallidas }
}
```

### 4. Modificar `BarAvenida.Tablet/src/api.js`

Agregar al final del archivo:

```javascript
import { encolarOrden } from './lib/offlineQueue'

// Wrapper que encola si no hay red
async function enviarOrdenConOffline(token, payload) {
  if (!navigator.onLine) {
    const id = await encolarOrden({ token, payload })
    return { encolada: true, idLocal: id }
  }
  try {
    return await enviarOrdenDirecto(token, payload)
  } catch (e) {
    // Si falló la red en medio del envío, encolar también
    if (e.message?.includes('Failed to fetch') ||
        e.message?.includes('NetworkError')) {
      const id = await encolarOrden({ token, payload })
      return { encolada: true, idLocal: id, error: e.message }
    }
    throw e
  }
}

// Renombrar el método actual `enviarOrden` a `enviarOrdenDirecto` y exponer
// el wrapper como `enviarOrden`. Así el código existente no cambia.
```

> **Importante:** revisar el método actual `enviarOrden` en `api.js` y separar:
> - `enviarOrdenDirecto(token, payload)` = la llamada `fetch` directa (lo que está hoy).
> - `enviarOrden(token, payload)` = el wrapper que decide encolar o enviar directo.

### 5. Crear `BarAvenida.Tablet/src/hooks/useEstadoConexion.js`

```javascript
import { useState, useEffect } from 'react'
import { contarPendientes } from '../lib/offlineQueue'

export function useEstadoConexion() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pendientes, setPendientes] = useState(0)

  useEffect(() => {
    const onOnline  = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    let activo = true
    const tick = async () => {
      const n = await contarPendientes()
      if (activo) setPendientes(n)
    }
    tick()
    const interval = setInterval(tick, 3000)
    return () => { activo = false; clearInterval(interval) }
  }, [])

  return { online, pendientes }
}
```

### 6. Crear `BarAvenida.Tablet/src/components/IndicadorConexion.jsx` + CSS

Componente pequeño que va en el header de la tablet:

```jsx
import { useEstadoConexion } from '../hooks/useEstadoConexion'
import './IndicadorConexion.css'

export default function IndicadorConexion() {
  const { online, pendientes } = useEstadoConexion()

  if (online && pendientes === 0) {
    return (
      <div className="ic-wrap ic-online">
        <span className="ic-dot" />
        <span className="ic-txt">ONLINE</span>
      </div>
    )
  }
  if (!online) {
    return (
      <div className="ic-wrap ic-offline">
        <span className="ic-dot ic-pulse" />
        <span className="ic-txt">SIN CONEXION</span>
        {pendientes > 0 && <span className="ic-badge">{pendientes}</span>}
      </div>
    )
  }
  // Online pero hay cola por sincronizar
  return (
    <div className="ic-wrap ic-syncing">
      <span className="ic-dot ic-pulse" />
      <span className="ic-txt">SINCRONIZANDO {pendientes}</span>
    </div>
  )
}
```

CSS con dorado/rojo/verde manteniendo el estilo del bar.

### 7. Integrar en `BarAvenida.Tablet/src/App.jsx`

- Importar el hook `useEstadoConexion`.
- Importar `sincronizarCola` y dispararla en un `useEffect` cuando `online === true`.
- Mostrar `<IndicadorConexion />` en el header (junto al nombre de la mesera).
- Cuando una orden se encola, mostrar toast amarillo "Sin conexión — orden encolada localmente".
- Cuando se sincroniza, toast verde "X órdenes sincronizadas".

### 8. Crear `BarAvenida.Tablet/public/offline.html`

Fallback para cuando no hay caché y no hay red:

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Bar Avenida — Sin conexion</title>
  <meta name="theme-color" content="#0a0a0a">
  <style>
    body {
      background: #0a0a0a;
      color: #f0c842;
      font-family: system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      text-align: center;
    }
    .box { padding: 2rem; }
    h1 { font-size: 2rem; margin: 0 0 1rem; }
    p { color: #ccc; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Sin conexion</h1>
    <p>Conectate al WiFi del bar y refresca.</p>
  </div>
</body>
</html>
```

### 9. Modificar `BarAvenida.Tablet/public/sw.js`

Agregar `/offline.html` al SHELL pre-cacheado y como fallback en el handler `fetch`:

```javascript
const SHELL = [
  '/',
  '/index.html',
  '/offline.html',
]

// Dentro del handler fetch, en el .catch():
.catch(() => caches.match(request).then(r => r || caches.match('/offline.html')))
```

### 10. Build y validar

```powershell
cd F:\BarAvenida\BarAvenida.Tablet
npm run build
```

Build debe quedar 0/0.

## Reglas duras

- 0 errors, 0 warnings.
- NO instalar librerías nuevas (IndexedDB es nativo del browser, no requiere paquetes).
- NO romper el flujo actual cuando hay red.
- Mantener el tema dorado/negro.
- El código existente que llama `api.enviarOrden(token, payload)` debe seguir funcionando sin cambios.
- Nombres de variables y comentarios en español.

## Aceptación

- ✅ La tablet se instala como app desde Chrome móvil ("Agregar a pantalla de inicio").
- ✅ El icono que aparece es el dorado con "BA" / "AVENIDA".
- ✅ Modo avión activado en la tablet → captura una orden y la "envía" → toast amarillo y la orden queda encolada.
- ✅ Quitar modo avión → en menos de 5s aparece toast verde "1 orden sincronizada" y la orden está en el backend.
- ✅ Indicador del header cambia de ONLINE → SIN CONEXION → SINCRONIZANDO → ONLINE.
- ✅ Build 0/0.

## Archivos esperados al cierre

- Modificados: `src/api.js`, `src/App.jsx`, `public/sw.js`
- Nuevos:
  - `src/lib/offlineQueue.js`
  - `src/lib/syncOfflineQueue.js`
  - `src/hooks/useEstadoConexion.js`
  - `src/components/IndicadorConexion.jsx`
  - `src/components/IndicadorConexion.css`
  - `public/offline.html`
- Generados manualmente por Coronado: `public/icon-192.png`, `public/icon-512.png`
