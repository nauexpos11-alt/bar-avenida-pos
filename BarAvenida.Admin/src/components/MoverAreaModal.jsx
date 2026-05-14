import { useState, useEffect } from 'react'
import { api } from '../api'
import './MoverAreaModal.css'

export default function MoverAreaModal({ cuenta, auth, onClose, onGuardar }) {
  const [areas,     setAreas]     = useState([])
  const [areaNueva, setAreaNueva] = useState(cuenta.area || '')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    api.adminGetAreas(auth.token)
      .then(d => setAreas(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [auth.token])

  const handleGuardar = async () => {
    if (!areaNueva.trim()) return
    setGuardando(true)
    try { await onGuardar(areaNueva.trim()) }
    finally { setGuardando(false) }
  }

  return (
    <div className="mam-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="mam-modal">
        <div className="mam-header">
          <span>🚪 MOVER ÁREA</span>
          <button className="mam-close" onClick={onClose}>✕</button>
        </div>
        <div className="mam-body">
          <div className="mam-subtitulo">
            {cuenta.nombreCliente ? cuenta.nombreCliente : (cuenta.mesaNumero ? `Mesa ${cuenta.mesaNumero}` : 'BARRA')}
            {cuenta.area ? ` · Área actual: ${cuenta.area}` : ' · Sin área asignada'}
          </div>

          <label className="mam-label">Nueva área</label>

          {areas.length > 0 && (
            <div className="mam-sugerencias">
              {areas.map(a => (
                <button
                  key={a.id}
                  className={`mam-chip${areaNueva === a.nombre ? ' mam-chip-sel' : ''}`}
                  onClick={() => setAreaNueva(a.nombre)}
                  type="button"
                >
                  {a.nombre}
                </button>
              ))}
            </div>
          )}

          <input
            className="mam-input"
            value={areaNueva}
            onChange={e => setAreaNueva(e.target.value)}
            placeholder="Ej: Terraza / VIP / Comedor"
            maxLength={50}
          />
        </div>
        <div className="mam-footer">
          <button className="mam-btn-cancel" onClick={onClose} disabled={guardando}>
            Cancelar
          </button>
          <button
            className="mam-btn-guardar"
            onClick={handleGuardar}
            disabled={!areaNueva.trim() || guardando}
          >
            {guardando ? 'Moviendo…' : 'MOVER'}
          </button>
        </div>
      </div>
    </div>
  )
}
