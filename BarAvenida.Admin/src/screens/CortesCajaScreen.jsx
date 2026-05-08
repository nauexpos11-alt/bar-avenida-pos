import { useState, useCallback, useEffect } from 'react'
import { api } from '../api'
import Modal from '../components/Modal'
import ToastContainer from '../components/Toast'
import './CortesCajaScreen.css'

const fmt = n => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtFecha = d => new Date(d).toLocaleString('es-MX', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
})

function toInput(d = new Date()) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T00:00`
}
function toInputFin(d = new Date()) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T23:59`
}

export default function CortesCajaScreen({ auth, tab = 'x', onVolver }) {
  const [activeTab, setActiveTab] = useState(tab)
  useEffect(() => setActiveTab(tab), [tab])

  const [toasts, setToasts] = useState([])
  const toast = useCallback((msg, tipo = 'ok') => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, msg, tipo }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4500)
  }, [])

  return (
    <div className="cc-screen">
      <ToastContainer
        toasts={toasts.map(t => ({ id: t.id, mensaje: t.msg, tipo: t.tipo }))}
        onDismiss={id => setToasts(ts => ts.filter(t => t.id !== id))}
      />

      {/* Header */}
      <div className="cc-header">
        <div>
          <h2 className="cc-titulo">CORTES DE CAJA</h2>
          <div className="cc-breadcrumb">CAJA &rsaquo; Cortes de caja</div>
        </div>
        {onVolver && (
          <button className="cc-btn-x" onClick={onVolver} title="Volver al dashboard">✕</button>
        )}
      </div>

      {/* Tabs */}
      <div className="cc-tabs">
        {[
          { key: 'x',          label: 'Corte X (Parcial)' },
          { key: 'z',          label: 'Corte Z (Cierre)' },
          { key: 'historico',  label: 'Histórico' },
          { key: 'incidentes', label: 'Incidentes' },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`cc-tab${activeTab === key ? ' cc-tab-active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="cc-content">
        {activeTab === 'x'          && <TabX auth={auth} toast={toast} />}
        {activeTab === 'z'          && <TabZ auth={auth} toast={toast} />}
        {activeTab === 'historico'  && <TabHistorico auth={auth} toast={toast} />}
        {activeTab === 'incidentes' && <TabIncidentes auth={auth} toast={toast} />}
      </div>
    </div>
  )
}

// ── Tab X ─────────────────────────────────────────────────────────────────────

function TabX({ auth, toast }) {
  const [corte,    setCorte]    = useState(null)
  const [cargando, setCargando] = useState(false)
  const [imprimiendo, setImprimiendo] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const d = await api.adminGetCorteX(auth.token)
      setCorte(d)
    } catch (e) {
      toast(e.message || 'Error al obtener corte X', 'error')
    } finally {
      setCargando(false)
    }
  }, [auth.token, toast])

  useEffect(() => { cargar() }, [cargar])

  // El corte X es una vista previa (sin persistir). Para simular, usamos los datos del preview.
  // La impresión del corte X no persiste en BD — solo genera archivos con timestamp.
  const simular = async () => {
    if (!corte) { toast('No hay datos de corte X para imprimir', 'error'); return }
    setImprimiendo(true)
    try {
      // Si hay un corte Z guardado (id existente), lo reimprimimos; si no, avisamos
      if (corte.id) {
        const r = await api.adminImprimirCorte(auth.token, corte.id, 'X')
        toast(r.modoSimulado ? '📄 Archivos simulados regenerados' : (r.mensaje || 'Impreso'))
      } else {
        toast('El Corte X es solo una vista previa. Usa Corte Z para generar archivos persistentes.', 'error')
      }
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setImprimiendo(false)
    }
  }

  return (
    <div className="cc-tab-body">
      <div className="cc-tab-actions">
        <button className="cc-btn-ref" onClick={cargar} disabled={cargando}>
          {cargando ? '↻ Cargando...' : '↻ Actualizar'}
        </button>
      </div>

      {!corte && !cargando && (
        <div className="cc-empty">No hay turno abierto actualmente</div>
      )}

      {corte && (
        <>
          <div className="cc-info-row">
            <span className="cc-info-chip">Turno #{corte.turnoId}</span>
            <span className="cc-info-fecha">{fmtFecha(corte.fecha)}</span>
            <span className="cc-info-chip">Cajero: {corte.usuarioNombre}</span>
          </div>
          <CorteKpis corte={corte} />
          <div className="cc-tab-actions cc-tab-actions-bottom">
            <button
              className="cc-btn-sim"
              onClick={simular}
              disabled={imprimiendo || !corte.id}
              title="Solo funciona si hay un Corte Z guardado"
            >
              {imprimiendo ? 'Generando...' : '🖨️ Simular impresión'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Tab Z ─────────────────────────────────────────────────────────────────────

function TabZ({ auth, toast }) {
  const [turno,           setTurno]           = useState(undefined)
  const [preview,         setPreview]          = useState(null)
  const [cargando,        setCargando]         = useState(false)
  const [resultado,       setResultado]        = useState(null)
  const [modal,           setModal]            = useState(false)
  const [pin,             setPin]              = useState('')
  const [notas,           setNotas]            = useState('')
  const [efectivoContado, setEfectivoContado]  = useState('')
  const [enviando,        setEnviando]         = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [t, p] = await Promise.all([
        api.adminGetTurnoActual(auth.token),
        api.adminGetCorteX(auth.token).catch(() => null),
      ])
      setTurno(t ?? null)
      setPreview(p)
    } catch (e) {
      toast(e.message || 'Error al cargar datos', 'error')
      setTurno(null)
    } finally {
      setCargando(false)
    }
  }, [auth.token, toast])

  useEffect(() => { cargar() }, [cargar])

  const handleZ = async () => {
    if (!pin) { toast('Ingresa tu PIN', 'error'); return }
    setEnviando(true)
    try {
      const res = await api.adminCerrarTurno(auth.token, {
        turnoId: turno.id,
        pin,
        efectivoContado: parseFloat(efectivoContado) || 0,
        notas: notas || null,
      })
      const corte = res?.corte ?? res
      setResultado(corte)
      setModal(false)
      setTurno(null)
      setPreview(null)
      toast(corte?.modoSimulado ? '📄 Corte Z generado — archivos simulados creados' : '✅ Corte Z generado y turno cerrado')
    } catch (e) {
      toast(e.message || 'Error al generar Corte Z', 'error')
    } finally {
      setEnviando(false)
    }
  }

  const efectivoEsperado = preview?.efectivoEnCaja ?? 0
  const montoContado     = parseFloat(efectivoContado) || 0
  const diferencia       = montoContado - efectivoEsperado
  const difSign          = diferencia >= 0 ? '+' : ''
  const difColor         = diferencia === 0 ? '#27ae60' : '#e74c3c'

  if (resultado) {
    return (
      <div className="cc-tab-body">
        <div className="cc-resultado-ok">
          <span className="cc-resultado-icon">✅</span>
          <h3>Turno cerrado — Corte Z #{resultado.id} generado</h3>
          <p>{fmtFecha(resultado.fecha)}</p>
          {resultado.modoSimulado && (
            <p className="cc-sim-aviso">📄 Archivos simulados guardados en F:\BarAvenida\TicketsImpresos\</p>
          )}
          <CorteKpis corte={resultado} />
          <button className="cc-btn-ref" onClick={() => setResultado(null)} style={{ marginTop: 16 }}>
            ↻ Ver estado actual
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="cc-tab-body">
      {cargando && <div className="cc-empty">Cargando...</div>}

      {!cargando && !turno && !resultado && (
        <div className="cc-empty">No hay turno abierto. Abre un turno desde <strong>Apertura de turno</strong> para poder generar un Corte Z.</div>
      )}

      {turno && (
        <>
          <div className="cc-aviso-z">
            El Corte Z <strong>cierra el turno #{turno.id}</strong> y genera el resumen definitivo del día.
            Esta acción no se puede deshacer.
          </div>
          <div className="cc-info-row">
            <span className="cc-info-chip">Turno #{turno.id}</span>
            <span className="cc-info-fecha">Apertura: {fmtFecha(turno.fechaApertura)}</span>
            <span className="cc-info-chip">Fondo: {fmt(turno.montoInicial)}</span>
          </div>

          {preview && (
            <>
              <div className="cc-preview-lbl">Vista previa del corte:</div>
              <CorteKpis corte={preview} />
            </>
          )}

          <div className="cc-tab-actions cc-tab-actions-bottom">
            <button className="cc-btn-ref" onClick={cargar} disabled={cargando}>↻ Actualizar</button>
            <button className="cc-btn-corte-z" onClick={() => { setPin(''); setNotas(''); setEfectivoContado(''); setModal(true) }}>
              🔒 CERRAR Y GUARDAR CORTE Z
            </button>
          </div>
        </>
      )}

      {modal && (
        <Modal
          titulo="Confirmar Cierre de Turno"
          onClose={() => setModal(false)}
          accionLabel={enviando ? 'Cerrando...' : '🔒 Cerrar y guardar Corte Z'}
          onAccion={handleZ}
          accionPeligrosa
        >
          <div className="tc-form">
            <p className="tc-aviso">
              Se cerrará el turno #{turno?.id} y se registrará el Corte Z con los totales actuales.
            </p>
            {preview && (
              <div style={{ marginBottom: 8, fontSize: 13, color: '#888' }}>
                Efectivo esperado en caja: <strong>{fmt(preview.efectivoEnCaja)}</strong>
              </div>
            )}
            <label className="tc-lbl">Efectivo contado en caja ($)</label>
            <input
              className="tc-input"
              type="number"
              min="0"
              step="50"
              placeholder="0.00"
              value={efectivoContado}
              onChange={e => setEfectivoContado(e.target.value)}
              autoFocus
            />
            {efectivoContado !== '' && preview && (
              <div style={{ fontWeight: 700, fontSize: 15, color: difColor, margin: '4px 0 8px' }}>
                Diferencia: {difSign}{fmt(diferencia)}
              </div>
            )}
            <label className="tc-lbl">Notas del corte (opcional)</label>
            <textarea
              className="tc-input tc-textarea"
              placeholder="Observaciones del cierre..."
              maxLength={200}
              value={notas}
              onChange={e => setNotas(e.target.value)}
            />
            <label className="tc-lbl">PIN de administrador</label>
            <input
              className="tc-input"
              type="password"
              placeholder="••••"
              maxLength={8}
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleZ()}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Tab Histórico ─────────────────────────────────────────────────────────────

function TabHistorico({ auth, toast }) {
  const [cortes,   setCortes]   = useState([])
  const [cargando, setCargando] = useState(false)
  const [desde,    setDesde]    = useState(toInput())
  const [hasta,    setHasta]    = useState(toInputFin())
  const [reimprimiendo, setReimprimiendo] = useState(null)

  const buscar = useCallback(async (d, h) => {
    setCargando(true)
    try {
      const data = await api.adminGetCortes(auth.token, {
        desde: new Date(d).toISOString(),
        hasta: new Date(h).toISOString(),
      })
      setCortes(Array.isArray(data) ? data : [])
    } catch (e) {
      toast(e.message || 'Error al cargar cortes', 'error')
    } finally {
      setCargando(false)
    }
  }, [auth.token, toast])

  useEffect(() => { buscar(desde, hasta) }, []) // eslint-disable-line

  const reimprimir = async (corte) => {
    setReimprimiendo(corte.id)
    try {
      const r = await api.adminImprimirCorte(auth.token, corte.id, corte.tipo)
      toast(r.modoSimulado ? '📄 Archivos simulados regenerados' : r.mensaje)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setReimprimiendo(null)
    }
  }

  return (
    <div className="cc-tab-body">
      <div className="cc-filtros">
        <div className="cc-campo">
          <label className="cc-campo-lbl">Desde</label>
          <input
            type="datetime-local"
            className="cc-input-date"
            value={desde}
            onChange={e => setDesde(e.target.value)}
          />
        </div>
        <div className="cc-campo">
          <label className="cc-campo-lbl">Hasta</label>
          <input
            type="datetime-local"
            className="cc-input-date"
            value={hasta}
            onChange={e => setHasta(e.target.value)}
          />
        </div>
        <button className="cc-btn-buscar" onClick={() => buscar(desde, hasta)} disabled={cargando}>
          {cargando ? '↻ Buscando...' : '🔍 Buscar'}
        </button>
      </div>

      <div className="cc-tabla-wrap">
        <table className="cc-tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Tipo</th>
              <th>Fecha</th>
              <th>Cajero</th>
              <th>Ventas</th>
              <th>Efectivo</th>
              <th>Tarjeta</th>
              <th>Retiros</th>
              <th>En caja</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cortes.length === 0 ? (
              <tr><td colSpan={10} className="cc-vacio">
                {cargando ? 'Cargando...' : 'Sin cortes en el rango seleccionado'}
              </td></tr>
            ) : cortes.map((c, i) => (
              <tr key={c.id} className={`cc-fila${i % 2 === 0 ? ' cc-par' : ' cc-impar'}`}>
                <td className="cc-td-id">{c.id}</td>
                <td>
                  <span className={`cc-tag cc-tag-${c.tipo?.toLowerCase()}`}>{c.tipo}</span>
                </td>
                <td className="cc-td-fecha">{fmtFecha(c.fecha)}</td>
                <td>{c.usuarioNombre}</td>
                <td className="cc-td-num">{fmt(c.totalVentas)}</td>
                <td className="cc-td-num">{fmt(c.totalEfectivo)}</td>
                <td className="cc-td-num">{fmt(c.totalTarjeta)}</td>
                <td className="cc-td-num cc-td-retiro">{fmt(c.totalRetiros)}</td>
                <td className="cc-td-num cc-td-caja">{fmt(c.efectivoEnCaja)}</td>
                <td>
                  <button
                    className="cc-btn-reimp"
                    onClick={() => reimprimir(c)}
                    disabled={reimprimiendo === c.id}
                    title="Reimprimir / Regenerar archivos"
                  >
                    {reimprimiendo === c.id ? '...' : '🖨️'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cc-footer">
        {cortes.length} corte{cortes.length !== 1 ? 's' : ''} encontrado{cortes.length !== 1 ? 's' : ''}
        {cargando && <span className="cc-footer-carg"> · actualizando...</span>}
      </div>
    </div>
  )
}

// ── Tab Incidentes (PROMPT C.3) ───────────────────────────────────────────────

const PAGE_SIZE_INC = 50

function badgeSev(sev) {
  const map = {
    Verde:    { bg: '#0a3a2a', color: '#6ee7b7' },
    Amarilla: { bg: '#1a1500', color: '#fbbf24' },
    Roja:     { bg: '#2a0808', color: '#fca5a5' },
  }
  const s = map[sev] ?? { bg: '#1a1a1a', color: '#888' }
  return (
    <span style={{
      background: s.bg, color: s.color,
      border: `1px solid ${s.color}`,
      borderRadius: 4, padding: '2px 8px',
      fontSize: '0.75rem', fontWeight: 700,
    }}>
      {sev}
    </span>
  )
}

function TabIncidentes({ auth, toast }) {
  const hoy = new Date()
  const hace7 = new Date(hoy); hace7.setDate(hoy.getDate() - 7)

  const [incidentes, setIncidentes] = useState([])
  const [cargando,   setCargando]   = useState(false)
  const [desde,      setDesde]      = useState(toInput(hace7))
  const [hasta,      setHasta]      = useState(toInputFin())
  const [page,       setPage]       = useState(1)
  const [total,      setTotal]      = useState(0)

  const buscar = useCallback(async (d, h, p = 1) => {
    setCargando(true)
    try {
      const data = await api.adminGetIncidentes(auth.token, {
        desde:    new Date(d).toISOString(),
        hasta:    new Date(h).toISOString(),
        page:     p,
        pageSize: PAGE_SIZE_INC,
      })
      setIncidentes(Array.isArray(data?.items) ? data.items : [])
      setTotal(data?.total ?? 0)
      setPage(p)
    } catch (e) {
      toast(e.message || 'Error al cargar incidentes', 'error')
    } finally {
      setCargando(false)
    }
  }, [auth.token, toast])

  useEffect(() => { buscar(desde, hasta) }, []) // eslint-disable-line

  const setRango = (dias) => {
    const d = new Date(); d.setDate(d.getDate() - dias)
    const dStr = toInput(d)
    const hStr = toInputFin()
    setDesde(dStr); setHasta(hStr)
    buscar(dStr, hStr, 1)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE_INC))

  return (
    <div className="cc-tab-body">
      <div className="cc-filtros">
        <button className="cci-btn-rango" onClick={() => setRango(7)}>Últimos 7 días</button>
        <button className="cci-btn-rango" onClick={() => setRango(30)}>Últimos 30 días</button>
        <div className="cc-campo">
          <label className="cc-campo-lbl">Desde</label>
          <input type="datetime-local" className="cc-input-date" value={desde}
            onChange={e => setDesde(e.target.value)} />
        </div>
        <div className="cc-campo">
          <label className="cc-campo-lbl">Hasta</label>
          <input type="datetime-local" className="cc-input-date" value={hasta}
            onChange={e => setHasta(e.target.value)} />
        </div>
        <button className="cc-btn-buscar" onClick={() => buscar(desde, hasta, 1)} disabled={cargando}>
          {cargando ? '↻ Buscando...' : '🔍 Buscar'}
        </button>
      </div>

      <div className="cc-tabla-wrap">
        <table className="cc-tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Turno</th>
              <th>Corte</th>
              <th>Tipo</th>
              <th>Severidad</th>
              <th>Diferencia</th>
              <th>Esperado</th>
              <th>Contado</th>
              <th>Justificación</th>
              <th>Autorizado por</th>
            </tr>
          </thead>
          <tbody>
            {incidentes.length === 0 ? (
              <tr><td colSpan={10} className="cc-vacio">
                {cargando ? 'Cargando...' : 'Sin incidentes en el rango seleccionado ✅'}
              </td></tr>
            ) : incidentes.map((inc, i) => (
              <tr key={inc.id} className={`cc-fila${i % 2 === 0 ? ' cc-par' : ' cc-impar'}`}>
                <td className="cc-td-fecha">{fmtFecha(inc.fechaRegistro)}</td>
                <td className="cc-td-id">#{inc.turnoId}</td>
                <td className="cc-td-id">{inc.corteId ? `#${inc.corteId}` : '—'}</td>
                <td>
                  <span className={`cci-tag-tipo cci-tipo-${inc.tipo?.toLowerCase()}`}>{inc.tipo}</span>
                </td>
                <td>{badgeSev(inc.severidad)}</td>
                <td className="cc-td-num cci-dif">
                  {inc.diferencia >= 0 ? '+' : ''}{fmt(inc.diferencia)}
                </td>
                <td className="cc-td-num">{fmt(inc.efectivoEsperado)}</td>
                <td className="cc-td-num">{fmt(inc.efectivoContado)}</td>
                <td className="cci-just" title={inc.justificacion || ''}>
                  {inc.justificacion
                    ? (inc.justificacion.length > 40 ? inc.justificacion.slice(0, 40) + '…' : inc.justificacion)
                    : <span style={{ color: '#444' }}>—</span>}
                </td>
                <td style={{ color: '#888', fontSize: '0.82rem' }}>{inc.autorizadoPorNombre ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="cci-paginacion">
          <button className="cci-pag-btn" onClick={() => buscar(desde, hasta, 1)}
            disabled={page === 1 || cargando}>«</button>
          <button className="cci-pag-btn" onClick={() => buscar(desde, hasta, page - 1)}
            disabled={page === 1 || cargando}>‹</button>
          <span className="cci-pag-info">{page} de {totalPages}</span>
          <button className="cci-pag-btn" onClick={() => buscar(desde, hasta, page + 1)}
            disabled={page === totalPages || cargando}>›</button>
          <button className="cci-pag-btn" onClick={() => buscar(desde, hasta, totalPages)}
            disabled={page === totalPages || cargando}>»</button>
        </div>
      )}

      <div className="cc-footer">
        {total} incidente{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
        {cargando && <span className="cc-footer-carg"> · actualizando...</span>}
      </div>
    </div>
  )
}

// ── KPI cards compartidas ─────────────────────────────────────────────────────

function CorteKpis({ corte }) {
  return (
    <div className="cc-kpis">
      <KpiCard label="Cuentas cobradas" val={corte.cuentasCobradas} tipo="num" />
      <KpiCard label="Ventas (subtotal)" val={fmt(corte.totalVentas)} />
      <KpiCard label="Efectivo recibido" val={fmt(corte.totalEfectivo)} tipo="efect" />
      <KpiCard label="Tarjeta recibida"  val={fmt(corte.totalTarjeta)} tipo="tar" />
      {corte.totalComision > 0 && (
        <KpiCard label="Comisión tarjeta" val={fmt(corte.totalComision)} />
      )}
      <KpiCard label="Total retiros"    val={fmt(corte.totalRetiros)} tipo="retiro" />
      <KpiCard label="Efectivo en caja" val={fmt(corte.efectivoEnCaja)} tipo="caja" />
    </div>
  )
}

function KpiCard({ label, val, tipo }) {
  return (
    <div className={`cc-kpi cc-kpi-${tipo || 'default'}`}>
      <span className="cc-kpi-val">{val}</span>
      <span className="cc-kpi-lbl">{label}</span>
    </div>
  )
}
