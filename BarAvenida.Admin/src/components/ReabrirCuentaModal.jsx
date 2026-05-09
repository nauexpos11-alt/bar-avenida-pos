import { useState } from 'react'

export default function ReabrirCuentaModal({ folio, mesaNumero, onConfirmar, onCerrar }) {
  const [guardando, setGuardando] = useState(false)

  const handleConfirmar = async () => {
    if (guardando) return
    setGuardando(true)
    try {
      await onConfirmar()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="rem-overlay">
      <div className="rem-modal">
        <div className="rem-header">
          <span>🔓 REABRIR CUENTA</span>
          <button className="rem-close" onClick={onCerrar}>✕</button>
        </div>
        <div className="rem-body">
          <p className="rem-info">
            ¿Seguro que quieres reabrir el folio{' '}
            <strong>#{String(folio).padStart(4, '0')}</strong>{' '}
            ({mesaNumero})?
          </p>
          <p className="rem-warn">
            La cuenta volverá a estado <strong>Abierta</strong> y tendrás que volver a cobrarla.
            Solo es posible dentro de los primeros 30 minutos después del cobro.
          </p>
        </div>
        <div className="rem-footer">
          <button className="rem-btn-cancel" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button className="rem-btn-ok" onClick={handleConfirmar} disabled={guardando}>
            {guardando ? 'Reabriendo...' : 'SÍ, REABRIR'}
          </button>
        </div>
      </div>
    </div>
  )
}
