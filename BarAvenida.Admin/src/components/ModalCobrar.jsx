import { useState } from 'react'
import './ModalCobrar.css'

const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia']
const ICONS   = { Efectivo: '💵', Tarjeta: '💳', Transferencia: '📲' }

export default function ModalCobrar({ total, onCobrar, onCancel }) {
  const [metodo, setMetodo]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const handleConfirmar = async () => {
    if (!metodo || loading) return
    setLoading(true)
    setError(null)
    try { await onCobrar(metodo) }
    catch (e) { setError(e.message || 'Error al cobrar'); setLoading(false) }
  }

  const fmtDec = (n) => `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !loading && onCancel()}>
      <div className="modal-box cobrar-box">
        <div className="modal-title">COBRAR CUENTA</div>

        <div className="cobrar-total">
          <span className="cobrar-label">TOTAL A COBRAR</span>
          <span className="cobrar-val">{fmtDec(total)}</span>
        </div>

        <div className="cobrar-metodo-lbl">MÉTODO DE PAGO</div>
        <div className="metodo-btns">
          {METODOS.map(m => (
            <button
              key={m}
              className={`btn-metodo ${metodo === m ? 'metodo-sel' : ''}`}
              onClick={() => setMetodo(m)}
              disabled={loading}
            >
              <span className="metodo-icon">{ICONS[m]}</span>
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel} disabled={loading}>CANCELAR</button>
          <button className="btn-primary" onClick={handleConfirmar} disabled={!metodo || loading}>
            {loading ? 'PROCESANDO...' : 'CONFIRMAR'}
          </button>
        </div>
      </div>
    </div>
  )
}
