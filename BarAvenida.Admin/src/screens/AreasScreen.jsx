import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import PinAdminModal from '../components/PinAdminModal'
import ToastContainer from '../components/Toast'
import Icon from '../components/Icon'
import './AreasScreen.css'

const VACIO = { nombre: '', activa: true }

export default function AreasScreen({ auth, onVolver }) {
  const [areas,     setAreas]     = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [toasts,    setToasts]    = useState([])
  const [modal,     setModal]     = useState(null)  // null | { modo:'nuevo'|'editar', area }
  const [form,      setForm]      = useState(VACIO)
  const [pinModal,  setPinModal]  = useState(null)  // { area } — confirmación admin para eliminar

  const toast = useCallback((msg, tipo = 'ok') => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, mensaje: msg, tipo }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000)
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const d = await api.adminGetAreas(auth.token)
      setAreas(Array.isArray(d) ? d : [])
    }
    catch (e) { toast('Error al cargar áreas: ' + e.message, 'error') }
    finally   { setCargando(false) }
  }, [auth.token, toast])

  useEffect(() => { cargar() }, [cargar])

  // Esc cierra modales
  useEffect(() => {
    if (!modal && !pinModal) return
    const onKey = (e) => {
      if (e.key === 'Escape') { setModal(null); setPinModal(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, pinModal])

  const abrirNuevo = () => { setForm(VACIO); setModal({ modo: 'nuevo' }) }
  const abrirEditar = (a) => { setForm({ nombre: a.nombre, activa: a.activa }); setModal({ modo: 'editar', area: a }) }

  const handleGuardar = async () => {
    const nombreTrim = String(form.nombre || '').trim()
    if (!nombreTrim) { toast('El nombre es requerido', 'error'); return }
    setGuardando(true)
    try {
      const payload = { ...form, nombre: nombreTrim }
      if (modal.modo === 'nuevo') {
        await api.adminCreateArea(auth.token, payload)
        toast('Área creada')
      } else {
        await api.adminUpdateArea(auth.token, modal.area.id, payload)
        toast('Área actualizada')
      }
      setModal(null)
      cargar()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = (area) => {
    // Acción destructiva: pide PIN admin antes de eliminar
    setPinModal({ area })
  }

  const confirmarEliminar = async (pin) => {
    const area = pinModal?.area
    if (!area) return
    try {
      await api.adminDeleteArea(auth.token, area.id, pin)
      toast('Área eliminada')
      setPinModal(null)
      cargar()
    } catch (e) {
      // Re-lanzamos para que PinAdminModal muestre el error inline
      throw e
    }
  }

  return (
    <div className="as-screen">
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(ts => ts.filter(t => t.id !== id))} />

      <div className="as-header">
        <div>
          <h2 className="as-titulo">Áreas de venta</h2>
          <div className="as-breadcrumb">CONFIGURACIÓN → Áreas de venta</div>
        </div>
        <div className="as-header-btns">
          <button className="as-btn-add" onClick={abrirNuevo}><Icon name="add" size={14} /> Nueva área</button>
          <button className="as-btn-x" onClick={cargar} title="Refrescar" aria-label="Refrescar"><Icon name="refresh" size={14} /></button>
          <button className="as-btn-x" onClick={onVolver} aria-label="Cerrar"><Icon name="close" size={14} /></button>
        </div>
      </div>

      <div className="as-body">
        {cargando ? (
          <div className="as-loader">Cargando...</div>
        ) : (
          <table className="as-tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Mesas activas</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {areas.length === 0 && (
                <tr><td colSpan={4} className="as-vacio">No hay áreas registradas</td></tr>
              )}
              {areas.map((a, i) => (
                <tr key={a.id} className={i % 2 === 0 ? 'as-par' : 'as-impar'}>
                  <td className="as-td-nombre">{a.nombre}</td>
                  <td>{a.mesasCount}</td>
                  <td>
                    <span className={`as-chip ${a.activa ? 'as-chip-ok' : 'as-chip-off'}`}>
                      {a.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="as-td-acc">
                    <button className="as-btn-edit" onClick={() => abrirEditar(a)}>Editar</button>
                    <button className="as-btn-del"  onClick={() => handleEliminar(a)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pinModal && (
        <PinAdminModal
          titulo="Eliminar área"
          mensaje={`Vas a eliminar el área "${pinModal.area.nombre}". Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          peligro
          onConfirm={confirmarEliminar}
          onCancel={() => setPinModal(null)}
        />
      )}

      {modal && (
        <div className="as-overlay" onClick={() => setModal(null)}>
          <div className="as-modal" onClick={e => e.stopPropagation()}>
            <div className="as-modal-header">
              <span>{modal.modo === 'nuevo' ? 'Nueva área' : 'Editar área'}</span>
              <button className="as-btn-x" onClick={() => setModal(null)} aria-label="Cerrar"><Icon name="close" size={14} /></button>
            </div>
            <div className="as-modal-body">
              <label className="as-lbl">Nombre *</label>
              <input
                className="as-input"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Terraza"
                maxLength={50}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && !guardando && handleGuardar()}
              />
              <div className="as-toggle-row">
                <span className="as-lbl">Activa</span>
                <input
                  type="checkbox"
                  checked={form.activa}
                  onChange={e => setForm(f => ({ ...f, activa: e.target.checked }))}
                />
              </div>
            </div>
            <div className="as-modal-footer">
              <button className="as-btn-guardar" onClick={handleGuardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button className="as-btn-cerrar" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
