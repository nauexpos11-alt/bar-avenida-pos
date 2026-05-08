import { useState, useEffect, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import { api, API_URL } from '../api'
import './DashboardLiveScreen.css'

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
              icon="$"
              color="gold"
            />
            <KpiCard
              label="CUENTAS HOY"
              valueRaw={data.cuentas.hoy}
              valueFmt={(n) => String(Math.round(n))}
              delta={data.cuentas.delta}
              icon="#"
              color="red"
            />
            <KpiCard
              label="TICKET PROMEDIO"
              valueRaw={data.ticketPromedio.hoy}
              valueFmt={fmt}
              delta={data.ticketPromedio.delta}
              icon="~"
              color="blue"
            />
            <div className="dl-kpi dl-kpi-green">
              <span className="dl-kpi-icon">+</span>
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
              <span className="dl-foot-icon">1</span>
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
              <span className="dl-foot-icon">H</span>
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
