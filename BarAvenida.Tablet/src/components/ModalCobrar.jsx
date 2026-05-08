import { useState } from 'react'
import './ModalCobrar.css'

const METODOS = ['Efectivo', 'Tarjeta', 'Transferencia']

export default function ModalCobrar({ total, onCobrar, onCancel }) {
  const [metodo, setMetodo]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const handleConfirmar = async () => {
    if (!metodo || loading) return
    setLoading(true)
    setError(null)
    try {
      await onCobrar(metodo)
    } catch (e) {
      setError(e.message || 'Error al cobrar. Intenta de nuevo.')
      setLoading(false)
    }
    // Si onCobrar navega a otra pantalla, no llegamos aquí
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !loading && onCancel()}>
      <div className="modal-box cobrar-box">

        <div className="modal-title">COBRAR CUENTA</div>

        <div className="cobrar-total">
          <span className="cobrar-total-label">TOTAL A COBRAR</span>
          <span className="cobrar-total-val">${total.toFixed(2)}</span>
        </div>

        <div className="cobrar-metodo-label">MÉTODO DE PAGO</div>
        <div className="metodo-btns">
          {METODOS.map(m => (
            <button
              key={m}
              className={`btn-metodo ${metodo === m ? 'metodo-sel' : ''}`}
              onClick={() => setMetodo(m)}
              disabled={loading}
            >
              <span className="metodo-icon">
                {m === 'Efectivo' ? '💵' : m === 'Tarjeta' ? '💳' : '📲'}
              </span>
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel} disabled={loading}>
            CANCELAR
          </button>
          <button
            className="btn-primary"
            onClick={handleConfirmar}
            disabled={!metodo || loading}
          >
            {loading ? 'PROCESANDO...' : 'CONFIRMAR COBRO'}
          </button>
        </div>

      </div>
    </div>
  )
}
