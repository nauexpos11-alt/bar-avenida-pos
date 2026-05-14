// Resolver URL del backend de forma robusta:
// 1. VITE_API_URL si está bien formada (con host real, no solo "http://")
// 2. window.location.origin (mismo origen donde se sirve la app — caso normal en producción)
// 3. Fallback a localhost solo en dev/SSR
function resolverApiUrl() {
  const fromEnv = import.meta.env.VITE_API_URL
  if (fromEnv && /^https?:\/\/.+/.test(fromEnv)) return fromEnv.replace(/\/+$/, '')
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return 'http://localhost:7000'
}
export const API_URL = resolverApiUrl()

// ──────────────────────────────────────────────────────────────────
// JWT auto-refresh
//
// El App llama apiSetupRefresh(token, onNuevoToken) tras login y
// tras restoreFromLocalStorage.  Cuando un request retorna 401 con
// señal de "token expirado", el módulo intenta POST /api/Auth/refresh
// con el token actual.  Si funciona, actualiza tokenActual y notifica
// al App; luego re-ejecuta el request original con el nuevo token.
// Las refresh-en-paralelo se deduplican con _refreshPromise.
// ──────────────────────────────────────────────────────────────────
let _tokenActual       = null
let _onNuevoToken      = null
let _refreshPromise    = null

export function apiSetupRefresh(token, onNuevoToken) {
  _tokenActual  = token
  _onNuevoToken = typeof onNuevoToken === 'function' ? onNuevoToken : null
}

export function apiClearRefresh() {
  _tokenActual    = null
  _onNuevoToken   = null
  _refreshPromise = null
}

function _esTokenExpirado(resp, body) {
  if (resp.status !== 401) return false
  const wwwAuth = resp.headers?.get?.('WWW-Authenticate') || ''
  if (/expired|invalid_token/i.test(wwwAuth)) return true
  if (body && typeof body === 'string' && /expir/i.test(body))    return true
  return false
}

