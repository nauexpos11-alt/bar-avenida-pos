import { useState, useCallback, useEffect } from 'react'
import { api } from '../api'
import ToastContainer from '../components/Toast'
import DetalleCuentaModal from '../components/DetalleCuentaModal'
import './ConsultaCuentasScreen.css'

const fmt = n => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function toInput(d = new Date()) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T00:00`
}
function toInputFin(d = new Date()) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T23:59`
}

const fmtFecha = d => d
  ? new Date(d).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—'

const CHIPS = {
  Abierta:   { cls: 'ccs-chip-abierta',   label: '● Abierta'   },
  Cobrada:   { cls: 'ccs-chip-cobrada',   label: '● Cobrada'   },
  Cancelada: { cls: 'ccs-chip-cancelada', label: '● Cancelada' },
}

export default function ConsultaCuentasScreen({ auth, onVolver }) {
  const [cuentas,  setCuentas]  = useState([])
  const [cargando, setCargando] = useState(false)
  const [desde,    setDesde]    = useState(toInput())
  const [hasta,    setHasta]    = useState(toInputFin())
  const [estado,   setEstado]   = useState('')
  const [folio,    setFolio]    = useState('')
  const [detalle,  setDetalle]  = useState(null)
  const [toasts,   setToasts]   = useState([])

  const toast = useCallback((msg, tipo = 'ok') => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, mensaje: msg, tipo }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4500)
  }, [])

  const buscar = useCallback(async () => {
    setCargando(true)
    try {
      const params = {}
      if (desde)  params.desde  = new Date(desde).toISOString()
      if (hasta)  params.hasta  = new Date(hasta).toISOString()
      if (estado) params.estado = estado
      if (folio)  params.folio  = parseInt(folio)
      const data = await api.adminGetCuentas(auth.token, params)
      setCuentas(Array.isArray(data) ? data : [])
    } catch (e) {
      toast('Error al cargar cuentas: ' + e.message, 'error')
    } finally {
      setCargando(false)
    }
  }, [auth.token, desde, hasta, estado, folio, toast])

  useEffect(() => { buscar() }, []) // eslint-disable-line

  // Quick date helpers — buscan directamente para evitar stale state
  const buscarDates = async (d, h) => {
    setDesde(d); setHasta(h)
    setCargando(true)
    try {
      const params = { desde: new Date(d).toISOString(), hasta: new Date(h).toISOString() }
      if (estado) params.estado = estado
      if (folio)  params.folio  = parseInt(folio)
      const data = await api.adminGetCuentas(auth.token, params)
      setCuentas(Array.isArray(data) ? data : [])
    } catch (e) {
      toast('Error: ' + e.message, 'error')
    } finally {
      setCargando(false)
    }
  }

  const setHoy = () => buscarDates(toInput(), toInputFin())

  const setAyer = () => {
    const d = new Date(); d.setDate(d.getDate() - 1)
    buscarDates(toInput(d), toInputFin(d))
  }

  const setSemana = () => {
    const d = new Date(); d.setDate(d.getDate() - 7)
    buscarDates(toInput(d), toInputFin())
  }

  const setMes = () => {
    const d = new Date(); d.setDate(1)
    buscarDates(toInput(d), toInputFin())
  }

  // KPIs
  const cobradas  = cuentas.filter(c => c.estado === 'Cobrada')
  const canceladas = cuentas.filter(c => c.estado === 'Cancelada')
  const totalVentas = cobradas.reduce((s, c) => s + (c.total || 0), 0)

  return (
    <div className="ccs-screen">
      <ToastContainer
        toasts={toasts}
        onDismiss={id => setToasts(ts => ts.filter(t => t.id !== id))}
      />

      {/* Header */}
      <div className="ccs-header">
        <div>
          <h2 className="ccs-titulo">📊 HISTÓRICO DE CUENTAS</h2>
          <div className="ccs-breadcrumb">CONSULTAS › Histórico de cuentas</div>
        </div>
        {onVolver && (
          <button className="ccs-btn-x" onClick={onVolver} title="Volver al dashboard">✕</button>
        )}
      </div>

      {/* Filtros */}
      <div className="ccs-filtros">
        <div className="ccs-filtros-row">
          <div className="ccs-campo">
            <label className="ccs-lbl">Desde</label>
            <input
              type="datetime-local"
              className="ccs-input"
              value={desde}
              onChange={e => setDesde(e.target.value)}
            />
          </div>
          <div className="ccs-campo">
            <label className="ccs-lbl">Hasta</label>
            <input
              type="datetime-local"
              className="ccs-input"
              value={hasta}
              onChange={e => setHasta(e.target.value)}
            />
          </div>
          <div className="ccs-campo">
            <label className="ccs-lbl">Estado</label>
            <select className="ccs-input" value={estado} onChange={e => setEstado(e.target.value)}>
              <option value="">Todas</option>
              <option value="Abierta">Abiertas</option>
              <option value="Cobrada">Cobradas</option>
              <option value="Cancelada">Canceladas</option>
            </select>
          </div>
          <div className="ccs-campo ccs-campo-sm">
            <label className="ccs-lbl">Folio</label>
            <input
              type="number"
              className="ccs-input"
              placeholder="Ej: 42"
              value={folio}
              onChange={e => setFolio(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()}
            />
          </div>
          <button className="ccs-btn-buscar" onClick={buscar} disabled={cargando}>
            {cargando ? '↻ Buscando...' : '🔍 Buscar'}
          </button>
          <button className="ccs-btn-ref" onClick={buscar} disabled={cargando} title="Refrescar">↻</button>
        </div>
        <div className="ccs-quick-row">
          <span className="ccs-quick-lbl">Acceso rápido:</span>
          <button className="ccs-btn-quick" onClick={setHoy} disabled={cargando}>Hoy</button>
          <button className="ccs-btn-quick" onClick={setAyer} disabled={cargando}>Ayer</button>
          <button className="ccs-btn-quick" onClick={setSemana} disabled={cargando}>Última semana</button>
          <button className="ccs-btn-quick" onClick={setMes} disabled={cargando}>Este mes</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="ccs-kpis">
        <div className="ccs-kpi">
          <span className="ccs-kpi-val">{cuentas.length}</span>
          <span className="ccs-kpi-lbl">Total cuentas</span>
        </div>
        <div className="ccs-kpi ccs-kpi-cobrada">
          <span className="ccs-kpi-val">{cobradas.length}</span>
          <span className="ccs-kpi-lbl">Cobradas</span>
        </div>
        <div className="ccs-kpi ccs-kpi-cancelada">
          <span className="ccs-kpi-val">{canceladas.length}</span>
          <span className="ccs-kpi-lbl">Canceladas</span>
        </div>
        <div className="ccs-kpi ccs-kpi-ventas">
          <span className="ccs-kpi-val">{fmt(totalVentas)}</span>
          <span className="ccs-kpi-lbl">Total ventas</span>
        </div>
      </div>

      {/* Tabla */}
      <div className="ccs-tabla-wrap">
        <table className="ccs-tabla">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Apertura</th>
              <th>Mesa</th>
              <th>Mesera</th>
              <th>Estado</th>
              <th>Método</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {cuentas.length === 0 ? (
              <tr>
                <td colSpan={7} className="ccs-vacio">
                  {cargando ? 'Buscando...' : 'Sin cuentas en el rango seleccionado'}
                </td>
              </tr>
            ) : cuentas.map((c, i) => {
              const chip = CHIPS[c.estado] || { cls: '', label: c.estado }
              return (
                <tr
                  key={c.id}
                  className={`ccs-fila${i % 2 === 0 ? ' ccs-par' : ' ccs-impar'}`}
                  onClick={() => setDetalle(c.id)}
                >
                  <td className="ccs-td-folio">#{String(c.folio).padStart(4, '0')}</td>
                  <td className="ccs-td-fecha">{fmtFecha(c.fechaApertura)}</td>
                  <td>{c.mesaNumero}</td>
                  <td>{c.meseraNombre}</td>
                  <td><span className={`ccs-chip ${chip.cls}`}>{chip.label}</span></td>
                  <td className="ccs-td-metodo">{c.metodoPago || '—'}</td>
                  <td className="ccs-td-total">{fmt(c.total)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="ccs-footer">
        Mostrando {cuentas.length} cuenta{cuentas.length !== 1 ? 's' : ''}
        {cuentas.length >= 200 && (
          <span className="ccs-footer-aviso"> · Refina los filtros para ver más resultados</span>
        )}
        {cargando && <span className="ccs-footer-carg"> · actualizando...</span>}
      </div>

      {/* Modal de detalle */}
      {detalle && (
        <DetalleCuentaModal
          auth={auth}
          cuentaId={detalle}
          onClose={() => setDetalle(null)}
          onRefresh={() => { buscar(); setDetalle(null) }}
          toast={toast}
        />
      )}
    </div>
  )
}
