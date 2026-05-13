import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import LineChart  from '../components/charts/LineChart'
import BarChartH from '../components/charts/BarChartH'
import BarChartV from '../components/charts/BarChartV'
import PieChart  from '../components/charts/PieChart'
import Icon from '../components/Icon'
import './ReportesScreen.css'

const TABS = [
  { key: 'vendidos-hoy', label: 'Productos vendidos hoy' },
  { key: 'ventas',       label: 'Ventas'         },
  { key: 'productos',    label: 'Productos top'  },
  { key: 'meseros',      label: 'Meseros'        },
  { key: 'categorias',   label: 'Categorías'     },
  { key: 'hora',         label: 'Por hora'       },
  { key: 'metodos',      label: 'Métodos de pago'},
]

function toIsoDate(d) { return d.toISOString().slice(0, 10) }

function rangoRapido(tipo) {
  const hoy = new Date()
  switch (tipo) {
    case 'hoy':   return { desde: toIsoDate(hoy), hasta: toIsoDate(hoy) }
    case 'ayer': {
      const d = new Date(hoy); d.setDate(d.getDate() - 1)
      return { desde: toIsoDate(d), hasta: toIsoDate(d) }
    }
    case 'semana': {
      const d = new Date(hoy); d.setDate(d.getDate() - 6)
      return { desde: toIsoDate(d), hasta: toIsoDate(hoy) }
    }
    case 'mes': {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      return { desde: toIsoDate(d), hasta: toIsoDate(hoy) }
    }
    case 'mes-anterior': {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
      const h = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
      return { desde: toIsoDate(d), hasta: toIsoDate(h) }
    }
    default: return { desde: toIsoDate(hoy), hasta: toIsoDate(hoy) }
  }
}

