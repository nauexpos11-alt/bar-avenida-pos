import './Modal.css'

export default function Modal({ titulo, children, onClose, accionLabel, onAccion, accionPeligrosa = false, accionDeshabilitada = false }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-titulo">{titulo}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={onClose}>Cancelar</button>
          {onAccion && (
            <button
              className={`modal-btn-ok${accionPeligrosa ? ' peligrosa' : ''}`}
              onClick={onAccion}
              disabled={accionDeshabilitada}
            >
              {accionLabel ?? 'Aceptar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
