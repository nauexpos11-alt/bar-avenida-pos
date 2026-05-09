import { useState, useEffect, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import { api, API_URL } from '../api'
import './MonitorVentasScreen.css'

const PERIODOS = [
  { id: 'hoy',    label: 'Hoy' },
  { id: 'ayer',   label: 'Ayer' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes',    label: 'Mes' },
  { id: 'turno',  label: 'Turno' },
]

const fmt0 = (n) => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`

function BarraProgreso({ porcentaje, color }) {
  return (
    <div className="mv-barra-fondo">
      <div
        className="mv-barra-fill"
        style={{ width: `${Math.min(100, porcentaje || 0)}%`, background: color }}
      />
    </div>
  )
}

export default function MonitorVentasScreen({ auth }) {
  const [periodo,  setPeriodo]  = useState('hoy')
  const [datos,    setDatos]    = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error,    setError]    = useState(null)

  const cargar = useCallback(async (p = periodo) => {
    setCargando(true)
    setError(null)
    try {
      const data = await api.adminGetMonitorVentas(auth.token, p)
      setDatos(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [auth.token, periodo])

  useEffect(() => { cargar(periodo) }, [periodo])   // eslint-disable-line

  // Auto-refresh 30s
  useEffect(() => {
    const t = setInterval(() => cargar(periodo), 30_000)
    return () => clearInterval(t)
  }, [cargar, periodo])

  // SignalR — actualiza al cobrar
  useEffect(() => {
    if (!auth?.token) return
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/barhub`, { accessTokenFactory: () => auth.token })
      .withAutomaticReconnect([0, 2000, 5000, 15000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('CuentaCobrada', () => cargar(periodo))
    conn.start()
      .then(() => conn.invoke('UnirseAGrupo', 'Admin').catch(() => {}))
      .catch(e => console.warn('SignalR Monitor:', e.message))

    return () => { conn.stop() }
  }, [auth.token])   // eslint-disable-line

  const delta = datos?.deltaVsAyer
  const deltaStr = delta == null ? null
    : delta === 0  ? '= igual que ayer'
    : delta > 0    ? `▲ ${delta.toFixed(1)}% vs ayer`
    : `▼ ${Math.abs(delta).toFixed(1)}% vs ayer`

  const deltaClass = delta == null ? '' : delta >= 0 ? 'mv-delta-pos' : 'mv-delta-neg'

  return (
    <div className="mv-root">

      {/* ── Header ── */}
      <div className="mv-header">
        <span className="mv-titulo">📊 MONITOR DE VENTAS</span>
        <div className="mv-periodos">
          {PERIODOS.map(p => (
            <button
              key={p.id}
              className={`mv-periodo-btn${periodo === p.id ? ' activo' : ''}`}
              onClick={() => setPeriodo(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mv-body">
        {error && (
          <div className="mv-error">⚠ {error}</div>
        )}

        {/* ── KPI principal ── */}
        <div className="mv-kpi-row">
          <div className="mv-kpi-total">
            <span className="mv-kpi-monto">
              {cargando ? '···' : fmt0(datos?.ventaTotal ?? 0)}
            </span>
            <span className="mv-kpi-label">VENTA TOTAL DEL {periodo === 'ayer' ? 'DÍA ANTERIOR' : periodo === 'semana' ? 'SEMANA' : periodo === 'mes' ? 'MES' : periodo === 'turno' ? 'TURNO' : 'DÍA'}</span>
          </div>
          {deltaStr && (
            <span className={`mv-kpi-delta ${deltaClass}`}>{deltaStr}</span>
          )}
          {datos && (
            <span className="mv-kpi-cuentas">
              {datos.cuentasPagadas} cuenta{datos.cuentasPagadas !== 1 ? 's' : ''} pagada{datos.cuentasPagadas !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {datos && datos.ventaTotal === 0 && !cargando && (
          <div className="mv-vacio">Sin ventas en este periodo.</div>
        )}

        {datos && datos.ventaTotal > 0 && (
          <>
            {/* ── Fila 2: Por tipo producto + Por tipo servicio ── */}
            <div className="mv-seccion-row">
              {/* Por tipo de producto */}
              <div className="mv-card">
                <div className="mv-card-titulo">POR TIPO DE PRODUCTO</div>
                <div className="mv-tipo-lista">
                  {datos.porTipoProducto.map((item, i) => (
                    <div key={i} className="mv-tipo-item">
                      <div className="mv-tipo-header">
                        <span className="mv-tipo-nombre">{item.tipo}</span>
                        <span className="mv-tipo-pct">{item.porcentaje.toFixed(1)}%</span>
                        <span className="mv-tipo-monto">{fmt0(item.monto)}</span>
                      </div>
                      <BarraProgreso
                        porcentaje={item.porcentaje}
                        color={item.tipo === 'Bebidas' ? '#f0c842' : '#818cf8'}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Por tipo de servicio */}
              <div className="mv-card">
                <div className="mv-card-titulo">POR TIPO DE SERVICIO</div>
                <div className="mv-tipo-lista">
                  {datos.porTipoServicio.map((item, i) => (
                    <div key={i} className="mv-tipo-item">
                      <div className="mv-tipo-header">
                        <span className="mv-tipo-nombre">
                          {item.tipo === 'Mesa' ? '🍽️ Mesa (Comedor)' : '🍺 Barra (Rápido)'}
                        </span>
                        <span className="mv-tipo-pct">{item.porcentaje.toFixed(1)}%</span>
                        <span className="mv-tipo-monto">{fmt0(item.monto)}</span>
                      </div>
                      <BarraProgreso
                        porcentaje={item.porcentaje}
                        color={item.tipo === 'Mesa' ? '#4ade80' : '#f97316'}
                      />
                      <span className="mv-tipo-sub">{item.cuentas} cuenta{item.cuentas !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Por área ── */}
            <div className="mv-seccion">
              <div className="mv-seccion-titulo">POR ÁREA</div>
              <div className="mv-area-grid">
                {datos.porArea.map((item, i) => (
                  <div key={i} className="mv-area-card">
                    <div className="mv-area-nombre">{item.area}</div>
                    <div className="mv-area-monto">{fmt0(item.monto)}</div>
                    <div className="mv-area-pct">{item.porcentaje.toFixed(1)}%</div>
                    <BarraProgreso porcentaje={item.porcentaje} color="#f0c842" />
                    <div className="mv-area-cuentas">{item.cuentas} cta{item.cuentas !== 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Por categoría de producto ── */}
            <div className="mv-seccion">
              <div className="mv-seccion-titulo">POR CATEGORÍA DE PRODUCTO</div>
              <div className="mv-cat-tabla">
                <div className="mv-cat-header-row">
                  <span>Categoría</span>
                  <span>Monto</span>
                  <span>%</span>
                  <span />
                </div>
                {datos.porCategoria.map((item, i) => (
                  <div key={i} className="mv-cat-row">
                    <span className="mv-cat-nombre">{item.categoria}</span>
                    <span className="mv-cat-monto">{fmt0(item.monto)}</span>
                    <span className="mv-cat-pct">{item.porcentaje.toFixed(1)}%</span>
                    <div className="mv-cat-barra-wrap">
                      <div
                        className="mv-cat-barra"
                        style={{ width: `${Math.min(100, item.porcentaje)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {cargando && !datos && (
          <div className="mv-cargando">Cargando datos…</div>
        )}
      </div>
    </div>
  )
}
