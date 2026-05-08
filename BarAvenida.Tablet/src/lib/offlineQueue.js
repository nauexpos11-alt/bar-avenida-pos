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
