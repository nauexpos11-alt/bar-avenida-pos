import { useState, useEffect } from 'react'
import { api } from '../api'
import './ReportesPanel.css'

const fmt    = (n) => `$${Number(n ?? 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
const fmtDec = (n) => `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function BarRow({ label, value, max, renderValue }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="bar-row">
      <span className="br-label">{label}</span>
      <div className="br-track">
        <div className="br-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="br-val">{renderValue ? renderValue(value) : value}</span>
    </div>
  )
}

export default function ReportesPanel({ auth, onClose }) {
  const [tab, setTab]           = useState('productos')
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [meseras, setMeseras]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      api.productosMasVendidos(auth.token).catch(() => []),
      api.ventasPorCategoria(auth.token).catch(() => []),
      api.ventasPorMesera(auth.token).catch(() => []),
    ])
      .then(([prods, cats, mes]) => {
        setProductos(Array.isArray(prods) ? prods : [])
        setCategorias(Array.isArray(cats) ? cats : [])
        setMeseras(Array.isArray(mes) ? mes : [])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [auth.token])

  // ── Helpers de campo flexible ───────────────────────
  const getProdNombre   = p => p.nombre ?? p.nombreProducto ?? '?'
  const getProdCantidad = p => p.cantidad ?? p.totalUnidades ?? p.cantidadVendida ?? 0
  const getProdTotal    = p => p.total ?? p.totalVentas ?? 0

  const getCatNombre    = c => c.nombre ?? c.nombreCategoria ?? '?'
  const getCatTotal     = c => c.total ?? c.totalVentas ?? 0

  const getMesNombre    = m => m.nombre ?? m.nombreMesera ?? m.mesera ?? '?'
  const getMesTotal     = m => m.totalVentas ?? m.total ?? 0
  const getMesOrdenes   = m => m.cantidadOrdenes ?? m.ordenes ?? m.ventas ?? 0

  // Máximos para normalizar barras
  const maxProd = Math.max(...productos.map(getProdTotal), 1)
  const maxCat  = Math.max(...categorias.map(getCatTotal), 1)
  const maxMes  = Math.max(...meseras.map(getMesTotal), 1)

  const TABS = [
    { id: 'productos',  label: 'PRODUCTOS' },
    { id: 'categorias', label: 'CATEGORÍAS' },
    { id: 'meseras',    label: 'MESERAS' },
  ]

  return (
    <div className="rep-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="rep-panel">

        {/* Header */}
        <div className="rep-header">
          <div className="rep-title">
            <span className="rep-icon">📊</span>
            REPORTES DEL DÍA
          </div>
          <button className="rep-close" onClick={onClose}>✕ CERRAR</button>
        </div>

        {/* Tabs */}
        <div className="rep-tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`rep-tab ${tab === t.id ? 'rep-tab-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="rep-body">
          {loading && <div className="rep-loading">Cargando reportes...</div>}
          {error   && <div className="rep-error">⚠ {error}</div>}

          {!loading && !error && tab === 'productos' && (
            <div className="rep-section">
              <div className="rep-section-title">Top productos más vendidos hoy</div>
              {productos.length === 0
                ? <div className="rep-empty">Sin datos disponibles</div>
                : productos.slice(0, 15).map((p, i) => (
                    <div key={i} className="bar-row-wrap">
                      <span className="br-rank">#{i + 1}</span>
                      <div className="bar-row">
                        <span className="br-label">{getProdNombre(p)}</span>
                        <div className="br-track">
                          <div className="br-fill" style={{ width: `${Math.min(100, (getProdTotal(p) / maxProd) * 100)}%` }} />
                        </div>
                        <div className="br-vals">
                          <span className="br-val">{fmtDec(getProdTotal(p))}</span>
                          <span className="br-sub">{getProdCantidad(p)} uds</span>
                        </div>
                      </div>
                    </div>
                  ))
              }
            </div>
          )}

          {!loading && !error && tab === 'categorias' && (
            <div className="rep-section">
              <div className="rep-section-title">Ventas por categoría hoy</div>
              {categorias.length === 0
                ? <div className="rep-empty">Sin datos disponibles</div>
                : categorias
                    .sort((a, b) => getCatTotal(b) - getCatTotal(a))
                    .map((c, i) => (
                      <div key={i} className="bar-row">
                        <span className="br-label">{getCatNombre(c)}</span>
                        <div className="br-track">
                          <div className="br-fill" style={{ width: `${Math.min(100, (getCatTotal(c) / maxCat) * 100)}%` }} />
                        </div>
                        <span className="br-val">{fmtDec(getCatTotal(c))}</span>
                      </div>
                    ))
              }
            </div>
          )}

          {!loading && !error && tab === 'meseras' && (
            <div className="rep-section">
              <div className="rep-section-title">Ventas por mesera hoy</div>
              {meseras.length === 0
                ? <div className="rep-empty">Sin datos disponibles</div>
                : meseras
                    .sort((a, b) => getMesTotal(b) - getMesTotal(a))
                    .map((m, i) => (
                      <div key={i} className="mesera-row">
                        <span className="mes-rank">#{i + 1}</span>
                        <div className="mes-info">
                          <div className="bar-row">
                            <span className="br-label">{getMesNombre(m)}</span>
                            <div className="br-track">
                              <div className="br-fill br-fill-green" style={{ width: `${Math.min(100, (getMesTotal(m) / maxMes) * 100)}%` }} />
                            </div>
                            <span className="br-val">{fmtDec(getMesTotal(m))}</span>
                          </div>
                          <span className="mes-ordenes">{getMesOrdenes(m)} órdenes</span>
                        </div>
                      </div>
                    ))
              }
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
