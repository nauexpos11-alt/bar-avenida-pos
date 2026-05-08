import { encolarOrden } from './lib/offlineQueue'

// Resolver URL del backend en este orden:
// 1. VITE_API_URL si está bien formada (con host)
// 2. window.location.origin (mismo origen donde se sirve la app)
// Esto evita problemas cuando el .env tiene valores vacíos o mal escritos.
function resolverApiUrl() {
  const fromEnv = import.meta.env.VITE_API_URL
  if (fromEnv && /^https?:\/\/.+/.test(fromEnv)) return fromEnv.replace(/\/+$/, '')
  if (typeof window !== 'undefined' && window.location?.origin)
    return window.location.origin
  return 'http://localhost:7000'
}
const API = resolverApiUrl()

async function req(path, opts = {}, token = null) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const resp = await fetch(`${API}${path}`, {
    ...opts,
    headers: { ...headers, ...opts.headers },
  })
  if (!resp.ok) {
    let msg = `HTTP ${resp.status}`
    try { const j = await resp.json(); msg = j.message || j.mensaje || j.title || msg } catch {}
    const err = new Error(msg)
    err.status = resp.status
    throw err
  }
  const text = await resp.text()
  return text ? JSON.parse(text) : null
}

// Llamada directa al backend sin lógica offline
function _enviarOrdenDirecto(token, data) {
  return req('/api/Cuentas/enviar-orden', { method: 'POST', body: JSON.stringify(data) }, token)
}

// Wrapper: si no hay red encola en IndexedDB y dispara evento para el toast
async function _enviarOrdenConOffline(token, payload) {
  if (!navigator.onLine) {
    const id = await encolarOrden({ token, payload })
    window.dispatchEvent(new CustomEvent('orden-encolada', { detail: { id } }))
    return { encolada: true, idLocal: id }
  }
  try {
    return await _enviarOrdenDirecto(token, payload)
  } catch (e) {
    if (e.message?.includes('Failed to fetch') || e.message?.includes('NetworkError')) {
      const id = await encolarOrden({ token, payload })
      window.dispatchEvent(new CustomEvent('orden-encolada', { detail: { id } }))
      return { encolada: true, idLocal: id, error: e.message }
    }
    throw e
  }
}

export const API_URL = API

export const api = {
  login: (codigo, pin) =>
    req('/api/Auth/login', { method: 'POST', body: JSON.stringify({ codigo, pin }) }),

  getMesas: (t) => req('/api/Mesas', {}, t),
  getMesa:  (id, t) => req(`/api/Mesas/${id}`, {}, t),

  getCuenta:          (id, t) => req(`/api/Cuentas/${id}`, {}, t),
  getCuentasAbiertas: (t)     => req('/api/Cuentas/abiertas', {}, t),

  abrirCuenta: (t, data) =>
    req('/api/Cuentas/abrir', { method: 'POST', body: JSON.stringify(data) }, t),

  enviarOrdenDirecto: (t, data) => _enviarOrdenDirecto(t, data),
  enviarOrden: (t, data) => _enviarOrdenConOffline(t, data),

  cobrar: (t, data) =>
    req('/api/Cuentas/cobrar', { method: 'POST', body: JSON.stringify(data) }, t),

  solicitarCobro: async (token, cuentaId) => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
    const resp = await fetch(`${API}/api/Cuentas/${cuentaId}/solicitar-cobro`, {
      method: 'POST',
      headers,
    })
    if (resp.ok) {
      const text = await resp.text()
      return text ? JSON.parse(text) : null
    }
    const err = new Error(`HTTP ${resp.status}`)
    err.status = resp.status
    try {
      const j = await resp.json()
      err.message = j.mensaje || j.message || j.title || err.message
    } catch {}
    throw err
  },

  cobrarCuenta: async (token, cuentaId, dto) => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
    const resp = await fetch(`${API}/api/Cuentas/${cuentaId}/cobrar`, {
      method: 'POST',
      headers,
      body: JSON.stringify(dto),
    })
    if (resp.ok) {
      const text = await resp.text()
      return text ? JSON.parse(text) : null
    }
    const err = new Error(`HTTP ${resp.status}`)
    err.status = resp.status
    try {
      const j = await resp.json()
      err.message = j.mensaje || j.message || j.title || err.message
    } catch {}
    throw err
  },

  cancelarCuenta: (id, t, dto = null) =>
    req(`/api/Cuentas/${id}/cancelar`,
      { method: 'POST', body: dto ? JSON.stringify(dto) : undefined },
      t),

  validarPinAdmin: (t, pin) =>
    req('/api/Auth/validar-pin-admin', { method: 'POST', body: JSON.stringify({ pin }) }, t),

  solicitarCancelacionProductos: (t, cuentaId, dto) =>
    req(`/api/Cuentas/${cuentaId}/solicitar-cancelacion-productos`,
      { method: 'POST', body: JSON.stringify(dto) }, t),

  solicitarCancelacionCuenta: (t, cuentaId, dto) =>
    req(`/api/Cuentas/${cuentaId}/solicitar-cancelacion-cuenta`,
      { method: 'POST', body: JSON.stringify(dto) }, t),

  getCategorias:              (t)      => req('/api/Categorias', {}, t),
  getProductosPorCategoria:   (id, t)  => req(`/api/Categorias/${id}/productos`, {}, t),

  getSugerencias: (t, productoId) => req(`/api/Productos/${productoId}/sugerencias`, {}, t),

  abrirCuentaRapida: (t, dto) =>
    req('/api/Cuentas/abrir-rapido', { method: 'POST', body: JSON.stringify(dto) }, t),
  getCuentasRapidasAbiertas: (t) =>
    req('/api/Cuentas/rapidas-abiertas', {}, t),
}