function fmtMXN(n) {
  return `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function KpiCard({ label, value, sub }) {
  return (
    <div className="rep-kpi">
      <div className="rep-kpi-val">{value}</div>
      <div className="rep-kpi-label">{label}</div>
      {sub && <div className="rep-kpi-sub">{sub}</div>}
    </div>
  )
}

export default function ReportesScreen({ auth, initialTab = 'vendidos-hoy', onVolver }) {
  const [tab, setTab]       = useState(initialTab)
  const [desde, setDesde]   = useState(toIsoDate(new Date()))
  const [hasta, setHasta]   = useState(toIsoDate(new Date()))
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [data,    setData]    = useState(null)
  const [csvBusy, setCsvBusy] = useState(false)

  const cargar = useCallback(async (tabKey = tab, d = desde, h = hasta) => {
    setLoading(true); setError(''); setData(null)
    try {
      const t = auth.token
      const q = { desde: d, hasta: h }
      let res
      switch (tabKey) {
        case 'vendidos-hoy': res = await api.adminGetProductosVendidosHoy(t);             break
        case 'ventas':       res = await api.adminGetReporteVentas(t, q);                 break
        case 'productos':    res = await api.adminGetReporteProductos(t, { ...q, limit: 20 }); break
        case 'meseros':      res = await api.adminGetReporteMeseros(t, q);                break
        case 'categorias':   res = await api.adminGetReporteCategorias(t, q);             break
        case 'hora':         res = await api.adminGetReporteVentasHora(t, q);             break
        case 'metodos':      res = await api.adminGetReporteMetodosPago(t, q);            break
        default: res = null
      }
      setData(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [tab, desde, hasta, auth.token])

  useEffect(() => { cargar(initialTab, desde, hasta) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh silencioso cada 30s SOLO en la vista "Productos vendidos hoy"
  // (no muestra spinner — actualiza data en background).
  useEffect(() => {
    if (tab !== 'vendidos-hoy') return
    const id = setInterval(async () => {
      try {
        const res = await api.adminGetProductosVendidosHoy(auth.token)
        setData(res)
      } catch { /* silencioso: si falla, mantenemos la data anterior */ }
    }, 30_000)
    return () => clearInterval(id)
  }, [tab, auth.token])

  // Si el usuario navega a otra tab desde el menu (ej: rep-ventas-resumen -> rep-productos-top),
  // App.jsx re-renderiza este componente con distinto initialTab. Sin este efecto la tab
  // interna se quedaba pegada en la primera elegida.
  useEffect(() => {
    if (initialTab && initialTab !== tab) {
      setTab(initialTab)
      cargar(initialTab, desde, hasta)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab])

  const handleTab = (k) => {
    setTab(k)
    cargar(k, desde, hasta)
  }

  const handleRango = (tipo) => {
    const r = rangoRapido(tipo)
    setDesde(r.desde); setHasta(r.hasta)
    cargar(tab, r.desde, r.hasta)
  }

  const handleBuscar = () => cargar(tab, desde, hasta)

  const handleCsv = async (tipo) => {
    setCsvBusy(true)
    try {
      await api.adminExportarCsv(auth.token, tipo, desde, hasta)
    } catch (e) {
      alert('Error al exportar: ' + e.message)
    } finally {
      setCsvBusy(false)
    }
  }

  return (
    <div className="rep-screen">
      <div className="rep-header">
        <button className="rep-back" onClick={onVolver}>← Volver</button>
        <h2 className="rep-title">Reportes</h2>
      </div>

      <div className="rep-filter-bar">
        <div className="rep-date-group">
          <label>Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="rep-date-in" />
          <label>Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="rep-date-in" />
          <button className="rep-btn-buscar" onClick={handleBuscar}>Buscar</button>
        </div>
        <div className="rep-quick-btns">
          {[
            { k: 'hoy',          l: 'Hoy'          },
            { k: 'ayer',         l: 'Ayer'         },
            { k: 'semana',       l: 'Semana'       },
            { k: 'mes',          l: 'Este mes'     },
            { k: 'mes-anterior', l: 'Mes anterior' },
          ].map(({ k, l }) => (
            <button key={k} className="rep-qbtn" onClick={() => handleRango(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="rep-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`rep-tab-btn${tab === t.key ? ' rep-tab-active' : ''}`}
            onClick={() => handleTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rep-body">
        {loading && <div className="rep-loading">Cargando…</div>}
        {error   && <div className="rep-error">{error}</div>}

        {!loading && !error && data && (
          <>
            {tab === 'vendidos-hoy' && <TabVendidosHoy data={data} />}
            {tab === 'ventas'    && <TabVentas    data={data} onCsv={() => handleCsv('resumen')}  csvBusy={csvBusy} />}
            {tab === 'productos' && <TabProductos data={data} onCsv={() => handleCsv('productos')} csvBusy={csvBusy} />}
            {tab === 'meseros'   && <TabMeseros   data={data} onCsv={() => handleCsv('meseros')}  csvBusy={csvBusy} />}
            {tab === 'categorias'&& <TabCategorias data={data} />}
            {tab === 'hora'      && <TabHora       data={data} />}
            {tab === 'metodos'   && <TabMetodos    data={data} />}
          </>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// "PRODUCTOS VENDIDOS HOY" — vista en tiempo real (auto-refresh 30s)
// El backend devuelve { totalHoy, productos:[{productoId,nombre,categoria,color,cantidadVendida,totalAcumulado}] }
// ──────────────────────────────────────────────────────────────────
function TabVendidosHoy({ data }) {
  const productos = data?.productos ?? []
  const totalHoy  = data?.totalHoy ?? 0

  const fechaHoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  if (productos.length === 0) {
    return (
      <div className="rep-tab-content">
        <div className="vh-header">
          <div className="vh-fecha">{fechaHoy}</div>
          <div className="vh-total-line">TOTAL VENDIDO HOY: <span className="vh-total-amt">{fmtMXN(0)}</span></div>
        </div>
        <div className="vh-empty">
          <div className="vh-empty-icon"><Icon name="cerveza" size={56} strokeWidth={1.2} /></div>
          <div className="vh-empty-title">Aún no hay productos vendidos hoy</div>
          <div className="vh-empty-sub">En cuanto se cobre una cuenta, los productos aparecerán aquí.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="rep-tab-content">
      <div className="vh-header">
        <div className="vh-fecha">{fechaHoy}</div>
        <div className="vh-total-line">TOTAL VENDIDO HOY: <span className="vh-total-amt">{fmtMXN(totalHoy)}</span></div>
      </div>

      <div className="vh-grid">
        {productos.map(p => {
          const color = p.color || '#f0c842'
          const styleBg = {
            background: `radial-gradient(circle at top left, ${color}22 0%, #0d0d0d 70%)`,
            borderColor: `${color}55`,
          }
          return (
            <div key={p.productoId} className="vh-card" style={styleBg}>
              <div className="vh-card-cat" style={{ color }}>{p.categoria}</div>
              <div className="vh-card-nombre">{p.nombre}</div>
              <div className="vh-card-cant">{p.cantidadVendida}<span className="vh-card-x">×</span></div>
              <div className="vh-card-total">{fmtMXN(p.totalAcumulado)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TabVentas({ data, onCsv, csvBusy }) {
  const lineData = (data.ventasPorDia ?? []).map(d => ({
    x:       d.fecha,
    y:       d.total,
    cuentas: d.cuentas,
  }))

  return (
    <div className="rep-tab-content">
      <div className="rep-section-header">
        <h3>Resumen de ventas</h3>
        <button className="rep-csv-btn" onClick={onCsv} disabled={csvBusy}>
          {csvBusy ? 'Exportando…' : '⬇ CSV'}
        </button>
      </div>

      <div className="rep-kpi-row">
        <KpiCard label="Total ventas"     value={fmtMXN(data.totalVentas)}     />
        <KpiCard label="Cuentas"          value={data.totalCuentas}             />
        <KpiCard label="Ticket promedio"  value={fmtMXN(data.ticketPromedio)}   />
        <KpiCard label="Comisiones"       value={fmtMXN(data.totalComisiones)}  />
        <KpiCard label="Efectivo"         value={fmtMXN(data.totalEfectivo)}    />
        <KpiCard label="Tarjeta"          value={fmtMXN(data.totalTarjeta)}     />
      </div>

      {lineData.length > 0 && (
        <div className="rep-chart-card">
          <div className="rep-chart-title">Ventas por día</div>
          <LineChart data={lineData} xKey="x" yKey="y" color="#f0c842" height={240} />
        </div>
      )}
    </div>
  )
}

function TabProductos({ data, onCsv, csvBusy }) {
  const barData = (data ?? []).map(d => ({
    label:    d.productoNombre,
    value:    d.totalVentas,
    unidades: d.unidadesVendidas,
  }))

  return (
    <div className="rep-tab-content">
      <div className="rep-section-header">
        <h3>Productos más vendidos (top 20)</h3>
        <button className="rep-csv-btn" onClick={onCsv} disabled={csvBusy}>
          {csvBusy ? 'Exportando…' : '⬇ CSV'}
        </button>
      </div>

      <div className="rep-chart-card">
        <BarChartH data={barData} labelKey="label" valueKey="value" color="#f0c842" maxItems={20} />
      </div>

      <table className="rep-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Producto</th>
            <th>Categoría</th>
            <th className="rep-num">Uds vendidas</th>
            <th className="rep-num">Total ventas</th>
            <th className="rep-num">% del total</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((d, i) => (
            <tr key={d.productoId}>
              <td>{i + 1}</td>
              <td>{d.productoNombre}</td>
              <td>{d.categoriaNombre}</td>
              <td className="rep-num">{d.unidadesVendidas}</td>
              <td className="rep-num">{fmtMXN(d.totalVentas)}</td>
              <td className="rep-num">{Number(d.porcentajeDelTotal).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TabMeseros({ data, onCsv, csvBusy }) {
  const barData = (data ?? []).map(d => ({
    label: d.meseraNombre,
    value: d.totalVentas,
  }))

  return (
    <div className="rep-tab-content">
      <div className="rep-section-header">
        <h3>Ventas por mesero</h3>
        <button className="rep-csv-btn" onClick={onCsv} disabled={csvBusy}>
          {csvBusy ? 'Exportando…' : '⬇ CSV'}
        </button>
      </div>

      <div className="rep-chart-card">
        <BarChartH data={barData} labelKey="label" valueKey="value" color="#3498db" />
      </div>

      <table className="rep-table">
        <thead>
          <tr>
            <th>Mesero</th>
            <th className="rep-num">Cuentas</th>
            <th className="rep-num">Total ventas</th>
            <th className="rep-num">Ticket promedio</th>
            <th className="rep-num">% del total</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map(d => (
            <tr key={d.meseraId}>
              <td>{d.meseraNombre}</td>
              <td className="rep-num">{d.cantidadCuentas}</td>
              <td className="rep-num">{fmtMXN(d.totalVentas)}</td>
              <td className="rep-num">{fmtMXN(d.ticketPromedio)}</td>
              <td className="rep-num">{Number(d.porcentajeDelTotal).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TabCategorias({ data }) {
  const pieData = (data ?? []).map(d => ({
    label: d.categoriaNombre,
    value: d.totalVentas,
    color: d.color || '#f0c842',
  }))

  return (
    <div className="rep-tab-content">
      <div className="rep-section-header"><h3>Ventas por categoría</h3></div>

      <div className="rep-two-col">
        <div className="rep-chart-card rep-pie-card">
          <PieChart data={pieData} labelKey="label" valueKey="value" colorKey="color" size={200} />
        </div>

        <table className="rep-table rep-table-grow">
          <thead>
            <tr>
              <th>Categoría</th>
              <th className="rep-num">Uds</th>
              <th className="rep-num">Total</th>
              <th className="rep-num">%</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map(d => (
              <tr key={d.categoriaId}>
                <td>
                  <span className="rep-color-dot" style={{ background: d.color }} />
                  {d.categoriaNombre}
                </td>
                <td className="rep-num">{d.unidadesVendidas}</td>
                <td className="rep-num">{fmtMXN(d.totalVentas)}</td>
                <td className="rep-num">{Number(d.porcentajeDelTotal).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TabHora({ data }) {
  const barData = (data ?? []).map(d => ({
    x:       d.hora,
    y:       d.totalVentas,
    cuentas: d.cantidadCuentas,
  }))

  const peak = (data ?? []).reduce((a, b) => b.totalVentas > (a?.totalVentas ?? 0) ? b : a, null)

  return (
    <div className="rep-tab-content">
      <div className="rep-section-header"><h3>Ventas por hora del día</h3></div>

      {peak && peak.totalVentas > 0 && (
        <div className="rep-kpi-row">
          <KpiCard
            label="Hora pico"
            value={`${String(peak.hora).padStart(2,'0')}:00`}
            sub={fmtMXN(peak.totalVentas)}
          />
          <KpiCard label="Cuentas en hora pico" value={peak.cantidadCuentas} />
        </div>
      )}

      <div className="rep-chart-card rep-hora-chart">
        <BarChartV data={barData} xKey="x" yKey="y" color="#f0c842" height={220} />
      </div>

      <table className="rep-table">
        <thead>
          <tr>
            <th>Hora</th>
            <th className="rep-num">Total ventas</th>
            <th className="rep-num">Cuentas</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).filter(d => d.totalVentas > 0).map(d => (
            <tr key={d.hora}>
              <td>{String(d.hora).padStart(2,'0')}:00 – {String(d.hora + 1).padStart(2,'0')}:00</td>
              <td className="rep-num">{fmtMXN(d.totalVentas)}</td>
              <td className="rep-num">{d.cantidadCuentas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TabMetodos({ data }) {
  if (!data) return null

  const items = [
    { key: 'efectivo', label: 'Efectivo', color: '#2ecc71', d: data.efectivo },
    { key: 'tarjeta',  label: 'Tarjeta',  color: '#3498db', d: data.tarjeta  },
    { key: 'mixto',    label: 'Mixto',    color: '#f0c842', d: data.mixto    },
  ]

  const pieData = items.map(i => ({
    label: i.label,
    value: i.d?.total ?? 0,
    color: i.color,
  }))

  return (
    <div className="rep-tab-content">
      <div className="rep-section-header"><h3>Métodos de pago</h3></div>

      <div className="rep-two-col">
        <div className="rep-chart-card rep-pie-card">
          <PieChart data={pieData} labelKey="label" valueKey="value" colorKey="color" size={200} />
        </div>

        <div className="rep-metodo-cards">
          {items.map(({ label, color, d }) => (
            <div key={label} className="rep-metodo-card" style={{ borderLeftColor: color }}>
              <div className="rep-metodo-label">{label}</div>
              <div className="rep-metodo-total" style={{ color }}>{fmtMXN(d?.total ?? 0)}</div>
              <div className="rep-metodo-sub">
                {d?.cuentas ?? 0} cuentas · {Number(d?.porcentaje ?? 0).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
