import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import * as signalR from '@microsoft/signalr'
import OrdenCard from './components/OrdenCard'
import MesaCard from './components/MesaCard'
import { playBeep, playFanfarria, unlockAudio } from './utils/sound'
import './App.css'

// API_URL robusta: ignora VITE_API_URL si es invalida (ej. "http://" sin host).
// Cuando el KDS se sirve desde el backend en /kds, window.location.origin es la URL correcta.
function resolverApiUrl() {
  const fromEnv = import.meta.env.VITE_API_URL
  if (fromEnv && /^https?:\/\/.+/.test(fromEnv)) return fromEnv.replace(/\/+$/, '')
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return 'http://localhost:7000'
}
const API_URL = resolverApiUrl()

// Confeti — paleta dorada + acentos
const CONFETI_COLORES = ['#f0c842', '#fbbf24', '#facc15', '#22c55e', '#ef4444', '#3b82f6', '#ffffff']
const CONFETI_PIEZAS = 36

function generarConfeti() {
  return Array.from({ length: CONFETI_PIEZAS }, (_, i) => ({
    id: i,
    left: Math.random() * 100,            // %
    delay: Math.random() * 0.6,           // s
    duration: 2.4 + Math.random() * 1.4,  // s
    color: CONFETI_COLORES[Math.floor(Math.random() * CONFETI_COLORES.length)],
    size: 8 + Math.random() * 8,          // px
    rotInicial: Math.random() * 360,
    rotFinal: 360 + Math.random() * 720,
    drift: -40 + Math.random() * 80,      // px de deriva horizontal
  }))
}