async function _hacerRefresh(tokenViejo) {
  if (_refreshPromise) return _refreshPromise
  _refreshPromise = (async () => {
    try {
      const resp = await fetch(`${API_URL}/api/Auth/refresh`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenViejo}`, 'Content-Type': 'application/json' },
      })
      if (!resp.ok) throw new Error(`refresh HTTP ${resp.status}`)
      const text = await resp.text()
      const data = text ? JSON.parse(text) : null
      const nuevo = data?.token
      if (!nuevo) throw new Error('refresh sin token')
      _tokenActual = nuevo
      try { _onNuevoToken?.(nuevo) } catch {}
      return nuevo
    } catch (e) {
      try { _onNuevoToken?.(null) } catch {}
      throw e
    } finally {
      // Liberamos la promesa después de un tick para que requests
      // que entren mientras refresh estaba en curso reusen el resultado
      setTimeout(() => { _refreshPromise = null }, 0)
    }
  })()
  return _refreshPromise
}

async function req(path, opts = {}, token = null, _esRetry = false) {
  // Si el caller pasó un token explícito, usamos ése; si no, _tokenActual
  const effectiveToken = token != null ? token : _tokenActual
  const headers = { 'Content-Type': 'application/json' }
  if (effectiveToken) headers['Authorization'] = `Bearer ${effectiveToken}`

  const resp = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { ...headers, ...opts.headers },
  })

  if (!resp.ok) {
    // Try parse body once
    let bodyText = ''
    let parsed   = null
    try { bodyText = await resp.text() } catch {}
    if (bodyText) { try { parsed = JSON.parse(bodyText) } catch {} }

    // Auto-refresh si 401 + token actual + no es retry
    if (
      !_esRetry &&
      effectiveToken &&
      _onNuevoToken &&
      _esTokenExpirado(resp, bodyText)
    ) {
      try {
        const nuevo = await _hacerRefresh(effectiveToken)
        // Reintentar con el nuevo token
        return await req(path, opts, nuevo, true)
      } catch {
        // refresh falló, cae al throw normal
      }
    }

    let msg = `HTTP ${resp.status}`
    if (parsed) msg = parsed.mensaje || parsed.message || parsed.title || msg
    else if (bodyText) msg = bodyText.slice(0, 200) || msg
    const err = new Error(msg)
    err.status = resp.status
    throw err
  }

  const text = await resp.text()
  return text ? JSON.parse(text) : null
}

export const api = {
  // Auth
  login: (codigo, pin) =>
    req('/api/Auth/login', { method: 'POST', body: JSON.stringify({ codigo, pin }) }),

  // Auth — refresh manual (apiSetupRefresh lo usa internamente, pero se
  // expone por si el App quiere disparar uno)
  authRefresh: (t) => req('/api/Auth/refresh', { method: 'POST' }, t),

  // Mesas
  getMesas: (t) => req('/api/Mesas', {}, t),

  // Cuentas
  getCuenta:          (id, t) => req(`/api/Cuentas/${id}`, {}, t),
  getCuentasAbiertas: (t)     => req('/api/Cuentas/abiertas', {}, t),
  cobrar: (t, data) =>
    req('/api/Cuentas/cobrar', { method: 'POST', body: JSON.stringify(data) }, t),

  // Usuarios
  getUsuarios:   (t)         => req('/api/Usuarios', {}, t),
  createUsuario: (t, data)   => req('/api/Usuarios', { method: 'POST', body: JSON.stringify(data) }, t),
  updateUsuario: (t, id, data) => req(`/api/Usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) }, t),

  // Reportes
  resumenMovil:          (t) => req('/api/Reportes/resumen-movil', {}, t),
  productosMasVendidos:  (t) => req('/api/Reportes/productos-mas-vendidos', {}, t),
  ventasPorCategoria:    (t) => req('/api/Reportes/ventas-categoria', {}, t),
  ventasPorMesera:       (t) => req('/api/Reportes/ventas-mesera', {}, t),
  ventasDelDia:          (t) => req('/api/Reportes/ventas-dia', {}, t),

  // Admin — Productos
  adminGetProductos: (t, { categoriaId, activo, busqueda } = {}) => {
    const p = new URLSearchParams()
    if (categoriaId != null) p.set('categoriaId', categoriaId)
    if (activo     != null) p.set('activo', activo)
    if (busqueda        )   p.set('busqueda', busqueda)
    const qs = p.toString()
    return req(`/api/admin/productos${qs ? '?' + qs : ''}`, {}, t)
  },
  adminCrearProducto:      (t, dto)     => req('/api/admin/productos', { method: 'POST', body: JSON.stringify(dto) }, t),
  adminActualizarProducto: (t, id, dto) => req(`/api/admin/productos/${id}`, { method: 'PUT',   body: JSON.stringify(dto) }, t),
  // Acciones destructivas: el body lleva { pin } para que el backend (PinConfirmacionDto) valide
  adminDesactivarProducto: (t, id, pin) =>
    req(`/api/admin/productos/${id}`, { method: 'DELETE', body: JSON.stringify({ pin }) }, t),
  adminActivarProducto:    (t, id)      => req(`/api/admin/productos/${id}/activar`, { method: 'PATCH' }, t),

  // Admin — Categorías
  adminGetCategorias:      (t)          => req('/api/admin/categorias', {}, t),
  adminCrearCategoria:     (t, dto)     => req('/api/admin/categorias', { method: 'POST', body: JSON.stringify(dto) }, t),
  adminActualizarCategoria:(t, id, dto) => req(`/api/admin/categorias/${id}`, { method: 'PUT',    body: JSON.stringify(dto) }, t),
  adminEliminarCategoria:  (t, id, pin) =>
    req(`/api/admin/categorias/${id}`, { method: 'DELETE', body: JSON.stringify({ pin }) }, t),

  // Admin — Configuración general
  adminGetConfiguracion:        (t)          => req('/api/admin/configuracion-ticket', {}, t),
  // Update destructivo: requiere PIN admin (modifica config global)
  adminUpdateConfiguracion:     (t, dto, pin) =>
    req('/api/admin/configuracion-ticket', { method: 'PUT', body: JSON.stringify({ ...dto, pin }) }, t),
  adminImprimirPrueba:          (t)          => req('/api/admin/imprimir-prueba', { method: 'POST' }, t),
  adminGetImpresorasDisponibles:(t)          => req('/api/admin/impresoras-disponibles', {}, t),
  adminGetTicketsSimulados:     (t, limit = 10) => req(`/api/admin/tickets-simulados/recientes?limit=${limit}`, {}, t),
  adminAbrirCajon:              (t, dto)     => req('/api/admin/abrir-cajon', { method: 'POST', body: JSON.stringify(dto) }, t),
  adminProbarImpresora:         (t)          => req('/api/admin/probar-impresora', { method: 'POST' }, t),
  adminProbarCajon:             (t)          => req('/api/admin/probar-cajon',     { method: 'POST' }, t),
  adminGetResumenMeserasTurno:  (t)          => req('/api/admin/resumen-meseras-turno', {}, t),
  adminGetRegistrosCajon:       (t, { desde, hasta } = {}) => {
    const p = new URLSearchParams()
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    const qs = p.toString()
    return req(`/api/admin/registros-cajon${qs ? '?' + qs : ''}`, {}, t)
  },

  // Admin — Caja / Turnos / Cortes / Retiros
  adminGetTurnoActual:  (t)        => req('/api/Caja/turno-actual', {}, t),
  adminGetSugerenciaFondo: (t)     => req('/api/Caja/sugerencia-fondo', {}, t),
  adminAbrirTurno:      (t, dto)   => req('/api/Caja/abrir-turno',  { method: 'POST', body: JSON.stringify(dto) }, t),
  adminCerrarTurno:     (t, dto)   => req('/api/Caja/cerrar-turno', { method: 'POST', body: JSON.stringify(dto) }, t),
  adminGetCorteX:       (t)        => req('/api/Caja/corte-x', {}, t),
  adminPostCorteZ:      (t, dto)   => req('/api/Caja/corte-z', { method: 'POST', body: JSON.stringify(dto) }, t),
  adminGetCortes:       (t, { turnoId, desde, hasta } = {}) => {
    const p = new URLSearchParams()
    if (turnoId != null) p.set('turnoId', turnoId)
    if (desde)           p.set('desde',   desde)
    if (hasta)           p.set('hasta',   hasta)
    const qs = p.toString()
    return req(`/api/Caja/cortes${qs ? '?' + qs : ''}`, {}, t)
  },
  adminPostRetiro:      (t, dto)      => req('/api/Caja/retiro', { method: 'POST', body: JSON.stringify(dto) }, t),
  adminGetRetiros:      (t, turnoId)  => req(`/api/Caja/retiros/${turnoId}`, {}, t),
  adminImprimirCorte:   (t, corteId, tipo) =>
    req(`/api/Caja/imprimir-corte/${corteId}`, { method: 'POST', body: JSON.stringify({ tipo }) }, t),
  adminEliminarTurno:   (t, turnoId, pin) =>
    req(`/api/Caja/turnos/${turnoId}`, { method: 'DELETE', body: JSON.stringify({ pin }) }, t),
  adminResetTotal:      (t, pin, confirmacion) =>
    req('/api/Caja/reset-total', { method: 'POST', body: JSON.stringify({ pin, confirmacion }) }, t),

  // Auth — Cambiar PIN
  cambiarPin:      (t, dto)              => req('/api/Auth/cambiar-pin',       { method: 'POST', body: JSON.stringify(dto) }, t),
  cambiarPinAdmin: (t, dto)              => req('/api/Auth/cambiar-pin-admin', { method: 'POST', body: JSON.stringify(dto) }, t),

  // Admin — Áreas
  adminGetAreas:    (t)          => req('/api/admin/areas', {}, t),
  adminCreateArea:  (t, dto)     => req('/api/admin/areas', { method: 'POST', body: JSON.stringify(dto) }, t),
  adminUpdateArea:  (t, id, dto) => req(`/api/admin/areas/${id}`, { method: 'PUT', body: JSON.stringify(dto) }, t),
  adminDeleteArea:  (t, id, pin) =>
    req(`/api/admin/areas/${id}`, { method: 'DELETE', body: JSON.stringify({ pin }) }, t),

  // Admin — Mesas
  adminGetMesas:    (t, areaId)  => {
    const qs = areaId ? `?areaId=${areaId}` : ''
    return req(`/api/admin/mesas${qs}`, {}, t)
  },
  adminCreateMesa:  (t, dto)     => req('/api/admin/mesas', { method: 'POST', body: JSON.stringify(dto) }, t),
  adminUpdateMesa:  (t, id, dto) => req(`/api/admin/mesas/${id}`, { method: 'PUT', body: JSON.stringify(dto) }, t),
  adminDeleteMesa:  (t, id)      => req(`/api/admin/mesas/${id}`, { method: 'DELETE' }, t),

  // Admin — Meseros / Barman
  adminGetMeseros:    (t)          => req('/api/admin/meseros', {}, t),
  adminCreateMesero:  (t, dto)     => req('/api/admin/meseros', { method: 'POST', body: JSON.stringify(dto) }, t),
  adminUpdateMesero:  (t, id, dto) => req(`/api/admin/meseros/${id}`, { method: 'PUT', body: JSON.stringify(dto) }, t),
  adminDeleteMesero:        (t, id) => req(`/api/admin/meseros/${id}`,           { method: 'DELETE' }, t),
  adminDeleteMeseroPerm:    (t, id) => req(`/api/admin/meseros/${id}/permanent`, { method: 'DELETE' }, t),
  // Eliminacion definitiva forzada — requiere PIN admin. Endpoint: DELETE /api/admin/usuarios/{id}
  adminEliminarUsuario:     (t, id, pin) => req(`/api/admin/usuarios/${id}`, { method: 'DELETE', body: JSON.stringify({ pin }) }, t),
  adminSeedFormasPago:      (t)     => req('/api/admin/formas-pago/seed',        { method: 'POST' }, t),

  // Admin — Formas de pago
  adminGetFormasPago:    (t)          => req('/api/admin/formas-pago', {}, t),
  adminCreateFormaPago:  (t, dto)     => req('/api/admin/formas-pago', { method: 'POST', body: JSON.stringify(dto) }, t),
  adminUpdateFormaPago:  (t, id, dto) => req(`/api/admin/formas-pago/${id}`, { method: 'PUT', body: JSON.stringify(dto) }, t),
  adminDeleteFormaPago:  (t, id)      => req(`/api/admin/formas-pago/${id}`, { method: 'DELETE' }, t),

  // Admin — Folio / Secuencia
  adminGetFolio:    (t)      => req('/api/admin/folio', {}, t),
  adminUpdateFolio: (t, dto) => req('/api/admin/folio', { method: 'PUT', body: JSON.stringify(dto) }, t),

  // Admin — Reportes
  adminGetReporteVentas: (t, { desde, hasta } = {}) => {
    const p = new URLSearchParams()
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    return req(`/api/Reportes/ventas-resumen?${p}`, {}, t)
  },
  adminGetReporteProductos: (t, { desde, hasta, limit = 20 } = {}) => {
    const p = new URLSearchParams()
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    p.set('limit', limit)
    return req(`/api/Reportes/productos-top?${p}`, {}, t)
  },
  adminGetReporteMeseros: (t, { desde, hasta } = {}) => {
    const p = new URLSearchParams()
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    return req(`/api/Reportes/meseros?${p}`, {}, t)
  },
  adminGetReporteCategorias: (t, { desde, hasta } = {}) => {
    const p = new URLSearchParams()
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    return req(`/api/Reportes/categorias?${p}`, {}, t)
  },
  adminGetReporteVentasHora: (t, { desde, hasta } = {}) => {
    const p = new URLSearchParams()
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    return req(`/api/Reportes/ventas-por-hora?${p}`, {}, t)
  },
  adminGetReporteMetodosPago: (t, { desde, hasta } = {}) => {
    const p = new URLSearchParams()
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    return req(`/api/Reportes/metodos-pago?${p}`, {}, t)
  },
  adminGetProductosVendidosHoy: (t) => req('/api/Reportes/productos-vendidos-hoy', {}, t),
  adminExportarCsv: async (t, tipo, desde, hasta) => {
    const p = new URLSearchParams({ tipo })
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    const resp = await fetch(`${API_URL}/api/Reportes/exportar-csv?${p}`, {
      headers: { Authorization: `Bearer ${t}` },
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const blob = await resp.blob()
    const cd   = resp.headers.get('content-disposition') ?? ''
    const m    = cd.match(/filename[^;=\n]*=(['"]?)([^\n'"]+)\1/)
    const name = m ? m[2] : `reporte-${tipo}-${desde}.csv`
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = name; a.click()
    URL.revokeObjectURL(url)
  },

  // Admin — Cuentas por cobrar (flujo de cobro)
  adminGetCuentasPorCobrar: (t) => req('/api/Cuentas/por-cobrar', {}, t),

  // Admin — Barra Rápida (pos-barra)
  adminGetCuentasRapidasAbiertas: (t) => req('/api/Cuentas/rapidas-abiertas', {}, t),
  adminAbrirCuentaRapida: (t, dto) => req('/api/Cuentas/abrir-rapido', { method: 'POST', body: JSON.stringify(dto) }, t),
  adminEnviarOrden: (t, dto) => req('/api/Cuentas/enviar-orden', { method: 'POST', body: JSON.stringify(dto) }, t),
  adminCobroRapidoBarra: (t, dto) => req('/api/Cuentas/cobro-rapido-barra', { method: 'POST', body: JSON.stringify(dto) }, t),

  adminCobrarCuenta: async (token, cuentaId, dto) => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
    const resp = await fetch(`${API_URL}/api/Cuentas/${cuentaId}/cobrar`, {
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

  // Admin — Consulta de cuentas
  adminGetCuentas: (t, { desde, hasta, estado, folio } = {}) => {
    const p = new URLSearchParams()
    if (desde)           p.set('desde', desde)
    if (hasta)           p.set('hasta', hasta)
    if (estado)          p.set('estado', estado)
    if (folio != null)   p.set('folio', folio)
    const qs = p.toString()
    return req(`/api/Cuentas${qs ? '?' + qs : ''}`, {}, t)
  },
  getCuentasFiltradas: (t, { desde, hasta, estado, folio, meseraId } = {}) => {
    const p = new URLSearchParams()
    if (desde)              p.set('desde', desde)
    if (hasta)              p.set('hasta', hasta)
    if (estado)             p.set('estado', estado)
    if (folio != null)      p.set('folio', folio)
    if (meseraId != null)   p.set('meseraId', meseraId)
    const qs = p.toString()
    return req(`/api/Cuentas${qs ? '?' + qs : ''}`, {}, t)
  },
  // Cancelar cuenta cobrada — ahora requiere PIN admin + motivo (mín 10 chars)
  cancelarCobrada: (t, id, motivo, pin) =>
    req(`/api/Cuentas/${id}/cancelar-cobrada`, { method: 'POST', body: JSON.stringify({ motivo, pin }) }, t),
  reabrirCuenta: (t, id) =>
    req(`/api/Cuentas/${id}/reabrir`, { method: 'POST' }, t),
  adminGetCuentaDetalle:          (t, id)      => req(`/api/Cuentas/${id}`, {}, t),
  adminReimprimirCuenta:          (t, id)      => req(`/api/Cuentas/${id}/reimprimir`, { method: 'POST' }, t),
  adminCancelarCuenta:            (t, id, dto) => req(`/api/Cuentas/${id}/cancelar`, { method: 'POST', body: JSON.stringify(dto) }, t),
  adminGetTicketsSimuladosCuenta: (t, id)      => req(`/api/Cuentas/${id}/tickets-simulados`, {}, t),

  // Admin — Incidentes de caja (PROMPT C.3)
  adminGetIncidentes: (t, { desde, hasta, page = 1, pageSize = 50 } = {}) => {
    const p = new URLSearchParams()
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    p.set('page',     page)
    p.set('pageSize', pageSize)
    return req(`/api/Caja/incidentes?${p}`, {}, t)
  },

  // Admin — Reglas Cross-sell (PROMPT G)
  adminGetReglasCrossSell:   (t)          => req('/api/admin/reglas-crosssell', {}, t),
  adminCrearReglaCrossSell:  (t, dto)     => req('/api/admin/reglas-crosssell', { method: 'POST', body: JSON.stringify(dto) }, t),
  adminUpdateReglaCrossSell: (t, id, dto) => req(`/api/admin/reglas-crosssell/${id}`, { method: 'PUT', body: JSON.stringify(dto) }, t),
  adminDeleteReglaCrossSell: (t, id)      => req(`/api/admin/reglas-crosssell/${id}`, { method: 'DELETE' }, t),

  // Admin — Monitor de Ventas (B3)
  adminGetMonitorVentas: (t, periodo = 'hoy') =>
    req(`/api/admin/monitor-ventas?periodo=${periodo}`, {}, t),

  // Admin — Dashboard Vivo (PROMPT D)
  adminGetDashboardLive: (t) => req('/api/admin/dashboard/live', {}, t),

  // Admin — Informe del dia (PROMPT E)
  adminGetInformeDia: (t, fecha) => {
    const qs = fecha ? `?fecha=${fecha}` : ''
    return req(`/api/admin/reportes/informe-dia${qs}`, {}, t)
  },

  // Admin — Analisis IA del informe (PROMPT IA.1)
  adminAnalisisIa: (t, fecha) => {
    const qs = fecha ? `?fecha=${fecha}` : ''
    return req(`/api/admin/reportes/analisis-ia${qs}`, { method: 'POST' }, t)
  },

  // Admin — Solicitudes de cancelación (PROMPT B3)
  getSolicitudesPendientes: (t)     => req('/api/SolicitudesCancelacion/pendientes', {}, t),
  aprobarSolicitud:         (t, id) => req(`/api/SolicitudesCancelacion/${id}/aprobar`,  { method: 'POST' }, t),
  rechazarSolicitud:        (t, id) => req(`/api/SolicitudesCancelacion/${id}/rechazar`, { method: 'POST' }, t),
  // Aliases con PIN (para MesaOperableScreen — backend identifica al admin por JWT,
  // el campo pin del body se ignora pero se envía por compatibilidad de la UI)
  adminAprobarSolicitud:    (t, id, pin) => req(`/api/SolicitudesCancelacion/${id}/aprobar`,  { method: 'POST', body: JSON.stringify({ pin }) }, t),
  adminRechazarSolicitud:   (t, id, pin) => req(`/api/SolicitudesCancelacion/${id}/rechazar`, { method: 'POST', body: JSON.stringify({ pin }) }, t),

  // Centro de Operación (B1)
  adminGetCuentasActivas: (t) => req('/api/Cuentas/activas', {}, t),
  editarInfoCuenta: (t, id, dto) =>
    req(`/api/Cuentas/${id}/editar-info`, { method: 'POST', body: JSON.stringify(dto) }, t),
  // Alias para MesaOperableScreen — el endpoint real es POST /editar-info
  adminEditarInfoCuenta: (t, id, dto) =>
    req(`/api/Cuentas/${id}/editar-info`, { method: 'POST', body: JSON.stringify(dto) }, t),
  moverAreaCuenta: (t, id, areaNueva) =>
    req(`/api/Cuentas/${id}/mover-area`, { method: 'POST', body: JSON.stringify({ areaNueva }) }, t),

  // Abrir cuenta para una mesa (para MesaOperableScreen — admin abre la cuenta como "mesera")
  abrirCuenta: (t, dto) => req('/api/Cuentas/abrir', { method: 'POST', body: JSON.stringify(dto) }, t),

  // ────────────────────────────────────────────────────────────────
  // Admin — Auditoría (v1.9.0)
  // ────────────────────────────────────────────────────────────────
  adminGetAuditoria: (t, { desde, hasta, categoria, tipo, usuarioId, page = 1, pageSize = 50 } = {}) => {
    const p = new URLSearchParams()
    if (desde)               p.set('desde', desde)
    if (hasta)               p.set('hasta', hasta)
    if (categoria)           p.set('categoria', categoria)
    if (tipo)                p.set('tipo', tipo)
    if (usuarioId != null && usuarioId !== '') p.set('usuarioId', usuarioId)
    p.set('page', page)
    p.set('pageSize', pageSize)
    return req(`/api/Auditoria?${p}`, {}, t)
  },
  adminGetAuditoriaTipos: (t) => req('/api/Auditoria/tipos', {}, t),
}
