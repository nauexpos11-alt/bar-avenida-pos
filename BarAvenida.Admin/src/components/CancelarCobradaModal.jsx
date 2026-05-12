import { useState } from 'react'

export default function CancelarCobradaModal({ folio, onConfirmar, onCerrar }) {
  const [motivo, setMotivo]     = useState('')
  const [pinAdmin, setPinAdmin] = useState('')
  const [pinError, setPinError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const motivoValido = motivo.trim().length >= 10
  const pinValido    = pinAdmin.length >= 4 && /^\d+$/.test(pinAdmin)
  const valido       = motivoValido && pinValido

  const handleConfirmar = async () => {
    if (!valido || guardando) return
    setGuardando(true)
    setPinError('')
    try {
      // onConfirmar recibe (motivo, pinAdmin)
      await onConfirmar(motivo.trim(), pinAdmin)
    } catch (e) {
      const msg = e?.message || ''
      // Si el backend devuelve "PIN admin incorrecto" lo mostramos inline
      if (/pin admin/i.test(msg)) {
        setPinError(msg)
        setPinAdmin('')
      } else {
        // Otros errores se mostrarán en el toast del padre — pero re-lanzamos para visibilidad
        setPinError(msg || 'Error al cancelar')
      }
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
            {motivo.length > 0 && !motivoValido && <span className="ccm-short"> · mín. 10 caracteres</span>}
          </div>

          <label className="ccm-lbl" style={{ marginTop: 12 }}>
            PIN admin <span className="ccm-req">*</span>{' '}
            <small>(confirmación destructiva)</small>
          </label>
          <input
            type="password"
            inputMode="numeric"
            className="ccm-textarea"
            style={{
              fontSize: 18,
              letterSpacing: 8,
              textAlign: 'center',
              padding: '8px 12px',
              fontFamily: 'Courier New, monospace',
              ...(pinError ? { borderColor: '#c0392b' } : null),
            }}
            value={pinAdmin}
            maxLength={6}
            placeholder="••••"
            onChange={e => {
              setPinAdmin(e.target.value.replace(/\D/g,'').slice(0,6))
              if (pinError) setPinError('')
            }}
          />
          {pinError && (
            <div style={{ marginTop: 6, color: '#ff6b6b', fontSize: 12 }}>{pinError}</div>
          )}
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
