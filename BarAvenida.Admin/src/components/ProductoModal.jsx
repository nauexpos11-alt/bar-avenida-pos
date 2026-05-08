import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

const TIPOS = ['Pieza', 'Shot', 'Botella']

export default function ProductoModal({ auth, producto, categorias, onGuardado, onCerrar, onError }) {
  const esNuevo = !producto
  const [form, setForm] = useState({
    nombre:           producto?.nombre           ?? '',
    categoriaId:      producto?.categoriaId      ?? (categorias[0]?.id ?? ''),
    precio:           producto?.precio           ?? '',
    tipoVenta:        producto?.tipoVenta        ?? 'Pieza',
    cantidadDescuento: producto?.cantidadDescuento ?? 1,
    orden:            producto?.orden            ?? 0,
    activo:           producto?.activo           ?? true,
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
        nombre:            form.nombre.trim(),
        categoriaId:       Number(form.categoriaId),
        precio:            Number(form.precio) || 0,
        tipoVenta:         form.tipoVenta,
        cantidadDescuento: Number(form.cantidadDescuento) || 1,
        orden:             Number(form.orden) || 0,
        ...(!esNuevo && { activo: form.activo }),
      }
      const result = esNuevo
        ? await api.adminCrearProducto(auth.token, dto)
        : await api.adminActualizarProducto(auth.token, producto.id, dto)
      onGuardado(result, esNuevo)
    } catch (e) {
      onError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const mostrarCantidad = form.tipoVenta === 'Shot' || form.tipoVenta === 'Botella'

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onCerrar()}>
      <div className="modal-box pm-box" onMouseDown={e => e.stopPropagation()}>

        <div className="pm-header">
          <span className="pm-titulo">{esNuevo ? 'NUEVO PRODUCTO' : 'EDITAR PRODUCTO'}</span>
          <button className="pm-close" onClick={onCerrar}>✕</button>
        </div>

        <div className="pm-fields">
          <label className="pm-label">NOMBRE</label>
          <input
            ref={nombreRef}
            className="pm-input"
            value={form.nombre}
            onChange={e => set('nombre', e.target.value)}
            maxLength={100}
            placeholder="Nombre del producto"
          />

          <label className="pm-label">CATEGORÍA</label>
          <select className="pm-select" value={form.categoriaId} onChange={e => set('categoriaId', e.target.value)}>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>

          <label className="pm-label">PRECIO</label>
          <div className="pm-prefix-wrap">
            <span className="pm-prefix">$</span>
            <input
              className="pm-input pm-input-pfx"
              type="number"
              min="0"
              step="0.01"
              value={form.precio}
              onChange={e => set('precio', e.target.value)}
              placeholder="0.00"
            />
          </div>

          <label className="pm-label">TIPO DE VENTA</label>
          <div className="pm-tipo-grid">
            {TIPOS.map(t => (
              <button
                key={t}
                type="button"
                className={`pm-tipo-btn${form.tipoVenta === t ? ' pm-tipo-act' : ''}`}
                onClick={() => set('tipoVenta', t)}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {mostrarCantidad && (
            <>
              <label className="pm-label">
                CANTIDAD DESCUENTO
                <span className="pm-hint"> (shots por servicio o unidades por botella)</span>
              </label>
              <input
                className="pm-input"
                type="number"
                min="1"
                step="0.5"
                value={form.cantidadDescuento}
                onChange={e => set('cantidadDescuento', e.target.value)}
              />
            </>
          )}

          <label className="pm-label">ORDEN</label>
          <input
            className="pm-input"
            type="number"
            value={form.orden}
            onChange={e => set('orden', e.target.value)}
          />

          {!esNuevo && (
            <>
              <label className="pm-label">ESTADO</label>
              <button
                type="button"
                className={`pm-toggle${form.activo ? ' pm-toggle-on' : ' pm-toggle-off'}`}
                onClick={() => set('activo', !form.activo)}
              >
                {form.activo ? 'ACTIVO' : 'INACTIVO'}
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
