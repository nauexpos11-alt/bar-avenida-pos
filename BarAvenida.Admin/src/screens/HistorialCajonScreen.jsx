import { useState, useCallback, useEffect } from 'react'
import { api } from '../api'
import ToastContainer from '../components/Toast'
import './HistorialCajonScreen.css'

// ── Utilidades de fecha ────────────────────────────────────────────────────────

function diaInicio(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
}
function diaFin(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
}
function toInput(d) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const MAX_FILAS = 200

// ── Componente principal ───────────────────────────────────────────────────────

export default function HistorialCajonScreen({ auth, onVolver }) {
  const [desde,     setDesde]     = useState(toInput(diaInicio()))
  const [hasta,     setHasta]     = useState(toInput(diaFin()))
  const [registros, setRegistros] = useState([])
  const [cargando,  setCargando]  = useState(false)
  const [toasts,    setToasts]    = useState([])

  const toast = useCallback((mensaje, tipo = 'ok') => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, mensaje, tipo }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000)
  }, [])

  const buscar = useCallback(async (desdeVal, hastaVal) => {
    setCargando(true)
    try {
      const d = await api.adminGetRegistrosCajon(auth.token, {
        desde: new Date(desdeVal).toISOString(),
        hasta: new Date(hastaVal).toISOString(),
      })
      setRegistros(Array.isArray(d) ? d : [])
    } catch (e) {
      toast('Error al cargar registros: ' + e.message, 'error')
    } finally {
      setCargando(false)
    }
  }, [auth.token, toast])

  // Carga inicial al montar
  useEffect(() => {
    buscar(toInput(diaInicio()), toInput(diaFin()))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Filtros rápidos ──────────────────────────────────────────────────────────
  const aplicarRango = (inicio, fin) => {
    const d = toInput(inicio)
    const h = toInput(fin)
    setDesde(d)
    setHasta(h)
    buscar(d, h)
  }

  const filtroHoy   = () => aplicarRango(diaInicio(), diaFin())
  const filtroAyer  = () => {
    const ayer = new Date()
    ayer.setDate(ayer.getDate() - 1)
    aplicarRango(diaInicio(ayer), diaFin(ayer))
  }
  const filtro7dias = () => {
    const hace6 = new Date()
    hace6.setDate(hace6.getDate() - 6)
    aplicarRango(diaInicio(hace6), diaFin())
  }
  const filtroMes   = () => {
    const hoy   = new Date()
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    aplicarRango(diaInicio(inicio), diaFin())
  }

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const totalAperturas = registros.length
  const aperturasAuto  = registros.filter(r => r.cuentaId).length
  const aperturasMan   = registros.filter(r => !r.cuentaId).length

  const filas  = registros.slice(0, MAX_FILAS)
  const hayMas = registros.length > MAX_FILAS

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="hcj-screen">
      <ToastContainer
        toasts={toasts}
        onDismiss={id => setToasts(ts => ts.filter(t => t.id !== id))}
      />

      {/* Header */}
      <div className="hcj-header">
        <div>
          <h2 className="hcj-titulo">💰  HISTORIAL DE CAJÓN</h2>
          <div className="hcj-breadcrumb">CAJA &rsaquo; Historial de cajón</div>
        </div>
        {onVolver && (
          <button className="hcj-btn-cerrar" onClick={onVolver} title="Volver al dashboard">
            ✕
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="hcj-filtros">
        <div className="hcj-filtros-row">
          <div className="hcj-campo">
            <label className="hcj-campo-lbl">Desde</label>
            <input
              type="datetime-local"
              className="hcj-input"
              value={desde}
              onChange={e => setDesde(e.target.value)}
            />
          </div>
          <div className="hcj-campo">
            <label className="hcj-campo-lbl">Hasta</label>
            <input
              type="datetime-local"
              className="hcj-input"
              value={hasta}
              onChange={e => setHasta(e.target.value)}
            />
          </div>
          <div className="hcj-rapidos">
            <button className="hcj-btn-rap" onClick={filtroHoy}>Hoy</button>
            <button className="hcj-btn-rap" onClick={filtroAyer}>Ayer</button>
            <button className="hcj-btn-rap" onClick={filtro7dias}>Últimos 7 días</button>
            <button className="hcj-btn-rap" onClick={filtroMes}>Este mes</button>
          </div>
          <button
            className="hcj-btn-buscar"
            onClick={() => buscar(desde, hasta)}
            disabled={cargando}
          >
            {cargando ? '↻ Cargando...' : '🔍 Buscar'}
          </button>
          <button
            className="hcj-btn-ref"
            onClick={() => buscar(desde, hasta)}
            disabled={cargando}
            title="Refrescar"
          >
            ↻
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="hcj-kpis">
        <div className="hcj-kpi">
          <span className="hcj-kpi-val">{totalAperturas}</span>
          <span className="hcj-kpi-lbl">Total aperturas</span>
        </div>
        <div className="hcj-kpi hcj-kpi-auto">
          <span className="hcj-kpi-val">{aperturasAuto}</span>
          <span className="hcj-kpi-lbl">🟢 Por cobro (auto)</span>
        </div>
        <div className="hcj-kpi hcj-kpi-man">
          <span className="hcj-kpi-val">{aperturasMan}</span>
          <span className="hcj-kpi-lbl">🟡 Manuales</span>
        </div>
      </div>

      {/* Tabla */}
      <div className="hcj-tabla-wrap">
        {hayMas && (
          <div className="hcj-alerta">
            Mostrando las primeras {MAX_FILAS} de {totalAperturas} — refina los filtros para ver más
          </div>
        )}
        <table className="hcj-tabla">
          <thead>
            <tr>
              <th>Fecha / Hora</th>
              <th>Usuario</th>
              <th>Motivo</th>
              <th>Cuenta</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={5} className="hcj-vacio">
                  {cargando ? 'Cargando...' : 'Sin aperturas en el rango seleccionado'}
                </td>
              </tr>
            ) : (
              filas.map((r, i) => (
                <tr
                  key={r.id}
                  className={`hcj-fila${i % 2 === 0 ? ' hcj-par' : ' hcj-impar'}`}
                >
                  <td className="hcj-td-fecha">
                    {new Date(r.fecha).toLocaleString('es-MX', {
                      day: '2-digit', month: '2-digit',
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                    })}
                  </td>
                  <td>{r.usuarioNombre}</td>
                  <td>{r.motivo}</td>
                  <td className="hcj-td-cuenta">
                    {r.cuentaId ? `#${r.cuentaId}` : '—'}
                  </td>
                  <td>
                    {r.cuentaId
                      ? <span className="hcj-tag hcj-tag-auto">🟢 Auto</span>
                      : <span className="hcj-tag hcj-tag-man">🟡 Manual</span>
                    }
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="hcj-footer">
        Mostrando {Math.min(totalAperturas, MAX_FILAS)} de {totalAperturas}{' '}
        apertura{totalAperturas !== 1 ? 's' : ''}
        {cargando && <span className="hcj-footer-cargando"> · actualizando...</span>}
      </div>
    </div>
  )
}
