import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import ToastContainer from '../components/Toast'
import './MesasScreen.css'

const VACIO = { numero: '', areaId: '', capacidad: 4, activa: true }

export default function MesasScreen({ auth, onVolver }) {
  const [mesas,             setMesas]             = useState([])
  const [areas,             setAreas]             = useState([])
  const [cargando,          setCargando]          = useState(true)
  const [guardando,         setGuardando]         = useState(false)
  const [eliminandoMasivo,  setEliminandoMasivo]  = useState(false)
  const [toasts,            setToasts]            = useState([])
  const [modal,             setModal]             = useState(null)
  const [form,              setForm]              = useState(VACIO)
  const [filtroArea,        setFiltroArea]        = useState('')
  const [seleccion,         setSeleccion]         = useState(new Set())

  const toast = useCallback((msg, tipo = 'ok') => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, mensaje: msg, tipo }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000)
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    setSeleccion(new Set())
    try {
      const [m, a] = await Promise.all([
        api.adminGetMesas(auth.token),
        api.adminGetAreas(auth.token),
      ])
      setMesas(Array.isArray(m) ? m : [])
      setAreas(Array.isArray(a) ? a : [])
    } catch (e) { toast('Error al cargar: ' + e.message, 'error') }
    finally     { setCargando(false) }
  }, [auth.token, toast])

  useEffect(() => { cargar() }, [cargar])

  const mesasFiltradas = filtroArea ? mesas.filter(m => m.areaId === Number(filtroArea)) : mesas
  const todosSeleccionados = mesasFiltradas.length > 0 && mesasFiltradas.every(m => seleccion.has(m.id))

  const toggleSeleccion = (id) =>
    setSeleccion(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleTodos = () => {
    if (todosSeleccionados) {
      setSeleccion(prev => {
        const next = new Set(prev)
        mesasFiltradas.forEach(m => next.delete(m.id))
        return next
      })
    } else {
      setSeleccion(prev => {
        const next = new Set(prev)
        mesasFiltradas.forEach(m => next.add(m.id))
        return next
      })
    }
  }

  const abrirNuevo = () => {
    setForm({ ...VACIO, areaId: areas[0]?.id ?? '' })
    setModal({ modo: 'nuevo' })
  }
  const abrirEditar = (m) => {
    setForm({ numero: String(m.numero ?? ''), areaId: m.areaId, capacidad: m.capacidad, activa: m.activa })
    setModal({ modo: 'editar', mesa: m })
  }

  const handleGuardar = async () => {
    const numStr = String(form.numero ?? '').trim()
    if (!numStr)             { toast('El número es requerido', 'error'); return }
    if (!form.areaId)        { toast('Selecciona un área', 'error'); return }
    setGuardando(true)
    try {
      const dto = { numero: numStr, areaId: Number(form.areaId), capacidad: Number(form.capacidad), activa: form.activa }
      if (modal.modo === 'nuevo') { await api.adminCreateMesa(auth.token, dto); toast('Mesa creada') }
      else                        { await api.adminUpdateMesa(auth.token, modal.mesa.id, dto); toast('Mesa actualizada') }
      setModal(null)
      cargar()
    } catch (e) { toast(e.message, 'error') }
    finally     { setGuardando(false) }
  }

  const handleEliminar = async (m) => {
    if (!confirm(`¿Eliminar la mesa "${m.numero}"?`)) return
    try { await api.adminDeleteMesa(auth.token, m.id); toast('Mesa eliminada'); cargar() }
    catch (e) { toast(e.message, 'error') }
  }

  const handleEliminarMasivo = async () => {
    const ids = [...seleccion].filter(id => mesasFiltradas.some(m => m.id === id))
    if (ids.length === 0) return
    if (!confirm(`¿Eliminar ${ids.length} mesa(s) seleccionada(s)? Esta acción no se puede deshacer.`)) return

    setEliminandoMasivo(true)
    let ok = 0, errores = 0
    for (const id of ids) {
      try { await api.adminDeleteMesa(auth.token, id); ok++ }
      catch { errores++ }
    }
    setEliminandoMasivo(false)

    if (errores === 0) toast(`${ok} mesa(s) eliminada(s)`)
    else toast(`${ok} eliminada(s), ${errores} con error (posiblemente tienen cuentas)`, 'error')
    cargar()
  }

  const seleccionActiva = [...seleccion].filter(id => mesasFiltradas.some(m => m.id === id))

  return (
    <div className="ms-screen">
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(ts => ts.filter(t => t.id !== id))} />

      <div className="ms-header">
        <div>
          <h2 className="ms-titulo">Mesas</h2>
          <div className="ms-breadcrumb">CATÁLOGOS → Mesas</div>
        </div>
        <div className="ms-header-btns">
          <select className="ms-select-area" value={filtroArea} onChange={e => { setFiltroArea(e.target.value); setSeleccion(new Set()) }}>
            <option value="">Todas las áreas</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
          <button className="ms-btn-add" onClick={abrirNuevo}>+ Nueva mesa</button>
          <button className="ms-btn-x"   onClick={cargar} title="Refrescar">↻</button>
          <button className="ms-btn-x"   onClick={onVolver}>✕</button>
        </div>
      </div>

      {/* Barra de selección masiva */}
      {seleccionActiva.length > 0 && (
        <div className="ms-bulk-bar">
          <span className="ms-bulk-count">{seleccionActiva.length} mesa(s) seleccionada(s)</span>
          <button
            className="ms-bulk-del"
            onClick={handleEliminarMasivo}
            disabled={eliminandoMasivo}
          >
            {eliminandoMasivo ? 'Eliminando...' : '🗑️ Eliminar seleccionadas'}
          </button>
          <button className="ms-bulk-clear" onClick={() => setSeleccion(new Set())}>✖ Limpiar selección</button>
        </div>
      )}

      <div className="ms-body">
        {cargando ? (
          <div className="ms-loader">Cargando...</div>
        ) : (
          <table className="ms-tabla">
            <thead>
              <tr>
                <th style={{ width: 36, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={todosSeleccionados}
                    onChange={toggleTodos}
                    title="Seleccionar todos"
                  />
                </th>
                <th>Número</th>
                <th>Área</th>
                <th>Capacidad</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {mesasFiltradas.length === 0 && (
                <tr><td colSpan={6} className="ms-vacio">No hay mesas</td></tr>
              )}
              {mesasFiltradas.map((m, i) => (
                <tr key={m.id} className={`${i % 2 === 0 ? 'ms-par' : 'ms-impar'}${seleccion.has(m.id) ? ' ms-row-sel' : ''}`}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={seleccion.has(m.id)}
                      onChange={() => toggleSeleccion(m.id)}
                    />
                  </td>
                  <td className="ms-td-num">{m.numero}</td>
                  <td>{m.areaNombre}</td>
                  <td>{m.capacidad} pers.</td>
                  <td>
                    <span className={`ms-chip ${m.activa ? 'ms-chip-ok' : 'ms-chip-off'}`}>
                      {m.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="ms-td-acc">
                    <button className="ms-btn-edit" onClick={() => abrirEditar(m)}>Editar</button>
                    <button className="ms-btn-del"  onClick={() => handleEliminar(m)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="ms-overlay" onClick={() => setModal(null)}>
          <div className="ms-modal" onClick={e => e.stopPropagation()}>
            <div className="ms-modal-header">
              <span>{modal.modo === 'nuevo' ? 'Nueva mesa' : 'Editar mesa'}</span>
              <button className="ms-btn-x" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="ms-modal-body">
              <label className="ms-lbl">Número *</label>
              <input className="ms-input" value={form.numero} autoFocus maxLength={20}
                onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                placeholder="Ej: 1, 27_C, 30_1" />

              <label className="ms-lbl">Área *</label>
              <select className="ms-input" value={form.areaId} onChange={e => setForm(f => ({ ...f, areaId: e.target.value }))}>
                <option value="">Seleccionar área...</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>

              <label className="ms-lbl">Capacidad</label>
              <input className="ms-input" type="number" min={1} max={50} value={form.capacidad}
                onChange={e => setForm(f => ({ ...f, capacidad: e.target.value }))} />

              <div className="ms-toggle-row">
                <span className="ms-lbl">Activa</span>
                <input type="checkbox" checked={form.activa}
                  onChange={e => setForm(f => ({ ...f, activa: e.target.checked }))} />
              </div>
            </div>
            <div className="ms-modal-footer">
              <button className="ms-btn-guardar" onClick={handleGuardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button className="ms-btn-cerrar" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
