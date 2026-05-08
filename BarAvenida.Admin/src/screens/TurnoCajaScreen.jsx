import { useState, useCallback, useEffect } from 'react'
import { api } from '../api'
import Modal from '../components/Modal'
import ToastContainer from '../components/Toast'
import './TurnoCajaScreen.css'

const fmt = n => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtFecha = d => new Date(d).toLocaleString('es-MX', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
})
const duracion = (inicio) => {
  const ms = Date.now() - new Date(inicio).getTime()
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}

const VACIO = { pin: '', notas: '', monto: '', justificacion: '' }

export default function TurnoCajaScreen({ auth, onVolver }) {
  const [turno,      setTurno]      = useState(undefined) // undefined=cargando, null=sin turno
  const [corteX,     setCorteX]     = useState(null)
  const [cargando,   setCargando]   = useState(false)
  const [modalAbrir, setModalAbrir] = useState(false)
  const [modalCerrar,setModalCerrar]= useState(false)
  const [form,       setForm]       = useState(VACIO)
  const [toasts,     setToasts]     = useState([])
  const [sugerencia, setSugerencia] = useState(null) // PROMPT C.1 — sugerencia de fondo

  const toast = useCallback((mensaje, tipo = 'ok') => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, mensaje, tipo }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4500)
  }, [])

  const cargarTurno = useCallback(async () => {
    try {
      const data = await api.adminGetTurnoActual(auth.token)
      setTurno(data ?? null)
    } catch (e) {
      toast('Error al cargar turno: ' + e.message, 'error')
      setTurno(null)
    }
  }, [auth.token, toast])

  const cargarCorteX = useCallback(async () => {
    try {
      const cx = await api.adminGetCorteX(auth.token)
      setCorteX(cx)
    } catch {
      setCorteX(null)
    }
  }, [auth.token])

  useEffect(() => { cargarTurno() }, [cargarTurno])
  useEffect(() => { if (turno) cargarCorteX(); else setCorteX(null) }, [turno, cargarCorteX])

  const abrirModal = async (tipo) => {
    setForm(VACIO)
    if (tipo === 'abrir') {
      // PROMPT C.1 — pedir sugerencia de fondo cuando se abre el modal
      setSugerencia(null)
      setModalAbrir(true)
      try {
        const s = await api.adminGetSugerenciaFondo(auth.token)
        setSugerencia(s)
      } catch {
        // Silencioso: si falla, el modal sigue funcionando con captura manual
        setSugerencia(null)
      }
    }
    else setModalCerrar(true)
  }

  const usarSugerencia = () => {
    if (sugerencia?.recomendado > 0) campo('monto', String(sugerencia.recomendado))
  }

  const handleAbrirTurno = async () => {
    if (!form.pin) { toast('Ingresa tu PIN', 'error'); return }
    setCargando(true)
    try {
      const t = await api.adminAbrirTurno(auth.token, {
        pin: form.pin,
        montoInicial: parseFloat(form.monto) || 0,
        notas: form.notas || null,
      })
      setTurno(t)
      setModalAbrir(false)
      toast('Turno abierto correctamente')
    } catch (e) {
      toast(e.message || 'Error al abrir turno', 'error')
    } finally {
      setCargando(false)
    }
  }

  const handleCerrarTurno = async () => {
    if (!form.pin) { toast('Ingresa tu PIN', 'error'); return }
    if (severidad === 'roja' && form.justificacion.trim().length < 10) {
      toast('Justificación obligatoria (mín 10 caracteres)', 'error')
      return
    }
    setCargando(true)
    try {
      await api.adminCerrarTurno(auth.token, {
        turnoId:         turno.id,
        pin:             form.pin,
        efectivoContado: parseFloat(form.monto) || 0,
        notas:           form.notas || null,
        justificacion:   form.justificacion?.trim() || null,
      })
      setTurno(null)
      setCorteX(null)
      setModalCerrar(false)
      toast(severidad === 'verde'
        ? 'Turno cerrado correctamente'
        : 'Turno cerrado. Incidente registrado en histórico.')
    } catch (e) {
      toast(e.message || 'Error al cerrar turno', 'error')
    } finally {
      setCargando(false)
    }
  }

  const efectivoEsperado = corteX?.efectivoEnCaja ?? 0
  const montoContado     = parseFloat(form.monto) || 0
  const diferencia       = montoContado - efectivoEsperado
  const difSign          = diferencia >= 0 ? '+' : ''
  const absDif           = Math.abs(diferencia)
  const severidad        =
    absDif <= 50  ? 'verde'    :
    absDif <= 200 ? 'amarilla' :
                    'roja'

  const campo = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="tc-screen">
      <ToastContainer
        toasts={toasts}
        onDismiss={id => setToasts(ts => ts.filter(t => t.id !== id))}
      />

      {/* Header */}
      <div className="tc-header">
        <div>
          <h2 className="tc-titulo">TURNO DE CAJA</h2>
          <div className="tc-breadcrumb">CAJA &rsaquo; Turno de caja</div>
        </div>
        {onVolver && (
          <button className="tc-btn-cerrar" onClick={onVolver} title="Volver al dashboard">✕</button>
        )}
      </div>

      {/* Cuerpo */}
      <div className="tc-body">
        {turno === undefined ? (
          <div className="tc-cargando">Cargando estado del turno...</div>
        ) : turno === null ? (
          <SinTurno onAbrir={() => abrirModal('abrir')} />
        ) : (
          <TurnoAbierto turno={turno} corteX={corteX} onCerrar={() => abrirModal('cerrar')} onRefresh={() => { cargarTurno(); cargarCorteX() }} />
        )}
      </div>

      {/* Modal Abrir Turno */}
      {modalAbrir && (
        <Modal
          titulo="Abrir Turno de Caja"
          onClose={() => setModalAbrir(false)}
          accionLabel={cargando ? 'Abriendo...' : 'Abrir Turno'}
          onAccion={handleAbrirTurno}
        >
          <div className="tc-form">
            {/* PROMPT C.1 — Hint de sugerencia de fondo */}
            {sugerencia && sugerencia.recomendado > 0 && (
              <div className="tc-hint-fondo">
                <div className="tc-hint-row">
                  <span className="tc-hint-icon">💡</span>
                  <span className="tc-hint-label">RECOMENDADO</span>
                  <span className="tc-hint-monto">{fmt(sugerencia.recomendado)}</span>
                  <button type="button" className="tc-hint-btn" onClick={usarSugerencia}>
                    USAR
                  </button>
                </div>
                <div className="tc-hint-just">{sugerencia.justificacion}</div>
              </div>
            )}
            {sugerencia && sugerencia.recomendado === 0 && sugerencia.justificacion && (
              <div className="tc-hint-fondo tc-hint-vacio">
                <span className="tc-hint-icon">ℹ</span>
                <span>{sugerencia.justificacion}</span>
              </div>
            )}
            <label className="tc-lbl">Fondo de cambio ($)</label>
            <input
              className="tc-input"
              type="number"
              min="0"
              step="50"
              placeholder="0.00"
              value={form.monto}
              onChange={e => campo('monto', e.target.value)}
              autoFocus
            />
            <label className="tc-lbl">PIN de administrador</label>
            <input
              className="tc-input"
              type="password"
              placeholder="••••"
              maxLength={8}
              value={form.pin}
              onChange={e => campo('pin', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAbrirTurno()}
            />
            <label className="tc-lbl">Notas (opcional)</label>
            <textarea
              className="tc-input tc-textarea"
              placeholder="Turno matutino..."
              maxLength={200}
              value={form.notas}
              onChange={e => campo('notas', e.target.value)}
            />
          </div>
        </Modal>
      )}

      {/* Modal Cerrar Turno */}
      {modalCerrar && (
        <Modal
          titulo="Cerrar Turno de Caja"
          onClose={() => setModalCerrar(false)}
          accionLabel={cargando ? 'Cerrando...' : 'Cerrar Turno'}
          onAccion={handleCerrarTurno}
          accionPeligrosa
          accionDeshabilitada={severidad === 'roja' && form.justificacion.trim().length < 10}
        >
          <div className="tc-form">
            <p className="tc-aviso">
              Esta acción cerrará el turno #{turno?.id} y generará el Corte Z definitivo.
            </p>
            {corteX && (
              <div style={{ marginBottom: 8, fontSize: 13, color: '#888' }}>
                Efectivo esperado en caja: <strong>{fmt(corteX.efectivoEnCaja)}</strong>
              </div>
            )}
            <label className="tc-lbl">Efectivo contado en caja ($)</label>
            <input
              className="tc-input"
              type="number"
              min="0"
              step="50"
              placeholder="0.00"
              value={form.monto}
              onChange={e => campo('monto', e.target.value)}
              autoFocus
            />
            {form.monto !== '' && corteX && (
              <div className={`tc-cierre-banner tc-cierre-${severidad}`}>
                <div className="tc-cierre-row">
                  <span className="tc-cierre-lbl">Diferencia</span>
                  <span className="tc-cierre-monto">{difSign}{fmt(diferencia)}</span>
                </div>
                <div className="tc-cierre-msg">
                  {severidad === 'verde'    && '✅ Dentro del rango aceptable. Cierre directo.'}
                  {severidad === 'amarilla' && '⚠ Diferencia moderada. Justificación opcional pero recomendada.'}
                  {severidad === 'roja'     && '🚨 Diferencia significativa. Justificación obligatoria.'}
                </div>
              </div>
            )}
            {form.monto !== '' && corteX && severidad !== 'verde' && (
              <>
                <label className="tc-lbl">
                  Justificación {severidad === 'roja' && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <textarea
                  className="tc-input tc-textarea"
                  placeholder="Ej: Sobrante por cambio guardado, faltante por descuento autorizado..."
                  maxLength={500}
                  value={form.justificacion}
                  onChange={e => campo('justificacion', e.target.value)}
                />
              </>
            )}
            <label className="tc-lbl">PIN de administrador</label>
            <input
              className="tc-input"
              type="password"
              placeholder="••••"
              maxLength={8}
              value={form.pin}
              onChange={e => campo('pin', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCerrarTurno()}
            />
            <label className="tc-lbl">Notas (opcional)</label>
            <textarea
              className="tc-input tc-textarea"
              placeholder="Observaciones del cierre..."
              maxLength={200}
              value={form.notas}
              onChange={e => campo('notas', e.target.value)}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}

function SinTurno({ onAbrir }) {
  return (
    <div className="tc-sin-turno">
      <div className="tc-estado-badge tc-badge-cerrado">TURNO CERRADO</div>
      <p className="tc-sin-turno-txt">No hay ningún turno abierto en este momento.</p>
      <button className="tc-btn-abrir" onClick={onAbrir}>
        Abrir Turno
      </button>
    </div>
  )
}

function TurnoAbierto({ turno, corteX, onCerrar, onRefresh }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="tc-turno-open">
      <div className="tc-estado-badge tc-badge-abierto">TURNO ABIERTO</div>

      <div className="tc-cards">
        <div className="tc-card">
          <span className="tc-card-lbl">Número de turno</span>
          <span className="tc-card-val">#{turno.id}</span>
        </div>
        <div className="tc-card">
          <span className="tc-card-lbl">Apertura</span>
          <span className="tc-card-val tc-card-sm">{fmtFecha(turno.fechaApertura)}</span>
        </div>
        <div className="tc-card">
          <span className="tc-card-lbl">Duración</span>
          <span className="tc-card-val tc-card-sm">{duracion(turno.fechaApertura)}</span>
        </div>
        <div className="tc-card">
          <span className="tc-card-lbl">Cajero apertura</span>
          <span className="tc-card-val tc-card-sm">{turno.usuarioAperturaNombre}</span>
        </div>
        <div className="tc-card tc-card-gold">
          <span className="tc-card-lbl">Fondo inicial</span>
          <span className="tc-card-val">{fmt(turno.montoInicial)}</span>
        </div>
      </div>

      {corteX && (
        <div className="tc-corte-x-row">
          <div className="tc-cx-item">
            <span className="tc-cx-val">{corteX.cuentasCobradas}</span>
            <span className="tc-cx-lbl">Cuentas</span>
          </div>
          <div className="tc-cx-item">
            <span className="tc-cx-val">{fmt(corteX.totalVentas)}</span>
            <span className="tc-cx-lbl">Ventas</span>
          </div>
          <div className="tc-cx-item">
            <span className="tc-cx-val">{fmt(corteX.totalEfectivo)}</span>
            <span className="tc-cx-lbl">Efectivo</span>
          </div>
          <div className="tc-cx-item">
            <span className="tc-cx-val">{fmt(corteX.totalTarjeta)}</span>
            <span className="tc-cx-lbl">Tarjeta</span>
          </div>
          <div className="tc-cx-item tc-cx-item-dest">
            <span className="tc-cx-val">{fmt(corteX.efectivoEnCaja)}</span>
            <span className="tc-cx-lbl">Efectivo en caja</span>
          </div>
        </div>
      )}

      {turno.notas && (
        <div className="tc-notas">Notas: {turno.notas}</div>
      )}

      <div className="tc-acciones">
        <button className="tc-btn-refresh" onClick={onRefresh} title="Refrescar">↻ Refrescar</button>
        <button className="tc-btn-cerrar-turno" onClick={onCerrar}>Cerrar Turno</button>
      </div>
    </div>
  )
}
