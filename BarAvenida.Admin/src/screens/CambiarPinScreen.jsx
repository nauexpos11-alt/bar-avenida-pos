import { useState, useCallback } from 'react'
import { api } from '../api'
import ToastContainer from '../components/Toast'
import './CambiarPinScreen.css'

export default function CambiarPinScreen({ auth, onVolver }) {
  const [form,     setForm]     = useState({ pinActual: '', pinNuevo: '', confirmarPin: '' })
  const [guardando,setGuardando]= useState(false)
  const [toasts,   setToasts]   = useState([])

  const toast = useCallback((msg, tipo = 'ok') => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, mensaje: msg, tipo }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000)
  }, [])

  const campo = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleGuardar = async () => {
    if (!form.pinActual)       { toast('Ingresa tu PIN actual', 'error'); return }
    if (form.pinNuevo.length < 4) { toast('El PIN nuevo debe tener al menos 4 dígitos', 'error'); return }
    if (form.pinNuevo !== form.confirmarPin) { toast('Los PINs nuevos no coinciden', 'error'); return }
    setGuardando(true)
    try {
      const r = await api.cambiarPin(auth.token, form)
      toast(r?.mensaje ?? 'PIN actualizado')
      setForm({ pinActual: '', pinNuevo: '', confirmarPin: '' })
    } catch (e) { toast(e.message, 'error') }
    finally     { setGuardando(false) }
  }

  return (
    <div className="cp-screen">
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(ts => ts.filter(t => t.id !== id))} />

      <div className="cp-header">
        <div>
          <h2 className="cp-titulo">Cambiar PIN</h2>
          <div className="cp-breadcrumb">SEGURIDAD → Cambiar PIN</div>
        </div>
        <button className="cp-btn-x" onClick={onVolver}>✕</button>
      </div>

      <div className="cp-body">
        <div className="cp-card">
          <div className="cp-usuario-info">
            <span className="cp-lbl">Usuario</span>
            <span className="cp-val">{auth.nombre}</span>
          </div>

          <div className="cp-form">
            <label className="cp-lbl">PIN actual *</label>
            <input className="cp-input" type="password" maxLength={8}
              value={form.pinActual}
              onChange={e => campo('pinActual', e.target.value)}
              placeholder="••••"
              autoFocus
            />

            <label className="cp-lbl">PIN nuevo *</label>
            <input className="cp-input" type="password" maxLength={8}
              value={form.pinNuevo}
              onChange={e => campo('pinNuevo', e.target.value)}
              placeholder="Mínimo 4 dígitos"
            />

            <label className="cp-lbl">Confirmar PIN nuevo *</label>
            <input className="cp-input" type="password" maxLength={8}
              value={form.confirmarPin}
              onChange={e => campo('confirmarPin', e.target.value)}
              placeholder="Repite el PIN nuevo"
              onKeyDown={e => e.key === 'Enter' && !guardando && handleGuardar()}
            />

            <button className="cp-btn-guardar" onClick={handleGuardar} disabled={guardando}>
              {guardando ? 'Actualizando...' : 'Actualizar PIN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
