import { useState, useCallback, useEffect } from 'react'
import { api } from '../api'
import Modal from '../components/Modal'
import ToastContainer from '../components/Toast'
import './RetirosCajaScreen.css'

const fmt = n => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtFecha = d => new Date(d).toLocaleString('es-MX', {
  day: '2-digit', month: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
})

const MOTIVOS = [
  'Pago a proveedor',
  'Cambio de billetes',
  'Gastos del día',
  'Pago de servicios',
  'Otro...',
]

const VACIO = { monto: '', motivo: MOTIVOS[0], conceptoLibre: '', pin: '' }

export default function RetirosCajaScreen({ auth, onVolver }) {
  const [turno,    setTurno]    = useState(undefined)
  const [retiros,  setRetiros]  = useState([])
  const [cargando, setCargando] = useState(false)
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState(VACIO)
  const [enviando, setEnviando] = useState(false)
  const [toasts,   setToasts]   = useState([])

  const toast = useCallback((mensaje, tipo = 'ok') => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, mensaje, tipo }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4500)
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const t = await api.adminGetTurnoActual(auth.token)
      const turnoData = t ?? null
      setTurno(turnoData)
      if (turnoData) {
        const r = await api.adminGetRetiros(auth.token, turnoData.id)
        setRetiros(Array.isArray(r) ? r : [])
      } else {
        setRetiros([])
      }
    } catch (e) {
      toast('Error al cargar datos: ' + e.message, 'error')
      setTurno(null)
    } finally {
      setCargando(false)
    }
  }, [auth.token, toast])

  useEffect(() => { cargar() }, [cargar])

  const campo = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const conceptoFinal = form.motivo === 'Otro...' ? (form.conceptoLibre.trim() || null) : form.motivo

  const handleRetiro = async () => {
    const monto = parseFloat(form.monto)
    if (!monto || monto <= 0) { toast('Ingresa un monto válido', 'error'); return }
    if (!form.pin) { toast('Ingresa tu PIN', 'error'); return }

    setEnviando(true)
    try {
      const r = await api.adminPostRetiro(auth.token, {
        turnoId: turno.id,
        monto,
        pin: form.pin,
        concepto: conceptoFinal,
      })
      setRetiros(prev => [...prev, r])
      setModal(false)
      setForm(VACIO)
      toast(`Retiro de ${fmt(r.monto)} registrado`)
    } catch (e) {
      toast(e.message || 'Error al registrar retiro', 'error')
    } finally {
      setEnviando(false)
    }
  }

  const totalRetiros = retiros.reduce((s, r) => s + (r.monto || 0), 0)

  return (
    <div className="rc-screen">
      <ToastContainer
        toasts={toasts}
        onDismiss={id => setToasts(ts => ts.filter(t => t.id !== id))}
      />

      {/* Header */}
      <div className="rc-header">
        <div>
          <h2 className="rc-titulo">RETIROS DE CAJA</h2>
          <div className="rc-breadcrumb">CAJA &rsaquo; Retiros de caja</div>
        </div>
        {onVolver && (
          <button className="rc-btn-x" onClick={onVolver} title="Volver al dashboard">✕</button>
        )}
      </div>

      {/* KPI + acciones */}
      {turno && (
        <div className="rc-bar">
          <div className="rc-kpi-row">
            <div className="rc-kpi">
              <span className="rc-kpi-val">{retiros.length}</span>
              <span className="rc-kpi-lbl">Retiros del turno</span>
            </div>
            <div className="rc-kpi rc-kpi-total">
              <span className="rc-kpi-val">{fmt(totalRetiros)}</span>
              <span className="rc-kpi-lbl">Total retirado</span>
            </div>
            <div className="rc-kpi">
              <span className="rc-kpi-val rc-kpi-val-sm">Turno #{turno.id}</span>
              <span className="rc-kpi-lbl">Fondo: {fmt(turno.montoInicial)}</span>
            </div>
          </div>
          <button className="rc-btn-nuevo" onClick={() => { setForm(VACIO); setModal(true) }}>
            + Nuevo Retiro
          </button>
        </div>
      )}

      {/* Tabla */}
      <div className="rc-tabla-wrap">
        {turno === undefined && (
          <div className="rc-vacio">Cargando...</div>
        )}
        {turno === null && (
          <div className="rc-vacio">No hay turno abierto. Abre un turno desde <strong>Apertura de turno</strong> para poder registrar retiros.</div>
        )}
        {turno && retiros.length === 0 && !cargando && (
          <div className="rc-vacio">Sin retiros registrados en este turno</div>
        )}
        {turno && retiros.length > 0 && (
          <table className="rc-tabla">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Usuario</th>
                <th>Concepto</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {retiros.map((r, i) => (
                <tr key={r.id} className={`rc-fila${i % 2 === 0 ? ' rc-par' : ' rc-impar'}`}>
                  <td className="rc-td-fecha">{fmtFecha(r.fecha)}</td>
                  <td>{r.usuarioNombre}</td>
                  <td className="rc-td-concepto">{r.concepto || '—'}</td>
                  <td className="rc-td-monto">{fmt(r.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="rc-footer">
        {turno
          ? `${retiros.length} retiro${retiros.length !== 1 ? 's' : ''} — total: ${fmt(totalRetiros)}`
          : ''
        }
        {cargando && <span className="rc-footer-carg"> · cargando...</span>}
      </div>

      {/* Modal Nuevo Retiro */}
      {modal && (
        <Modal
          titulo="Nuevo Retiro de Caja"
          onClose={() => setModal(false)}
          accionLabel={enviando ? 'Registrando...' : 'Registrar Retiro'}
          onAccion={handleRetiro}
          accionPeligrosa
        >
          <div className="tc-form">
            <label className="tc-lbl">Monto a retirar ($)</label>
            <input
              className="tc-input"
              type="number"
              min="0.01"
              step="50"
              placeholder="0.00"
              value={form.monto}
              onChange={e => campo('monto', e.target.value)}
              autoFocus
            />
            <label className="tc-lbl">Motivo</label>
            <select
              className="tc-input"
              value={form.motivo}
              onChange={e => campo('motivo', e.target.value)}
            >
              {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {form.motivo === 'Otro...' && (
              <>
                <label className="tc-lbl">Especificar motivo</label>
                <input
                  className="tc-input"
                  type="text"
                  placeholder="Describe el motivo..."
                  maxLength={200}
                  value={form.conceptoLibre}
                  onChange={e => campo('conceptoLibre', e.target.value)}
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
              onKeyDown={e => e.key === 'Enter' && handleRetiro()}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}
