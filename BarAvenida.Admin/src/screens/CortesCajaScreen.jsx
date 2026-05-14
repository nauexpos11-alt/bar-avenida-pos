import { useState, useCallback, useEffect } from 'react'
import { api } from '../api'
import Modal from '../components/Modal'
import ToastContainer from '../components/Toast'
import Icon from '../components/Icon'
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
          <button className="cc-btn-x" onClick={onVolver} title="Volver al dashboard" aria-label="Cerrar"><Icon name="close" size={14} /></button>
        )}
      </div>

      {/* Tabs */}
      <div className="cc-tabs">
        {[
          { key: 'x',          label: 'Corte X (Parcial)' },
          { key: 'z',          label: 'Corte Z (Cierre)' },
          { key: 'historico',  label: 'Histórico' },
          { key: 'incidentes', label: 'Incidentes' },
          { key: 'mant',       label: '⚠ Mantenimiento' },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`cc-tab${activeTab === key ? ' cc-tab-active' : ''}${key === 'mant' ? ' cc-tab-danger' : ''}`}
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
        {activeTab === 'mant'       && <TabMantenimiento auth={auth} toast={toast} />}
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
        toast(r.modoSimulado ? 'Archivos simulados regenerados' : (r.mensaje || 'Impreso'))
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
              {imprimiendo ? 'Generando...' : (<><Icon name="imprimir" size={14} /> Simular impresión</>)}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Tab Z ─────────────────────────────────────────────────────────────────────

// Umbrales (espejo de appsettings.json — Caja:Umbrales)
const UMBRAL_VERDE    = 50
const UMBRAL_AMARILLA = 200

function calcSeveridad(diferencia) {
  const abs = Math.abs(diferencia || 0)
  if (abs <= UMBRAL_VERDE)    return { nivel: 'Verde',    color: '#22c55e', bg: '#0d2318', requiereJust: false }
  if (abs <= UMBRAL_AMARILLA) return { nivel: 'Amarilla', color: '#fbbf24', bg: '#1a1500', requiereJust: false }
  return                            { nivel: 'Roja',     color: '#ef4444', bg: '#2a0808', requiereJust: true  }
}

function TabZ({ auth, toast }) {
  const [turno,           setTurno]           = useState(undefined)
  const [preview,         setPreview]          = useState(null)
  const [cargando,        setCargando]         = useState(false)
  const [resultado,       setResultado]        = useState(null)
  const [modal,           setModal]            = useState(false)
  const [pin,             setPin]              = useState('')
  const [notas,           setNotas]            = useState('')
  const [justificacion,   setJustificacion]    = useState('')
  const [efectivoContado, setEfectivoContado]  = useState('')
  const [enviando,        setEnviando]         = useState(false)
  const [modalError,      setModalError]       = useState('')

  // Eliminar turno (sin cerrarlo - lo borra/cancela)
  const [modalEliminarTurno, setModalEliminarTurno] = useState(false)
  const [pinElim,            setPinElim]            = useState('')
  const [eliminandoTurno,    setEliminandoTurno]    = useState(false)
  const [errElim,            setErrElim]            = useState('')

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

  const efectivoEsperado = preview?.efectivoEnCaja ?? 0
  const montoContado     = parseFloat(efectivoContado) || 0
  const diferencia       = montoContado - efectivoEsperado
  const difSign          = diferencia >= 0 ? '+' : ''
  const severidad        = calcSeveridad(diferencia)
  const difColor         = diferencia === 0 ? '#22c55e' : severidad.color

  const handleZ = async () => {
    setModalError('')
    if (!pin) { setModalError('Ingresa tu PIN de administrador'); return }
    if (efectivoContado === '' || isNaN(parseFloat(efectivoContado))) {
      setModalError('Captura el efectivo contado en caja (puede ser 0)')
      return
    }
    if (severidad.requiereJust && justificacion.trim().length < 10) {
      setModalError(`La diferencia es de $${Math.abs(diferencia).toLocaleString('es-MX')} (severidad ROJA). Justificación obligatoria (mínimo 10 caracteres).`)
      return
    }
    setEnviando(true)
    try {
      const res = await api.adminCerrarTurno(auth.token, {
        turnoId: turno.id,
        pin,
        efectivoContado: parseFloat(efectivoContado) || 0,
        notas: notas || null,
        justificacion: justificacion.trim() || null,
      })
      const corte = res?.corte ?? res
      setResultado(corte)
      setModal(false)
      setTurno(null)
      setPreview(null)
      toast(corte?.modoSimulado ? 'Corte Z generado — archivos simulados creados' : 'Corte Z generado y turno cerrado')
    } catch (e) {
      const msg = e?.message || 'Error al generar Corte Z'
      setModalError(msg)
      // Si es PIN incorrecto limpiar PIN
      if (/pin/i.test(msg)) setPin('')
    } finally {
      setEnviando(false)
    }
  }

  const handleEliminarTurno = async () => {
    setErrElim('')
    if (!pinElim || pinElim.length < 4) { setErrElim('Ingresa tu PIN admin'); return }
    setEliminandoTurno(true)
    try {
      await api.adminEliminarTurno(auth.token, turno.id, pinElim)
      toast('Turno eliminado correctamente')
      setModalEliminarTurno(false)
      setPinElim('')
      setTurno(null)
      setPreview(null)
      await cargar()
    } catch (e) {
      setErrElim(e?.message || 'Error al eliminar turno')
    } finally {
      setEliminandoTurno(false)
    }
  }

  if (resultado) {
    return (
      <div className="cc-tab-body">
        <div className="cc-resultado-ok">
          <span className="cc-resultado-icon"><Icon name="check" size={28} /></span>
          <h3>Turno cerrado — Corte Z #{resultado.id} generado</h3>
          <p>{fmtFecha(resultado.fecha)}</p>
          {resultado.modoSimulado && (
            <p className="cc-sim-aviso">Archivos simulados guardados en TicketsImpresos/</p>
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
            <button
              className="cc-btn-eliminar-turno"
              onClick={() => { setPinElim(''); setErrElim(''); setModalEliminarTurno(true) }}
              title="Cancelar el turno sin generar corte (requiere PIN admin)"
            >
              🗑 Eliminar turno
            </button>
            <button className="cc-btn-corte-z" onClick={() => {
              setPin(''); setNotas(''); setJustificacion(''); setEfectivoContado(''); setModalError(''); setModal(true)
            }}>
              🔒 CERRAR Y GUARDAR CORTE Z
            </button>
          </div>
        </>
      )}

      {modal && (
        <Modal
          titulo="Confirmar Cierre de Turno"
          onClose={() => !enviando && setModal(false)}
          accionLabel={enviando ? 'Cerrando...' : '🔒 Cerrar y guardar Corte Z'}
          onAccion={handleZ}
          accionPeligrosa
        >
          <div className="tc-form">
            <p className="tc-aviso">
              Se cerrará el turno #{turno?.id} y se registrará el Corte Z con los totales actuales.
            </p>

            {modalError && (
              <div style={{
                background: '#3b0000', border: '1.5px solid #ef4444', color: '#fca5a5',
                padding: '10px 12px', borderRadius: 6, margin: '8px 0 12px',
                fontSize: 13, fontWeight: 600, lineHeight: 1.4,
              }}>{modalError}</div>
            )}

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
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                margin: '6px 0 10px', flexWrap: 'wrap'
              }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: difColor }}>
                  Diferencia: {difSign}{fmt(diferencia)}
                </span>
                <span style={{
                  background: severidad.bg, color: severidad.color,
                  border: `1.5px solid ${severidad.color}`,
                  padding: '3px 10px', borderRadius: 12,
                  fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
                }}>
                  ● {severidad.nivel.toUpperCase()}
                </span>
                {severidad.requiereJust && (
                  <span style={{ color: '#fca5a5', fontSize: 12, fontWeight: 600 }}>
                    ⚠ Justificación obligatoria
                  </span>
                )}
              </div>
            )}

            {severidad.requiereJust && efectivoContado !== '' && (
              <>
                <label className="tc-lbl" style={{ color: '#fca5a5' }}>
                  JUSTIFICACIÓN <span style={{ color: '#ef4444' }}>*</span>
                  <span style={{ color: '#888', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
                    (mínimo 10 caracteres, obligatorio por la diferencia)
                  </span>
                </label>
                <textarea
                  className="tc-input tc-textarea"
                  placeholder="Explica por qué hay esta diferencia (mín. 10 caracteres)..."
                  maxLength={300}
                  value={justificacion}
                  onChange={e => setJustificacion(e.target.value)}
                  style={{
                    borderColor: justificacion.trim().length >= 10 ? '#22c55e' : '#ef4444',
                    minHeight: 60,
                  }}
                />
                <div style={{
                  fontSize: 11, color: justificacion.trim().length >= 10 ? '#22c55e' : '#888',
                  marginTop: 2, marginBottom: 6,
                }}>
                  {justificacion.trim().length} / 10 caracteres mínimos
                </div>
              </>
            )}

            <label className="tc-lbl">Notas del corte (opcional)</label>
            <textarea
              className="tc-input tc-textarea"
              placeholder="Observaciones generales del cierre..."
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

      {modalEliminarTurno && (
        <Modal
          titulo="⚠ Eliminar turno"
          onClose={() => !eliminandoTurno && setModalEliminarTurno(false)}
          accionLabel={eliminandoTurno ? 'Eliminando…' : '🗑 Eliminar permanentemente'}
          onAccion={handleEliminarTurno}
          accionPeligrosa
        >
          <div className="tc-form">
            <p className="tc-aviso" style={{ color: '#fca5a5' }}>
              Vas a <strong>eliminar el turno #{turno?.id} sin cerrarlo</strong>.
              <br/>No se generará Corte Z. Las cuentas cobradas durante este turno NO se borran.
              <br/><strong>Esta acción NO se puede deshacer.</strong>
            </p>
            {errElim && (
              <div style={{
                background: '#3b0000', border: '1.5px solid #ef4444', color: '#fca5a5',
                padding: '8px 10px', borderRadius: 6, margin: '8px 0',
                fontSize: 13, fontWeight: 600,
              }}>{errElim}</div>
            )}
            <label className="tc-lbl">PIN ADMIN (confirmación)</label>
            <input
              className="tc-input"
              type="password"
              inputMode="numeric"
              placeholder="••••"
              maxLength={8}
              value={pinElim}
              autoFocus
              onChange={e => setPinElim(e.target.value.replace(/\D/g, '').slice(0, 8))}
              onKeyDown={e => e.key === 'Enter' && handleEliminarTurno()}
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
      toast(r.modoSimulado ? 'Archivos simulados regenerados' : r.mensaje)
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
                    {reimprimiendo === c.id ? '...' : <Icon name="imprimir" size={14} />}
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
                {cargando ? 'Cargando...' : 'Sin incidentes en el rango seleccionado'}
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

// ── Tab Mantenimiento (ELIMINAR TURNOS + RESET TOTAL) ─────────────────────────

function TabMantenimiento({ auth, toast }) {
  const [cortes,    setCortes]    = useState([])
  const [turnos,    setTurnos]    = useState([])
  const [cargando,  setCargando]  = useState(false)

  // Modal eliminar turno
  const [turnoAEliminar,    setTurnoAEliminar]    = useState(null)
  const [pinTurno,          setPinTurno]          = useState('')
  const [errTurno,          setErrTurno]          = useState('')
  const [elimTurno,         setElimTurno]         = useState(false)

  // Modal reset total
  const [modalReset,        setModalReset]        = useState(false)
  const [pinReset,          setPinReset]          = useState('')
  const [confirmReset,      setConfirmReset]      = useState('')
  const [errReset,          setErrReset]          = useState('')
  const [reseteando,        setReseteando]        = useState(false)
  const [resultReset,       setResultReset]       = useState(null)

  const cargarTurnos = useCallback(async () => {
    setCargando(true)
    try {
      // Trae cortes histórico (últimos 90 días) y derivamos turnos
      const desde = new Date(); desde.setDate(desde.getDate() - 90)
      const hasta = new Date()
      const cs = await api.adminGetCortes(auth.token, {
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
      })
      setCortes(Array.isArray(cs) ? cs : [])
      // También turno actual abierto
      const tActual = await api.adminGetTurnoActual(auth.token).catch(() => null)
      // Construyo lista de turnos únicos de cortes + actual
      const map = new Map()
      if (tActual) map.set(tActual.id, { ...tActual, estado: 'Abierto' })
      ;(Array.isArray(cs) ? cs : []).forEach(c => {
        if (!map.has(c.turnoId)) {
          map.set(c.turnoId, {
            id: c.turnoId,
            fechaApertura: c.fecha,
            usuarioAperturaNombre: c.usuarioNombre,
            montoInicial: c.montoInicial,
            estado: 'Cerrado',
          })
        }
      })
      setTurnos(Array.from(map.values()).sort((a, b) => b.id - a.id))
    } catch (e) {
      toast(e.message || 'Error al cargar turnos', 'error')
    } finally {
      setCargando(false)
    }
  }, [auth.token, toast])

  useEffect(() => { cargarTurnos() }, [cargarTurnos])

  const abrirEliminar = (t) => {
    setTurnoAEliminar(t); setPinTurno(''); setErrTurno('')
  }

  const confirmarEliminarTurno = async () => {
    setErrTurno('')
    if (!pinTurno || pinTurno.length < 4) { setErrTurno('Ingresa tu PIN admin'); return }
    setElimTurno(true)
    try {
      await api.adminEliminarTurno(auth.token, turnoAEliminar.id, pinTurno)
      toast(`Turno #${turnoAEliminar.id} eliminado`)
      setTurnoAEliminar(null)
      setPinTurno('')
      await cargarTurnos()
    } catch (e) {
      setErrTurno(e?.message || 'Error al eliminar turno')
    } finally {
      setElimTurno(false)
    }
  }

  const ejecutarReset = async () => {
    setErrReset('')
    if (!pinReset) { setErrReset('Ingresa tu PIN admin'); return }
    if (confirmReset.trim().toUpperCase() !== 'RESETEAR TODO') {
      setErrReset('Escribe exactamente: RESETEAR TODO')
      return
    }
    setReseteando(true)
    try {
      const res = await api.adminResetTotal(auth.token, pinReset, 'RESETEAR TODO')
      setResultReset(res?.borrado || {})
      setModalReset(false)
      setPinReset(''); setConfirmReset('')
      toast('Sistema reiniciado desde cero')
      await cargarTurnos()
    } catch (e) {
      setErrReset(e?.message || 'Error al resetear')
    } finally {
      setReseteando(false)
    }
  }

  return (
    <div className="cc-tab-body">
      <div className="cc-aviso-z" style={{ background: '#2a0808', borderColor: '#ef4444', color: '#fca5a5' }}>
        <strong>⚠ ZONA DE PELIGRO.</strong> Estas acciones son destructivas y no se pueden deshacer.
        Solo Admin con PIN puede ejecutarlas.
      </div>

      <h3 style={{ color: '#f0c842', fontSize: '0.95rem', letterSpacing: '0.1em', margin: '20px 0 10px' }}>
        TURNOS REGISTRADOS
      </h3>

      <div className="cc-tabla-wrap">
        <table className="cc-tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Apertura</th>
              <th>Cajero</th>
              <th>Fondo</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={6} className="cc-vacio">Cargando...</td></tr>
            ) : turnos.length === 0 ? (
              <tr><td colSpan={6} className="cc-vacio">Sin turnos registrados</td></tr>
            ) : turnos.map((t, i) => (
              <tr key={t.id} className={`cc-fila${i % 2 === 0 ? ' cc-par' : ' cc-impar'}`}>
                <td className="cc-td-id">{t.id}</td>
                <td className="cc-td-fecha">{fmtFecha(t.fechaApertura)}</td>
                <td>{t.usuarioAperturaNombre}</td>
                <td className="cc-td-num">{fmt(t.montoInicial)}</td>
                <td>
                  <span style={{
                    background: t.estado === 'Abierto' ? '#0d2318' : '#1a1a1a',
                    color:      t.estado === 'Abierto' ? '#4ade80' : '#888',
                    border: `1px solid ${t.estado === 'Abierto' ? '#22c55e' : '#444'}`,
                    padding: '3px 10px', borderRadius: 12,
                    fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em',
                  }}>
                    {t.estado.toUpperCase()}
                  </span>
                </td>
                <td>
                  <button
                    className="cc-btn-eliminar-turno"
                    style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                    onClick={() => abrirEliminar(t)}
                  >
                    🗑 Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ color: '#ef4444', fontSize: '0.95rem', letterSpacing: '0.1em', margin: '32px 0 10px' }}>
        RESET TOTAL — EMPEZAR DESDE CERO
      </h3>
      <p style={{ color: '#aaa', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: 14 }}>
        Borra <strong style={{ color: '#fff' }}>TODAS las cuentas, órdenes, turnos, cortes,
        retiros, incidentes, solicitudes y movimientos de inventario</strong>. No borra
        usuarios, productos, mesas, áreas, configuración ni reglas de cross-sell.
        Ideal para empezar limpio después de pruebas o cuando los datos están corruptos.
      </p>
      <button
        className="cc-btn-eliminar-turno"
        style={{
          background: 'linear-gradient(180deg, #ef4444, #c0392b)',
          color: '#fff', border: 'none', padding: '14px 28px',
          fontSize: '1rem', fontWeight: 800, letterSpacing: '0.05em',
        }}
        onClick={() => { setPinReset(''); setConfirmReset(''); setErrReset(''); setModalReset(true) }}
      >
        💣 RESETEAR TODO DESDE CERO
      </button>

      {resultReset && (
        <div style={{
          marginTop: 16, background: '#0d2318', border: '1.5px solid #22c55e',
          color: '#4ade80', padding: '12px 14px', borderRadius: 6,
          fontSize: '0.88rem', lineHeight: 1.6,
        }}>
          <strong>✓ Reset ejecutado.</strong> Borrado:
          <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
            <li>{resultReset.cuentas || 0} cuentas</li>
            <li>{resultReset.ordenes || 0} órdenes ({resultReset.ordenDetalles || 0} detalles)</li>
            <li>{resultReset.turnos || 0} turnos</li>
            <li>{resultReset.cortes || 0} cortes</li>
            <li>{resultReset.retiros || 0} retiros</li>
            <li>{resultReset.incidentes || 0} incidentes</li>
            <li>{resultReset.solicitudes || 0} solicitudes cancelación</li>
            <li>{resultReset.aperturas || 0} aperturas cajón</li>
            <li>{resultReset.movInventario || 0} movimientos inventario</li>
          </ul>
        </div>
      )}

      {/* Modal eliminar turno */}
      {turnoAEliminar && (
        <Modal
          titulo={`⚠ Eliminar turno #${turnoAEliminar.id}`}
          onClose={() => !elimTurno && setTurnoAEliminar(null)}
          accionLabel={elimTurno ? 'Eliminando…' : '🗑 Eliminar permanentemente'}
          onAccion={confirmarEliminarTurno}
          accionPeligrosa
        >
          <div className="tc-form">
            <p className="tc-aviso" style={{ color: '#fca5a5' }}>
              Vas a eliminar el <strong>turno #{turnoAEliminar.id}</strong> (estado: {turnoAEliminar.estado}).
              <br/>Se borrarán: retiros, incidentes y cortes asociados al turno.
              <br/><strong>Esta acción NO se puede deshacer.</strong>
            </p>
            {errTurno && (
              <div style={{
                background: '#3b0000', border: '1.5px solid #ef4444', color: '#fca5a5',
                padding: '8px 10px', borderRadius: 6, margin: '8px 0',
                fontSize: 13, fontWeight: 600,
              }}>{errTurno}</div>
            )}
            <label className="tc-lbl">PIN ADMIN</label>
            <input
              className="tc-input"
              type="password"
              inputMode="numeric"
              placeholder="••••"
              maxLength={8}
              autoFocus
              value={pinTurno}
              onChange={e => setPinTurno(e.target.value.replace(/\D/g, '').slice(0, 8))}
              onKeyDown={e => e.key === 'Enter' && confirmarEliminarTurno()}
            />
          </div>
        </Modal>
      )}

      {/* Modal reset total */}
      {modalReset && (
        <Modal
          titulo="💣 RESET TOTAL — Confirmación final"
          onClose={() => !reseteando && setModalReset(false)}
          accionLabel={reseteando ? 'Reseteando…' : '💣 Borrar TODO ahora'}
          onAccion={ejecutarReset}
          accionPeligrosa
        >
          <div className="tc-form">
            <div style={{
              background: '#2a0808', border: '1.5px solid #ef4444', color: '#fca5a5',
              padding: '12px 14px', borderRadius: 6, marginBottom: 12,
              fontSize: 13, lineHeight: 1.5, fontWeight: 600,
            }}>
              ⚠ <strong>ÚLTIMA ADVERTENCIA</strong><br/>
              Vas a borrar TODAS las cuentas (cobradas y abiertas), órdenes, turnos,
              cortes, retiros, incidentes, solicitudes y movimientos de inventario.<br/>
              <strong style={{ color: '#fff' }}>Esto NO se puede deshacer.</strong>
            </div>

            {errReset && (
              <div style={{
                background: '#3b0000', border: '1.5px solid #ef4444', color: '#fca5a5',
                padding: '8px 10px', borderRadius: 6, margin: '8px 0',
                fontSize: 13, fontWeight: 600,
              }}>{errReset}</div>
            )}

            <label className="tc-lbl">
              Escribe exactamente: <strong style={{ color: '#ef4444' }}>RESETEAR TODO</strong>
            </label>
            <input
              className="tc-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="RESETEAR TODO"
              value={confirmReset}
              onChange={e => setConfirmReset(e.target.value)}
              style={{
                borderColor: confirmReset.trim().toUpperCase() === 'RESETEAR TODO' ? '#22c55e' : undefined,
              }}
              autoFocus
            />

            <label className="tc-lbl">PIN ADMIN</label>
            <input
              className="tc-input"
              type="password"
              inputMode="numeric"
              placeholder="••••"
              maxLength={8}
              value={pinReset}
              onChange={e => setPinReset(e.target.value.replace(/\D/g, '').slice(0, 8))}
              onKeyDown={e => e.key === 'Enter' && ejecutarReset()}
            />
          </div>
        </Modal>
      )}
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
