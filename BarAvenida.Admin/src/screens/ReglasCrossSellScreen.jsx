import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import ToastContainer from '../components/Toast'
import './ReglasCrossSellScreen.css'

const VACIO_FORM = { productoOrigenId: '', productoSugeridoId: '', prioridad: 100, activo: true }

export default function ReglasCrossSellScreen({ auth, onVolver }) {
  const [reglas,     setReglas]     = useState([])
  const [productos,  setProductos]  = useState([])
  const [cargando,   setCargando]   = useState(true)
  const [guardando,  setGuardando]  = useState(false)
  const [modal,      setModal]      = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form,       setForm]       = useState(VACIO_FORM)
  const [toasts,     setToasts]     = useState([])

  const toast = useCallback((msg, tipo = 'ok') => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, mensaje: msg, tipo }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000)
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [r, p] = await Promise.all([
        api.adminGetReglasCrossSell(auth.token),
        api.adminGetProductos(auth.token, { activo: true }),
      ])
      setReglas(Array.isArray(r) ? r : [])
      setProductos(Array.isArray(p) ? p : [])
    } catch (e) {
      toast('Error al cargar: ' + e.message, 'error')
    } finally {
      setCargando(false)
    }
  }, [auth.token, toast])

  useEffect(() => { cargar() }, [cargar])

  const abrirModal = () => { setEditandoId(null); setForm(VACIO_FORM); setModal(true) }

  const abrirEditar = (r) => {
    setEditandoId(r.id)
    setForm({
      productoOrigenId:   String(r.productoOrigenId),
      productoSugeridoId: String(r.productoSugeridoId),
      prioridad:          r.prioridad,
      activo:             r.activo,
    })
    setModal(true)
  }

  const handleGuardar = async () => {
    if (!form.productoOrigenId)   { toast('Selecciona producto origen', 'error'); return }
    if (!form.productoSugeridoId) { toast('Selecciona producto sugerido', 'error'); return }
    if (Number(form.productoOrigenId) === Number(form.productoSugeridoId)) {
      toast('Origen y sugerido no pueden ser el mismo producto', 'error'); return
    }
    const prioridad = parseInt(form.prioridad, 10)
    if (isNaN(prioridad) || prioridad < 1) { toast('Prioridad debe ser un número mayor a 0', 'error'); return }

    setGuardando(true)
    try {
      const payload = {
        productoOrigenId:   Number(form.productoOrigenId),
        productoSugeridoId: Number(form.productoSugeridoId),
        prioridad,
        activo: form.activo,
      }
      if (editandoId) {
        await api.adminUpdateReglaCrossSell(auth.token, editandoId, payload)
        toast('Regla actualizada')
      } else {
        await api.adminCrearReglaCrossSell(auth.token, payload)
        toast('Regla creada')
      }
      setModal(false)
      cargar()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  const handleToggleActivo = async (r) => {
    try {
      await api.adminUpdateReglaCrossSell(auth.token, r.id, {
        prioridad: r.prioridad,
        activo:    !r.activo,
      })
      setReglas(prev => prev.map(x => x.id === r.id ? { ...x, activo: !x.activo } : x))
    } catch (e) {
      toast('Error al actualizar: ' + e.message, 'error')
    }
  }

  const handleEliminar = async (r) => {
    if (!confirm(`¿Eliminar la regla "${r.productoOrigenNombre} → ${r.productoSugeridoNombre}"?`)) return
    try {
      await api.adminDeleteReglaCrossSell(auth.token, r.id)
      toast('Regla eliminada')
      setReglas(prev => prev.filter(x => x.id !== r.id))
    } catch (e) {
      toast('Error al eliminar: ' + e.message, 'error')
    }
  }

  return (
    <div className="rcs-screen">
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(ts => ts.filter(t => t.id !== id))} />

      <div className="rcs-header">
        <div>
          <h2 className="rcs-titulo">Reglas de Sugerencias (Cross-sell)</h2>
          <div className="rcs-breadcrumb">CATÁLOGOS → Reglas de sugerencias</div>
        </div>
        <div className="rcs-header-btns">
          <button className="rcs-btn-add" onClick={abrirModal}>+ Nueva regla</button>
          <button className="rcs-btn-x"   onClick={cargar} title="Refrescar">↻</button>
          <button className="rcs-btn-x"   onClick={onVolver}>✕</button>
        </div>
      </div>

      <div className="rcs-body">
        {cargando ? (
          <div className="rcs-loader">Cargando...</div>
        ) : (
          <table className="rcs-tabla">
            <thead>
              <tr>
                <th>Producto origen</th>
                <th className="rcs-th-arrow">→</th>
                <th>Producto sugerido</th>
                <th className="rcs-th-precio">Precio</th>
                <th className="rcs-th-prio">Prioridad</th>
                <th className="rcs-th-activo">Activo</th>
                <th className="rcs-th-acc"></th>
              </tr>
            </thead>
            <tbody>
              {reglas.length === 0 && (
                <tr>
                  <td colSpan={7} className="rcs-vacio">
                    No hay reglas configuradas. Usa "+ Nueva regla" para crear la primera.
                  </td>
                </tr>
              )}
              {reglas.map((r, i) => (
                <tr key={r.id} className={i % 2 === 0 ? 'rcs-par' : 'rcs-impar'}>
                  <td className="rcs-td-origen">{r.productoOrigenNombre}</td>
                  <td className="rcs-td-arrow">→</td>
                  <td className="rcs-td-sugerido">{r.productoSugeridoNombre}</td>
                  <td className="rcs-td-precio">${Number(r.productoSugeridoPrecio ?? 0).toFixed(0)}</td>
                  <td className="rcs-td-prio">{r.prioridad}</td>
                  <td className="rcs-td-activo">
                    <button
                      className={`rcs-toggle ${r.activo ? 'rcs-toggle-on' : 'rcs-toggle-off'}`}
                      onClick={() => handleToggleActivo(r)}
                      title={r.activo ? 'Desactivar' : 'Activar'}
                    >
                      {r.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="rcs-td-acc">
                    <button
                      className="rcs-btn-edit"
                      onClick={() => abrirEditar(r)}
                      title="Editar regla"
                    >
                      ✏
                    </button>
                    <button
                      className="rcs-btn-del"
                      onClick={() => handleEliminar(r)}
                      title="Eliminar regla"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="rcs-overlay" onClick={() => setModal(false)}>
          <div className="rcs-modal" onClick={e => e.stopPropagation()}>
            <div className="rcs-modal-header">
              <span>{editandoId ? 'Editar regla de sugerencia' : 'Nueva regla de sugerencia'}</span>
              <button className="rcs-btn-x" onClick={() => setModal(false)}>✕</button>
            </div>

            <div className="rcs-modal-body">
              <label className="rcs-lbl">Producto origen *</label>
              <select
                className="rcs-select"
                value={form.productoOrigenId}
                onChange={e => setForm(f => ({ ...f, productoOrigenId: e.target.value }))}
              >
                <option value="">— Selecciona —</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>

              <label className="rcs-lbl">Producto sugerido *</label>
              <select
                className="rcs-select"
                value={form.productoSugeridoId}
                onChange={e => setForm(f => ({ ...f, productoSugeridoId: e.target.value }))}
              >
                <option value="">— Selecciona —</option>
                {productos.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>

              <label className="rcs-lbl">Prioridad (menor = primero)</label>
              <input
                className="rcs-input"
                type="number"
                min={1}
                max={9999}
                value={form.prioridad}
                onChange={e => setForm(f => ({ ...f, prioridad: e.target.value }))}
              />

              <div className="rcs-check-row">
                <input
                  type="checkbox"
                  id="rcs-activo"
                  checked={form.activo}
                  onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
                />
                <label htmlFor="rcs-activo" className="rcs-check-lbl">Activa desde el inicio</label>
              </div>
            </div>

            <div className="rcs-modal-footer">
              <button className="rcs-btn-guardar" onClick={handleGuardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button className="rcs-btn-cerrar" onClick={() => setModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