export default function App() {
  const [ordenes, setOrdenes] = useState([])
  const [historial, setHistorial] = useState([])
  const [tabActiva, setTabActiva] = useState('activo') // 'activo' | 'historial'
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)
  const [clock, setClock] = useState(new Date())
  const [now, setNow] = useState(new Date())
  const [confeti, setConfeti] = useState(null)
  const connRef = useRef(null)
  const pendientesAnteriorRef = useRef(0)

  // Reloj en vivo (cada segundo)
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Actualiza colores de tarjetas cada 30 segundos
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Desbloquear Web Audio en primer click
  useEffect(() => {
    document.addEventListener('click', unlockAudio, { once: true })
  }, [])

  // Cargar órdenes pendientes al iniciar
  useEffect(() => {
    fetch(`${API_URL}/api/Cuentas/ordenes/pendientes`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => setOrdenes(Array.isArray(data) ? data : []))
      .catch(err => setError(`No se pudo cargar órdenes: ${err.message}`))
  }, [])

  // Recargar órdenes pendientes desde el backend (uso para recuperación tras reconexión o errores)
  const recargarPendientes = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/Cuentas/ordenes/pendientes`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setOrdenes(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('No se pudo recargar pendientes:', err)
    }
  }, [])

  // Recargar historial completadas hoy
  const recargarHistorial = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/Cuentas/ordenes/completadas-hoy`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setHistorial(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('No se pudo cargar historial:', err)
    }
  }, [])

  // Cargar historial al iniciar (silencioso, para que el footer de stats tenga datos)
  useEffect(() => {
    recargarHistorial()
  }, [recargarHistorial])

  // Auto-refresh historial cada 30s mientras la tab esté activa
  useEffect(() => {
    if (tabActiva !== 'historial') return
    recargarHistorial() // refresh inmediato al cambiar a la tab
    const id = setInterval(recargarHistorial, 30_000)
    return () => clearInterval(id)
  }, [tabActiva, recargarHistorial])

  // Conexión SignalR
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/barhub`)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('NuevaOrden', (orden) => {
      setOrdenes(prev => {
        if (prev.some(o => o.id === orden.id)) return prev
        return [orden, ...prev]
      })
      playBeep()
    })

    // El backend emite cuando alguien marca como listo. Quitamos del activo y
    // agregamos optimistamente al historial para que se vea instantáneo.
    conn.on('OrdenLista', (ordenId) => {
      setOrdenes(prev => {
        const orden = prev.find(o => o.id === ordenId)
        if (orden) {
          // Construir entrada de historial localmente
          const ahora = new Date()
          const fechaEnvio = new Date(orden.fechaEnvio)
          const tiempoMinutos = Math.max(0, Math.round((ahora - fechaEnvio) / 60000))
          const detalles = (orden.detalles ?? orden.ordenDetalles ?? []).map(d => ({
            productoNombre: d.productoNombre ?? d.nombreProducto ?? d.producto?.nombre ?? '?',
            cantidad: d.cantidad,
          }))
          const entradaHist = {
            id: orden.id,
            mesaId: orden.mesaId ?? orden.mesa?.id ?? null,
            mesaNumero: orden.mesaNumero ?? orden.mesa?.numero ?? '',
            nombreMesera: orden.nombreMesera ?? orden.mesera?.nombre ?? orden.usuarioNombre ?? '',
            numeroOrden: orden.numeroOrden ?? 0,
            fechaEnvio: orden.fechaEnvio,
            fechaListo: ahora.toISOString(),
            tiempoMinutos,
            detalles,
          }
          setHistorial(h => {
            if (h.some(x => x.id === entradaHist.id)) return h
            return [entradaHist, ...h].slice(0, 200)
          })
        }
        return prev.filter(o => o.id !== ordenId)
      })
    })

    // Unirse al grupo "Barra" — sin esto, NuevaOrden nunca llega
    const unirseAlGrupoBarra = async () => {
      try {
        await conn.invoke('UnirseAGrupo', 'Barra')
        setConnected(true)
        setError(null)
        // Re-sincronizar pendientes tras conectar (por si llegó algo mientras estábamos desconectados)
        await recargarPendientes()
      } catch (err) {
        console.error('Error uniéndose al grupo Barra:', err)
        setError(`No se pudo unir al grupo Barra: ${err.message}`)
      }
    }

    conn.onreconnecting(() => setConnected(false))
    conn.onreconnected(() => { unirseAlGrupoBarra() })
    conn.onclose(() => setConnected(false))

    conn.start()
      .then(() => unirseAlGrupoBarra())
      .catch(err => setError(`SignalR sin conexión: ${err.message}`))

    connRef.current = conn
    return () => conn.stop()
  }, [recargarPendientes])

  const handleListo = useCallback(async (ordenId) => {
    // Optimistic update: quitar inmediato de pantalla para que la UI se sienta viva
    const ordenesPrev = ordenes
    setOrdenes(prev => prev.filter(o => o.id !== ordenId))
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // timeout 8s
      const resp = await fetch(`${API_URL}/api/Cuentas/ordenes/${ordenId}/listo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    } catch (err) {
      console.error('Error al marcar listo:', err)
      // Si falla, recargamos el estado real del backend para evitar quedar desincronizados
      setOrdenes(ordenesPrev)
      recargarPendientes()
      setError(`Error al marcar listo: ${err.message}. Reintenta.`)
      setTimeout(() => setError(null), 5000)
    }
  }, [ordenes, recargarPendientes])

  // Marcar TODAS las órdenes de una mesa como listas (con confirmación)
  const handleTodaLaMesaListo = useCallback(async (grupo) => {
    if (!grupo || !grupo.ordenes?.length) return
    const ok = window.confirm(`¿Marcar todas las órdenes de Mesa ${grupo.mesaNumero} como listas?`)
    if (!ok) return

    // Optimistic: quitarlas todas de pantalla de un golpe
    const ids = grupo.ordenes.map(o => o.id)
    const ordenesPrev = ordenes
    setOrdenes(prev => prev.filter(o => !ids.includes(o.id)))

    try {
      // Disparar todos los POST en paralelo
      const resps = await Promise.all(ids.map(id =>
        fetch(`${API_URL}/api/Cuentas/ordenes/${id}/listo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      ))
      const fallaron = resps.filter(r => !r.ok)
      if (fallaron.length > 0) {
        throw new Error(`${fallaron.length} órden(es) no se pudieron marcar`)
      }
    } catch (err) {
      console.error('Error en TODA LA MESA LISTA:', err)
      setOrdenes(ordenesPrev)
      recargarPendientes()
      setError(`Error: ${err.message}. Reintenta.`)
      setTimeout(() => setError(null), 5000)
    }
  }, [ordenes, recargarPendientes])

  // PROMPT F — Agrupar ordenes por mesa y ordenar por tiempo de espera
  const grupos = useMemo(() => {
    const map = new Map()
    for (const orden of ordenes) {
      const mesaId = orden.mesaId ?? orden.mesa?.id ?? orden.mesaNumero ?? orden.cuentaId
      // Si NO hay mesaId (cobro rapido barra), agrupar por cuenta
      const groupKey = mesaId ?? `cuenta-${orden.cuentaId}`
      if (!map.has(groupKey)) {
        const aliasCliente = orden.nombreCliente ?? orden.cuenta?.nombreCliente ?? orden.aliasMesa ?? null
        const folio = orden.folio ?? orden.cuenta?.folio ?? orden.numeroFolio ?? null
        // OJO: el backend manda "meseraNombre" (camelCase), no "nombreMesera"
        const meseraNombre = (orden.meseraNombre || orden.nombreMesera || orden.mesera?.nombre || orden.usuarioNombre || '').toString().trim()
        map.set(groupKey, {
          mesaId,
          mesaNumero: orden.mesaNumero ?? orden.mesa?.numero ?? mesaId,
          mesera:     meseraNombre || '—',
          aliasCliente,         // Nombre del cliente / alias (ej. "NAU", "Mesa Juan")
          folio,                // Folio diario de la cuenta
          ordenes:    [],
          primeraFecha: orden.fechaEnvio,
        })
      }
      const g = map.get(groupKey)
      g.ordenes.push(orden)
      if (new Date(orden.fechaEnvio) < new Date(g.primeraFecha)) {
        g.primeraFecha = orden.fechaEnvio
      }
    }
    return Array.from(map.values())
      .sort((a, b) => new Date(a.primeraFecha) - new Date(b.primeraFecha))
  }, [ordenes])

  // PROMPT F — Metricas vivas para el banner
  const metricas = useMemo(() => {
    if (grupos.length === 0) return null
    const ahora   = now.getTime()
    const minutos = grupos.map(g => (ahora - new Date(g.primeraFecha).getTime()) / 60000)
    const promedio = minutos.reduce((s, m) => s + m, 0) / minutos.length
    const urgentes = minutos.filter(m => m >= 5).length
    return {
      totalMesas: grupos.length,
      promedio:   Math.round(promedio),
      urgentes,
    }
  }, [grupos, now])

  // Stats del historial para el footer (siempre visibles)
  const statsHist = useMemo(() => {
    const total = historial.length
    if (total === 0) return { total: 0, promedio: 0, mejor: 0 }
    const tiempos = historial.map(h => h.tiempoMinutos ?? 0)
    const promedio = Math.round(tiempos.reduce((s, x) => s + x, 0) / total)
    const mejor    = Math.min(...tiempos)
    return { total, promedio, mejor }
  }, [historial])

  const horaStr = clock.toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  const pendientes = ordenes.length

  // Confeti al pasar de >0 pendientes a 0
  useEffect(() => {
    const anterior = pendientesAnteriorRef.current
    if (anterior > 0 && pendientes === 0) {
      setConfeti(generarConfeti())
      try { playFanfarria() } catch { /* noop */ }
      const id = setTimeout(() => setConfeti(null), 4000)
      pendientesAnteriorRef.current = pendientes
      return () => clearTimeout(id)
    }
    pendientesAnteriorRef.current = pendientes
  }, [pendientes])

  return (
    <div className="kds-root">
      <header className="kds-header">
        <div className="hdr-left">
          <span className="hdr-title">BAR AVENIDA</span>
          <span className="hdr-sub">MONITOR BARRA — KDS</span>
        </div>

        <div className="hdr-center">
          {pendientes === 0
            ? <span className="hdr-count libre">SIN PEDIDOS</span>
            : <span className="hdr-count ocupado">
                {pendientes} {pendientes === 1 ? 'PEDIDO' : 'PEDIDOS'}
              </span>
          }
        </div>

        <div className="hdr-right">
          <span className="hdr-clock">{horaStr}</span>
          <span className={`hdr-status ${connected ? 'ok' : 'err'}`}>
            {connected ? '● EN LÍNEA' : '● DESCONECTADO'}
          </span>
        </div>
      </header>

      {/* Tabs ACTIVO / HISTORIAL HOY */}
      <div className="kds-tabs">
        <button
          className={`kds-tab ${tabActiva === 'activo' ? 'is-active' : ''}`}
          onClick={() => setTabActiva('activo')}
        >
          ✓ ACTIVO ({pendientes})
        </button>
        <button
          className={`kds-tab ${tabActiva === 'historial' ? 'is-active' : ''}`}
          onClick={() => setTabActiva('historial')}
        >
          🕒 HISTORIAL HOY ({historial.length})
        </button>
      </div>

      {error && (
        <div className="error-banner">
          ⚠ {error}
          {(error.includes('fetch') || error.includes('certificate') || error.includes('SSL')) && (
            <span>
              {' '}— Abre <strong>{API_URL}</strong> en otra pestaña y acepta el certificado
            </span>
          )}
        </div>
      )}

      {/* Banner de metricas vivas (solo en tab activo) */}
      {tabActiva === 'activo' && metricas && (
        <div className="metricas-bar">
          <div className="met-item">
            <span className="met-num">{metricas.totalMesas}</span>
            <span className="met-lbl">mesa{metricas.totalMesas !== 1 ? 's' : ''}</span>
          </div>
          <div className="met-sep" />
          <div className="met-item">
            <span className="met-num">{metricas.promedio}</span>
            <span className="met-lbl">min promedio</span>
          </div>
          <div className="met-sep" />
          <div className={`met-item ${metricas.urgentes > 0 ? 'met-urgente' : ''}`}>
            <span className="met-num">{metricas.urgentes}</span>
            <span className="met-lbl">urgente{metricas.urgentes !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      {/* CONTENIDO según tab */}
      {tabActiva === 'activo' ? (
        pendientes === 0 ? (
          <div className="empty-state">
            <div className="empty-check">✓</div>
            <div className="empty-title">SIN ORDENES PENDIENTES</div>
            <div className="empty-sub">La barra está al día</div>
          </div>
        ) : (
          <div className="mesas-grid">
            {grupos.map(grupo => (
              <MesaCard
                key={grupo.mesaId}
                grupo={grupo}
                now={now}
                onListo={handleListo}
                onTodaLaMesaListo={handleTodaLaMesaListo}
              />
            ))}
          </div>
        )
      ) : (
        // TAB HISTORIAL HOY
        historial.length === 0 ? (
          <div className="empty-state">
            <div className="empty-check">🕒</div>
            <div className="empty-title">SIN COMPLETADAS HOY</div>
            <div className="empty-sub">Cuando marques órdenes como listas aparecerán aquí</div>
          </div>
        ) : (
          <div className="hist-grid">
            {historial.map(h => (
              <article key={h.id} className="hist-card">
                <header className="hist-top">
                  <span className="hist-num">ORDEN #{h.numeroOrden ?? '?'}</span>
                  <span className="hist-tiempo">{h.tiempoMinutos} min</span>
                </header>
                <div className="hist-meta">
                  <span className="hist-mesa">MESA {h.mesaNumero}</span>
                  <span className="hist-mesera">{String(h.nombreMesera || '').toUpperCase()}</span>
                </div>
                <ul className="hist-detalles">
                  {(h.detalles ?? []).map((d, i) => (
                    <li key={i} className="hist-det">
                      <span className="hist-cant">{d.cantidad}x</span>
                      <span className="hist-prod">{d.productoNombre ?? '?'}</span>
                    </li>
                  ))}
                </ul>
                <footer className="hist-footer">
                  <span className="hist-hora">
                    Listo: {h.fechaListo
                      ? new Date(h.fechaListo).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                      : '--:--'}
                  </span>
                </footer>
              </article>
            ))}
          </div>
        )
      )}

      {/* Stats footer (siempre visible) */}
      <div className="stats-footer">
        <span className="sf-item">
          Hoy: <strong>{statsHist.total}</strong> completadas
        </span>
        <span className="sf-sep">|</span>
        <span className="sf-item">
          Promedio: <strong>{statsHist.promedio}</strong> min
        </span>
        <span className="sf-sep">|</span>
        <span className="sf-item">
          Mejor: <strong>{statsHist.mejor}</strong> min
        </span>
      </div>

      {/* Confeti cuando llegamos a 0 pendientes */}
      {confeti && (
        <div className="confeti-layer" aria-hidden="true">
          {confeti.map(p => (
            <div
              key={p.id}
              className="confeti-pieza"
              style={{
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.size * 0.45}px`,
                background: p.color,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                '--rot-ini': `${p.rotInicial}deg`,
                '--rot-fin': `${p.rotFinal}deg`,
                '--drift': `${p.drift}px`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
