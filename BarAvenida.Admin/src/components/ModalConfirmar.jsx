export default function ModalConfirmar({ titulo, mensaje, labelConfirmar = 'Confirmar', variante = 'danger', onConfirmar, onCancelar }) {
  return (
    <div className="mc-overlay" onClick={onCancelar}>
      <div className="mc-box" onClick={e => e.stopPropagation()}>
        <p className="mc-titulo">{titulo}</p>
        {mensaje && <p className="mc-msg">{mensaje}</p>}
        <div className="mc-btns">
          <button className="mc-btn-no" onClick={onCancelar}>Cancelar</button>
          <button className={`mc-btn-si mc-btn-${variante}`} onClick={onConfirmar}>
            {labelConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
