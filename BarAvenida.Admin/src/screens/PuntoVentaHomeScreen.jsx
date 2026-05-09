import { useState, useEffect, useCallback, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { api, API_URL } from '../api'
import { useServerClock } from '../hooks/useServerClock'
import './PuntoVentaHomeScreen.css'

const fmt0 = (n) => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
const fmt2 = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function fmtHora(fecha) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}
function duracion(fecha) {
  if (!fecha) return ''
  const ms = Date.now() - new Date(fecha).getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
function fmtFecha(d) {
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}
function deltaStr(d) {
  if (d == null) return null
  const n = Number(d)
  if (n === 0) return '= igual que ayer'
  return `${n > 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(0)}% vs ayer`
}

export default function PuntoVentaHomeScreen({ auth, onIrPantalla }) {
  const clock = useServerClock()

  const [datosCentro,   setDatosCentro]   = useState(null)
  const [datosBarra,    setDatosBarra]     = useState(null)
  const [datosTurno,    setDatosTurno]     = useState(undefined) // undefined=cargando
  const [datosReportes, setDatosReportes]  = useState(null)
  const [solicitudes,   setSolicitudes]    = useState(0)
  const [cargando,      setCargando]       = useState(true)

  const cargarDatos = useCallback(async () => {
    setCargando(true)
    const [activas, barras, turno, live, sols] = await Promise.allSettled([
      api.adminGetCuentasActivas(auth.token),
      api.adminGetCuentasRapidasAbiertas(auth.token),
      api.adminGetTurnoActual(auth.token),
      api.adminGetDashboardLive(auth.token),
      api.getSolicitudesPendientes(auth.token),
    ])

    if (activas.status === 'fulfilled') {
      const arr = Array.isArray(activas.value) ? activas.value : []
      setDatosCentro({
        count: arr.length,
        total: arr.reduce((s, c) => s + (c.total || 0), 0),
      })
    }

    if (barras.status === 'fulfilled') {
      const arr = Array.isArray(barras.value) ? barras.value : []
      setDatosBarra({
        count: arr.length,
        total: arr.reduce((s, c) => s + (c.total || 0), 0),
      })
    }

    if (turno.status === 'fulfilled') {
      setDatosTurno(turno.value ?? null)
    } else {
      setDatosTurno(null)
    }

    if (live.status === 'fulfilled' && live.value) {
      setDatosReportes(live.value)
    }

    if (sols.status === 'fulfilled') {
      setSolicitudes(Array.isArray(sols.value) ? sols.value.length : 0)
    }

    setCargando(false)
  }, [auth.token])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  // Auto-refresh 30s
  useEffect(() => {
    const t = setInterval(cargarDatos, 30_000)
    return () => clearInterval(t)
  }, [cargarDatos])

  // SignalR
  useEffect(() => {
    if (!auth?.token) return
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/barhub`, { accessTokenFactory: () => auth.token })
      .withAutomaticReconnect([0, 2000, 5000, 15000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('CuentaCobrada',       () => cargarDatos())
    conn.on('CuentaAbierta',       () => cargarDatos())
    conn.on('CuentaPorCobrar',     () => cargarDatos())
    conn.on('SolicitudCancelacion', () => cargarDatos())
    conn.on('SolicitudResuelta',   () => cargarDatos())

    conn.start()
      .then(() => conn.invoke('UnirseAGrupo', 'Admin').catch(() => {}))
      .catch(e => console.warn('SignalR PVH:', e.message))

    return () => { conn.stop() }
  }, [auth.token, cargarDatos])

  const ir = (screen, label) => onIrPantalla?.(screen, label)

  const delta = datosReportes?.ventasHoy?.delta

  return (
    <div className="pvh-root">

      {/* ── Bienvenida ── */}
      <div className="pvh-welcome">
        <div className="pvh-welcome-left">
          <span className="pvh-saludo">Bienvenido, <strong>{auth?.nombre}</strong></span>
          <span className="pvh-fecha">{fmtFecha(clock)}</span>
        </div>
        <div className="pvh-turno-info">
          {datosTurno === undefined ? (
            <span className="pvh-turno-cargando">Cargando turno…</span>
          ) : datosTurno ? (
            <span className="pvh-turno-abierto">
              Turno abierto desde {fmtHora(datosTurno.fechaApertura)}
              <span className="pvh-turno-sep">·</span>
              Fondo {fmt2(datosTurno.montoInicial)}
              <span className="pvh-turno-sep">·</span>
              {duracion(datosTurno.fechaApertura)}
            </span>
          ) : (
            <span className="pvh-turno-cerrado">⚠ Turno cerrado — abre uno para operar</span>
          )}
        </div>
      </div>

      {/* ── Grid de 4 botones ── */}
      <div className="pvh-grid">

        {/* Centro de Operación */}
        <button className="pvh-card pvh-card-centro" onClick={() => ir('pos-centro', 'Centro')}>
          <div className="pvh-card-ico">🎯</div>
          <div className="pvh-card-title">CENTRO DE OPERACIÓN</div>
          <div className="pvh-card-div" />
          <div className="pvh-card-stats">
            {datosCentro ? (
              <>
                <span className="pvh-stat-main">{datosCentro.count} cuenta{datosCentro.count !== 1 ? 's' : ''} activa{datosCentro.count !== 1 ? 's' : ''}</span>
                <span className="pvh-stat-sub">{fmt0(datosCentro.total)} en mesas</span>
              </>
            ) : (
              <span className="pvh-stat-cargando">{cargando ? 'Cargando…' : '—'}</span>
            )}
          </div>
          <div className="pvh-shortcut">F1</div>
        </button>

        {/* Barra */}
        <button className="pvh-card pvh-card-barra" onClick={() => ir('pos-barra', 'Barra')}>
          <div className="pvh-card-ico">🍺</div>
          <div className="pvh-card-title">BARRA</div>
          <div className="pvh-card-div" />
          <div className="pvh-card-stats">
            {datosBarra ? (
              <>
                <span className="pvh-stat-main">{datosBarra.count} cuenta{datosBarra.count !== 1 ? 's' : ''} {datosBarra.count !== 1 ? 'abiertas' : 'abierta'}</span>
                <span className="pvh-stat-sub">{fmt0(datosBarra.total)} en barra</span>
              </>
            ) : (
              <span className="pvh-stat-cargando">{cargando ? 'Cargando…' : '—'}</span>
            )}
          </div>
          <div className="pvh-shortcut">F9</div>
        </button>

        {/* Caja */}
        <button className="pvh-card pvh-card-caja" onClick={() => ir('caja-apertura-turno', 'Caja')}>
          <div className="pvh-card-ico">💰</div>
          <div className="pvh-card-title">CAJA</div>
          <div className="pvh-card-div" />
          <div className="pvh-card-stats">
            {datosTurno === undefined ? (
              <span className="pvh-stat-cargando">Cargando…</span>
            ) : datosTurno ? (
              <>
                <span className="pvh-stat-main">Fondo: {fmt2(datosTurno.montoInicial)}</span>
                <span className="pvh-stat-sub">Turno abierto hace {duracion(datosTurno.fechaApertura)}</span>
              </>
            ) : (
              <span className="pvh-stat-alerta">Sin turno abierto</span>
            )}
          </div>
          <div className="pvh-shortcut">F2 / F6</div>
        </button>

        {/* Reportes */}
        <button className="pvh-card pvh-card-rep" onClick={() => ir('rep-dashboard-live', 'Dashboard vivo')}>
          <div className="pvh-card-ico">📊</div>
          <div className="pvh-card-title">REPORTES</div>
          <div className="pvh-card-div" />
          <div className="pvh-card-stats">
            {datosReportes?.ventasHoy ? (
              <>
                <span className="pvh-stat-main">Ventas hoy: {fmt0(datosReportes.ventasHoy.hoy)}</span>
                {delta != null && (
                  <span className={`pvh-stat-sub ${Number(delta) >= 0 ? 'pvh-delta-pos' : 'pvh-delta-neg'}`}>
                    {deltaStr(delta)}
                  </span>
                )}
              </>
            ) : (
              <span className="pvh-stat-cargando">{cargando ? 'Cargando…' : '—'}</span>
            )}
          </div>
        </button>

      </div>

      {/* ── Footer ── */}
      <div className="pvh-footer">
        {solicitudes > 0 ? (
          <button
            className="pvh-footer-btn pvh-footer-sol"
            onClick={() => ir('solicitudes-pendientes', 'Solicitudes')}
          >
            🔔 {solicitudes} solicitud{solicitudes !== 1 ? 'es' : ''} pendiente{solicitudes !== 1 ? 's' : ''}
          </button>
        ) : (
          <span className="pvh-footer-ok">✓ Sin solicitudes pendientes</span>
        )}
      </div>

    </div>
  )
}
