import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import ToastContainer from '../components/Toast'
import './FolioScreen.css'

export default function FolioScreen({ auth, onVolver }) {
  const [folio,    setFolio]    = useState(null)
  const [form,     setForm]     = useState({ prefijoFolio: '', longitudMinima: 4 })
  const [cargando, setCargando] = useState(true)
  const [guardando,setGuardando]= useState(false)
  const [toasts,   setToasts]   = useState([])

  const toast = useCallback((msg, tipo = 'ok') => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, mensaje: msg, tipo }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000)
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const d = await api.adminGetFolio(auth.token)
      setFolio(d)
      setForm({ prefijoFolio: d.prefijoFolio ?? '', longitudMinima: d.longitudMinima ?? 4 })
    } catch (e) { toast('Error al cargar: ' + e.message, 'error') }
    finally     { setCargando(false) }
  }, [auth.token, toast])

  useEffect(() => { cargar() }, [cargar])

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      const d = await api.adminUpdateFolio(auth.token, { prefijoFolio: form.prefijoFolio.trim(), longitudMinima: Number(form.longitudMinima) })
      setFolio(d)
      toast('Configuración de folios guardada')
    } catch (e) { toast(e.message, 'error') }
    finally     { setGuardando(false) }
  }

  const ejFolio = () => {
    const pref = form.prefijoFolio.trim()
    const num  = String((folio?.ultimoFolio ?? 0) + 1).padStart(Number(form.longitudMinima) || 4, '0')
    return pref ? `${pref}-${num}` : num
  }

  return (
    <div className="fol-screen">
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(ts => ts.filter(t => t.id !== id))} />

      <div className="fol-header">
        <div>
          <h2 className="fol-titulo">Folios y series</h2>
          <div className="fol-breadcrumb">CONFIGURACIÓN → Folios y series</div>
        </div>
        <button className="fol-btn-x" onClick={onVolver}>✕</button>
      </div>

      <div className="fol-body">
        {cargando ? <div className="fol-loader">Cargando...</div> : (
          <div className="fol-card">
            <div className="fol-info-row">
              <span className="fol-info-lbl">Último folio emitido</span>
              <span className="fol-info-val fol-val-big">{folio?.ultimoFolio ?? 0}</span>
            </div>

            <div className="fol-sep" />

            <div className="fol-form">
              <label className="fol-lbl">Prefijo (opcional)</label>
              <input
                className="fol-input"
                value={form.prefijoFolio}
                maxLength={10}
                onChange={e => setForm(f => ({ ...f, prefijoFolio: e.target.value }))}
                placeholder="Ej: A, BA, 2026"
              />
              <div className="fol-hint">Se antepone al número de folio separado por guión.</div>

              <label className="fol-lbl">Longitud mínima del número</label>
              <input
                className="fol-input fol-input-sm"
                type="number"
                min={1}
                max={10}
                value={form.longitudMinima}
                onChange={e => setForm(f => ({ ...f, longitudMinima: e.target.value }))}
              />
              <div className="fol-hint">El número se rellena con ceros a la izquierda.</div>

              <div className="fol-preview">
                <span className="fol-preview-lbl">Siguiente folio:</span>
                <span className="fol-preview-val">{ejFolio()}</span>
              </div>

              <button className="fol-btn-guardar" onClick={handleGuardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
