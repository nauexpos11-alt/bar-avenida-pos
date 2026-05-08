import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import * as signalR from '@microsoft/signalr'
import OrdenCard from './components/OrdenCard'
import MesaCard from './components/MesaCard'
import { playBeep, unlockAudio } from './utils/sound'
import './App.css'

// API_URL: si VITE_API_URL viene del .env, lo usa (modo dev con npm run dev).
// Si no, usa el origen actual (cuando el KDS se sirve desde el backend en /kds,
// queda http://192.168.100.10:7000 sin importar la IP del bar).
const API_URL = import.meta.env.VITE_API_URL || window.location.origin

export default function App() {
  const [ordenes, setOrdenes] = useState([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)
  const [clock, setClock] = useState(new Date())
  const [now, setNow] = useState(new Date())
  const connRef = useRef(null)

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

    // Por si el backend emite cuando alguien más marca como listo
    conn.on('OrdenLista', (ordenId) => {
      setOrdenes(prev => prev.filter(o => o.id !== ordenId))
    })

    conn.onreconnecting(() => setConnected(false))
    conn.onreconnected(() => { setConnected(true); setError(null) })
    conn.onclose(() => setConnected(false))

    conn.start()
      .then(() => { setConnected(true); setError(null) })
      .catch(err => setError(`SignalR sin conexión: ${err.message}`))

    connRef.current = conn
    return () => conn.stop()
  }, [])

  const handleListo = useCallback(async (ordenId) => {
    try {
      const resp = await fetch(`${API_URL}/api/Cuentas/ordenes/${ordenId}/listo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      setOrdenes(prev => prev.filter(o => o.id !== ordenId))
    } catch (err) {
      console.error('Error al marcar listo:', err)
    }
  }, [])

  // PROMPT F — Agrupar ordenes por mesa y ordenar por tiempo de espera
  const grupos = useMemo(() => {
    const map = new Map()
    for (const orden of ordenes) {
      const mesaId = orden.mesaId ?? orden.mesa?.id ?? orden.mesaNumero
      if (!map.has(mesaId)) {
        map.set(mesaId, {
          mesaId,
          mesaNumero: orden.mesaNumero ?? orden.mesa?.numero ?? mesaId,
          mesera:     orden.nombreMesera ?? orden.mesera?.nombre ?? orden.usuarioNombre ?? 'Mesera',
          ordenes:    [],
          primeraFecha: orden.fechaEnvio,
        })
      }
      const g = map.get(mesaId)
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

  const horaStr = clock.toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })

  const pendientes = ordenes.length

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

      {/* PROMPT F — Banner de metricas vivas */}
      {metricas && (
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

      {pendientes === 0 ? (
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
            />
          ))}
        </div>
      )}
    </div>
  )
}
