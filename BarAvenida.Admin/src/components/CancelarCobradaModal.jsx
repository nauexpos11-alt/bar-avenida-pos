import { useState } from 'react'

export default function CancelarCobradaModal({ folio, onConfirmar, onCerrar }) {
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const valido = motivo.trim().length >= 10

  const handleConfirmar = async () => {
    if (!valido || guardando) return
    setGuardando(true)
    try {
      await onConfirmar(motivo.trim())
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="ccm-overlay">
      <div className="ccm-modal">
        <div className="ccm-header">
          <span>✕ CANCELAR FOLIO #{String(folio).padStart(4, '0')}</span>
          <button className="ccm-close" onClick={onCerrar}>✕</button>
        </div>
        <div className="ccm-body">
          <p className="ccm-warn">
            Esta acción cambiará la cuenta a <strong>Cancelada</strong>. No se puede deshacer.
          </p>
          <label className="ccm-lbl">
            Motivo <span className="ccm-req">*</span>{' '}
            <small>(mínimo 10 caracteres)</small>
          </label>
          <textarea
            className="ccm-textarea"
            rows={3}
            placeholder="Ej: Error de cobro, cliente pagó con método diferente..."
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            maxLength={200}
            autoFocus
          />
          <div className="ccm-contador">
            {motivo.length}/200
            {motivo.length > 0 && !valido && <span className="ccm-short"> · mín. 10 caracteres</span>}
          </div>
        </div>
        <div className="ccm-footer">
          <button className="ccm-btn-cancel" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button
            className="ccm-btn-ok"
            onClick={handleConfirmar}
            disabled={!valido || guardando}
          >
            {guardando ? 'Cancelando...' : 'CONFIRMAR CANCELACIÓN'}
          </button>
        </div>
      </div>
    </div>
  )
}
