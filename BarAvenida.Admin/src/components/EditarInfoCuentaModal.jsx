import { useState } from 'react'
import './EditarInfoCuentaModal.css'

export default function EditarInfoCuentaModal({ cuenta, onClose, onGuardar }) {
  const [nombre,   setNombre]   = useState(cuenta.nombreCliente || '')
  const [personas, setPersonas] = useState(String(cuenta.numeroPersonas || 1))
  const [area,     setArea]     = useState(cuenta.area || '')
  const [guardando, setGuardando] = useState(false)

  const handleGuardar = async () => {
    setGuardando(true)
    try {
      await onGuardar({
        nombreCliente:  nombre.trim() || null,
        numeroPersonas: parseInt(personas) || null,
        area:           area.trim() || null,
      })
    } finally { setGuardando(false) }
  }

  return (
    <div className="eim-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="eim-modal">
        <div className="eim-header">
          <span>✏️ EDITAR INFO DE CUENTA</span>
          <button className="eim-close" onClick={onClose}>✕</button>
        </div>
        <div className="eim-body">
          <div className="eim-subtitulo">
            {cuenta.mesaNumero ? `Mesa ${cuenta.mesaNumero}` : (cuenta.nombreCliente || 'BARRA')}
            {' · '}Folio #{cuenta.folio}
          </div>

          <label className="eim-label">Alias / Nombre del cliente</label>
          <input
            className="eim-input"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Mesa del jefe / Diablo / sin alias"
            maxLength={100}
          />

          <label className="eim-label">Número de personas</label>
          <input
            className="eim-input eim-input--short"
            type="number"
            min={1}
            max={50}
            value={personas}
            onChange={e => setPersonas(e.target.value)}
          />

          <label className="eim-label">Área</label>
          <input
            className="eim-input"
            value={area}
            onChange={e => setArea(e.target.value)}
            placeholder="Ej: Terraza / VIP / Comedor"
            maxLength={50}
          />
        </div>
        <div className="eim-footer">
          <button className="eim-btn-cancel" onClick={onClose} disabled={guardando}>
            Cancelar
          </button>
          <button className="eim-btn-guardar" onClick={handleGuardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'GUARDAR'}
          </button>
        </div>
      </div>
    </div>
  )
}
