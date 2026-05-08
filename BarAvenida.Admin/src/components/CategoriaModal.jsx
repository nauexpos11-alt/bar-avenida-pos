import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

const COLORES = ['#FFD700','#EF4444','#3B82F6','#22C55E','#A855F7','#F97316','#EC4899','#06B6D4']

export default function CategoriaModal({ auth, categoria, onGuardado, onCerrar, onError }) {
  const esNuevo = !categoria
  const [form, setForm] = useState({
    nombre:   categoria?.nombre   ?? '',
    orden:    categoria?.orden    ?? 99,
    colorHex: categoria?.colorHex ?? '#FFD700',
    activa:   categoria?.activa   ?? true,
  })
  const [guardando, setGuardando] = useState(false)
  const nombreRef = useRef(null)

  useEffect(() => { nombreRef.current?.focus() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleGuardar = async () => {
    if (!form.nombre.trim()) return
    setGuardando(true)
    try {
      const dto = {
        nombre:   form.nombre.trim(),
        orden:    Number(form.orden) || 99,
        colorHex: form.colorHex,
        ...(!esNuevo && { activa: form.activa }),
      }
      const result = esNuevo
        ? await api.adminCrearCategoria(auth.token, dto)
        : await api.adminActualizarCategoria(auth.token, categoria.id, dto)
      onGuardado(result, esNuevo)
    } catch (e) {
      onError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onCerrar()}>
      <div className="modal-box pm-box" onMouseDown={e => e.stopPropagation()}>

        <div className="pm-header">
          <span className="pm-titulo">{esNuevo ? 'NUEVA CATEGORÍA' : 'EDITAR CATEGORÍA'}</span>
          <button className="pm-close" onClick={onCerrar}>✕</button>
        </div>

        <div className="pm-fields">
          <label className="pm-label">NOMBRE</label>
          <input
            ref={nombreRef}
            className="pm-input"
            value={form.nombre}
            onChange={e => set('nombre', e.target.value)}
            maxLength={50}
            placeholder="Nombre de la categoría"
          />

          <label className="pm-label">ORDEN</label>
          <input
            className="pm-input"
            type="number"
            value={form.orden}
            onChange={e => set('orden', e.target.value)}
          />

          <label className="pm-label">COLOR</label>
          <div className="cm-colores">
            {COLORES.map(c => (
              <button
                key={c}
                type="button"
                title={c}
                className={`cm-color-btn${form.colorHex.toUpperCase() === c ? ' cm-color-sel' : ''}`}
                style={{ background: c }}
                onClick={() => set('colorHex', c)}
              />
            ))}
          </div>
          <input
            className="pm-input cm-hex-input"
            value={form.colorHex}
            onChange={e => set('colorHex', e.target.value)}
            placeholder="#FFD700"
            maxLength={7}
          />

          {!esNuevo && (
            <>
              <label className="pm-label">ESTADO</label>
              <button
                type="button"
                className={`pm-toggle${form.activa ? ' pm-toggle-on' : ' pm-toggle-off'}`}
                onClick={() => set('activa', !form.activa)}
              >
                {form.activa ? 'ACTIVA' : 'INACTIVA'}
              </button>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCerrar}>CANCELAR</button>
          <button
            className="btn-primary"
            onClick={handleGuardar}
            disabled={!form.nombre.trim() || guardando}
          >
            {guardando ? '...' : 'GUARDAR'}
          </button>
        </div>
      </div>
    </div>
  )
}
