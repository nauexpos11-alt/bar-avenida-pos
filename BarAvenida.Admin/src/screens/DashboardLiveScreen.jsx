import { useState, useEffect, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import { api, API_URL } from '../api'
import './DashboardLiveScreen.css'

const IcoDinero = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)
const IcoCuentas = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <line x1="10" y1="9" x2="8" y2="9"/>
  </svg>
)
const IcoTicket = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
)
const IcoProductos = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)
const IcoMesera = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="7"/>
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
  </svg>
)
const IcoReloj = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)

const fmt    = (n) => `$${Number(n ?? 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
const fmtDec = (n) => `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtY   = (v) => v === 0 ? '$0' : v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`

function LineChartVentas({ data }) {
  const W = 560, H = 160
  const pl = 54, pr = 10, pt = 10, pb = 28
  const iW = W - pl - pr
  const iH = H - pt - pb
  const maxV = Math.max(...data.map(d => d.ventas), 1)

  const sx = (i) => pl + (i / 23) * iW
  const sy = (v) => pt + (1 - v / maxV) * iH

  const pts = data.map((d, i) => ({ ...d, sx: sx(i), sy: sy(d.ventas) }))
  const line = pts.map(p => `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`).join(' ')

  const yTicks = [0, 0.33, 0.67, 1]
  const xTicks = [0, 4, 8, 12, 16, 20]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="dlLineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0c842" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#f0c842" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((f, i) => (
        <line key={i} x1={pl} y1={sy(maxV * f)} x2={pl + iW} y2={sy(maxV * f)} stroke="#1e1e1e" strokeWidth="1" />
      ))}

      {yTicks.map((f, i) => (
        <text key={i} x={pl - 6} y={sy(maxV * f) + 4} textAnchor="end" fontSize="10" fill="#555">
          {fmtY(maxV * f)}
        </text>
      ))}

      {xTicks.map(h => (
        <text key={h} x={sx(h)} y={H - 6} textAnchor="middle" fontSize="10" fill="#555">
          {h}h
        </text>
      ))}

      {maxV > 1 && (
        <polygon
          points={`${pts[0].sx.toFixed(1)},${(pt + iH).toFixed(1)} ${line} ${pts[23].sx.toFixed(1)},${(pt + iH).toFixed(1)}`}
          fill="url(#dlLineGrad)"
        />
      )}

      <polyline
        points={line}
        fill="none"
        stroke="#f0c842"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {pts.filter(p => p.ventas > 0).map(p => (
        <circle key={p.hora} cx={p.sx} cy={p.sy} r="3.5" fill="#f0c842" stroke="#0a0a0a" strokeWidth="1.5">
          <title>{p.hora}:00 - {fmtDec(p.ventas)} ({p.cuentas} {p.cuentas === 1 ? 'cuenta' : 'cuentas'})</title>
        </circle>
      ))}
    </svg>
  )
}

function BarChartProductos({ data }) {
  if (!data.length) return <div className="dl-chart-vacio">Sin ventas hoy</div>
  const maxQ = Math.max(...data.map(d => d.cantidad), 1)
  const colores = ['#f0c842', '#d4a017', '#a0820d', '#7a6109', '#544209']

  return (
    <div className="dl-bar-chart">
      {data.map((prod, i) => (
        <div key={prod.productoId} className="dl-bar-row">
          <span className="dl-bar-nombre" title={prod.nombre}>{prod.nombre}</span>
          <div className="dl-bar-track">
            <div
              className="dl-bar-fill"
              style={{
                width: `${(prod.cantidad / maxQ) * 100}%`,
                background: colores[i] ?? colores[0],
              }}
            />
          </div>
          <span className="dl-bar-qty">{prod.cantidad} pzs</span>
        </div>
      ))}
    </div>
  )
}

function KpiCard({ label, valueRaw, valueFmt, delta, icon, color }) {
  const flecha = delta > 0 ? '▲' : delta < 0 ? '▼' : '▬'
  const deltaClass = delta > 0 ? 'kpi-delta-up' : delta < 0 ? 'kpi-delta-down' : 'kpi-delta-flat'
  return (
    <div className={`dl-kpi dl-kpi-${color}`}>
      <span className="dl-kpi-icon">{icon}</span>
      <span className="dl-kpi-value">{valueFmt(valueRaw)}</span>
      <span className="dl-kpi-label">{label}</span>
      <span className={`dl-kpi-delta ${deltaClass}`}>
        {flecha} {Math.abs(delta).toFixed(1)}%
      </span>
    </div>
  )
}

export default function DashboardLiveScreen({ auth, onVolver }) {
  const [data, setData]           = useState(null)
  const [error, setError]         = useState(null)
  const [updating, setUpdating]   = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const connRef                   = useRef(null)

  const cargar = useCallback(async () => {
    setUpdating(true)
    try {
      const d = await api.adminGetDashboardLive(auth.token)
      setData(d)
      setLastUpdate(new Date())
      setError(null)
    } catch (e) {
      setError(e.message || 'Error al cargar dashboard')
    } finally {
      setUpdating(false)
    }
  }, [auth.token])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    const id = setInterval(cargar, 30_000)
    return () => clearInterval(id)
  }, [cargar])

  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/barhub`, { accessTokenFactory: () => auth.token })
      .withAutomaticReconnect([0, 2000, 5000, 15000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('CuentaCobrada', () => cargar())

    conn.start()
      .then(() => conn.invoke('UnirseAGrupo', 'Admin').catch(() => {}))
      .catch(e => console.warn('SignalR DashLive:', e.message))

    connRef.current = conn
    return () => conn.stop()
  }, [auth.token, cargar])

  if (!data && !error) {
    return <div className="dl-loading">Cargando dashboard...</div>
  }

  return (
    <div className="dl-root">

      <header className="dl-header">
        <button className="dl-volver" onClick={onVolver}>&#9664; VOLVER</button>
        <h1 className="dl-titulo">DASHBOARD VIVO</h1>
        <div className="dl-update">
          {lastUpdate && (
            <span className="dl-update-time">
              Ultima: {lastUpdate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            className={`dl-refresh ${updating ? 'spinning' : ''}`}
            onClick={cargar}
            disabled={updating}
            title="Refrescar"
          >
            &#8635;
          </button>
        </div>
      </header>

      {error && <div className="dl-error">&#9888; {error}</div>}

      {data && (
        <>
          <section className="dl-kpis">
            <KpiCard
              label="VENTAS HOY"
              valueRaw={data.ventasHoy.hoy}
              valueFmt={fmt}
              delta={data.ventasHoy.delta}
              icon={IcoDinero}
              color="gold"
            />
            <KpiCard
              label="CUENTAS HOY"
              valueRaw={data.cuentas.hoy}
              valueFmt={(n) => String(Math.round(n))}
              delta={data.cuentas.delta}
              icon={IcoCuentas}
              color="red"
            />
            <KpiCard
              label="TICKET PROMEDIO"
              valueRaw={data.ticketPromedio.hoy}
              valueFmt={fmt}
              delta={data.ticketPromedio.delta}
              icon={IcoTicket}
              color="blue"
            />
            <div className="dl-kpi dl-kpi-green">
              <span className="dl-kpi-icon">{IcoProductos}</span>
              <span className="dl-kpi-value">{data.totalProductosVendidos}</span>
              <span className="dl-kpi-label">PRODUCTOS HOY</span>
              <span className="dl-kpi-delta kpi-delta-flat">piezas vendidas</span>
            </div>
          </section>

          <section className="dl-charts">
            <div className="dl-chart-box">
              <h3 className="dl-chart-titulo">VENTAS POR HORA (HOY)</h3>
              <LineChartVentas data={data.ventasPorHora} />
            </div>
            <div className="dl-chart-box">
              <h3 className="dl-chart-titulo">TOP 5 PRODUCTOS</h3>
              <BarChartProductos data={data.topProductos} />
            </div>
          </section>

          <section className="dl-footer">
            <div className="dl-foot-item">
              <span className="dl-foot-icon">{IcoMesera}</span>
              <div>
                <span className="dl-foot-label">MESERA TOP</span>
                <span className="dl-foot-val">
                  {data.meseraTopNombre
                    ? `${data.meseraTopNombre}${data.meseraTopVentas > 0 ? '  ·  ' + fmt(data.meseraTopVentas) : ''}`
                    : '—'}
                </span>
              </div>
            </div>
            <div className="dl-foot-item">
              <span className="dl-foot-icon">{IcoReloj}</span>
              <div>
                <span className="dl-foot-label">HORA PICO</span>
                <span className="dl-foot-val">
                  {data.horaPico !== null && data.horaPico !== undefined && data.horaPicoVentas > 0
                    ? `${data.horaPico}:00  ·  ${fmt(data.horaPicoVentas)}`
                    : '—'}
                </span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
