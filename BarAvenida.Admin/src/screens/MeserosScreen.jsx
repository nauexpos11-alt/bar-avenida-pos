import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import ToastContainer from '../components/Toast'
import './MeserosScreen.css'

const VACIO = { nombre: '', codigo: '', pin: '', rol: 'Mesera', activo: true }

export default function MeserosScreen({ auth, onVolver }) {
  const [meseros,      setMeseros]      = useState([])
  const [cargando,     setCargando]     = useState(true)
  const [guardando,    setGuardando]    = useState(false)
  const [toasts,       setToasts]       = useState([])
  const [modal,        setModal]        = useState(null)
  const [form,         setForm]         = useState(VACIO)
  const [modalPin,     setModalPin]     = useState(null)   // { mesero }
  const [pinNuevo,     setPinNuevo]     = useState('')
  const [guardandoPin, setGuardandoPin] = useState(false)

  const toast = useCallback((msg, tipo = 'ok') => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, mensaje: msg, tipo }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000)
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    try { setMeseros(await api.adminGetMeseros(auth.token)) }
    catch (e) { toast('Error al cargar: ' + e.message, 'error') }
    finally   { setCargando(false) }
  }, [auth.token, toast])

  useEffect(() => { cargar() }, [cargar])

  const abrirNuevo = () => { setForm(VACIO); setModal({ modo: 'nuevo' }) }
  const abrirEditar = (m) => {
    setForm({ nombre: m.nombre, codigo: m.codigo, pin: '', rol: m.rol, activo: m.activo })
    setModal({ modo: 'editar', mesero: m })
  }

  const handleGuardar = async () => {
    if (!form.nombre.trim()) { toast('El nombre es requerido', 'error'); return }
    if (!form.codigo.trim()) { toast('El código es requerido', 'error'); return }
    if (modal.modo === 'nuevo' && form.pin.length < 4) { toast('El PIN debe tener al menos 4 dígitos', 'error'); return }
    setGuardando(true)
    try {
      if (modal.modo === 'nuevo') {
        await api.adminCreateMesero(auth.token, { nombre: form.nombre.trim(), codigo: form.codigo.trim(), pin: form.pin, rol: form.rol })
        toast('Mesero/barman creado')
      } else {
        await api.adminUpdateMesero(auth.token, modal.mesero.id, { nombre: form.nombre.trim(), codigo: form.codigo.trim(), pin: form.pin || undefined, rol: form.rol, activo: form.activo })
        toast('Mesero/barman actualizado')
      }
      setModal(null)
      cargar()
    } catch (e) { toast(e.message, 'error') }
    finally     { setGuardando(false) }
  }

  const handleDesactivar = async (m) => {
    const accion = m.activo ? 'desactivar' : 'activar'
    if (!confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} a "${m.nombre}"?`)) return
    try {
      await api.adminUpdateMesero(auth.token, m.id, { nombre: m.nombre, codigo: m.codigo, rol: m.rol, activo: !m.activo })
      toast(`Mesero ${accion === 'desactivar' ? 'desactivado' : 'activado'}`)
      cargar()
    } catch (e) { toast(e.message, 'error') }
  }

  const abrirResetPin = (m) => { setPinNuevo(''); setModalPin({ mesero: m }) }

  const handleResetPin = async () => {
    if (pinNuevo.length < 4) { toast('El PIN debe tener al menos 4 dígitos', 'error'); return }
    setGuardandoPin(true)
    try {
      await api.cambiarPinAdmin(auth.token, { codigoUsuario: modalPin.mesero.codigo, pinNuevo })
      toast('PIN actualizado')
      setModalPin(null)
    } catch (e) { toast(e.message, 'error') }
    finally { setGuardandoPin(false) }
  }

  const handleEliminarPerm = async (m) => {
    if (!confirm(`¿Eliminar PERMANENTEMENTE a "${m.nombre}"?\n\nEsta acción no se puede deshacer. Sólo es posible si el mesero no tiene cuentas asociadas.`)) return
    try {
      await api.adminDeleteMeseroPerm(auth.token, m.id)
      toast(`${m.nombre} eliminado permanentemente`)
      cargar()
    } catch (e) { toast(e.message, 'error') }
  }

  const fmtFecha = d => new Date(d).toLocaleDateString('es-MX')

  return (
    <div className="msr-screen">
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(ts => ts.filter(t => t.id !== id))} />

      <div className="msr-header">
        <div>
          <h2 className="msr-titulo">Meseros / Barman</h2>
          <div className="msr-breadcrumb">CATÁLOGOS → Meseros / Barman</div>
        </div>
        <div className="msr-header-btns">
          <button className="msr-btn-add" onClick={abrirNuevo}>+ Nuevo</button>
          <button className="msr-btn-x"   onClick={cargar} title="Refrescar">↻</button>
          <button className="msr-btn-x"   onClick={onVolver}>✕</button>
        </div>
      </div>

      <div className="msr-body">
        {cargando ? <div className="msr-loader">Cargando...</div> : (
          <table className="msr-tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Código</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Alta</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {meseros.length === 0 && <tr><td colSpan={6} className="msr-vacio">No hay meseros registrados</td></tr>}
              {meseros.map((m, i) => (
                <tr key={m.id} className={i % 2 === 0 ? 'msr-par' : 'msr-impar'}>
                  <td className="msr-td-nombre">{m.nombre}</td>
                  <td className="msr-td-cod">{m.codigo}</td>
                  <td>
                    <span className={`msr-chip-rol ${m.rol === 'Barman' ? 'msr-chip-bar' : 'msr-chip-mes'}`}>{m.rol}</span>
                  </td>
                  <td>
                    <span className={`msr-chip ${m.activo ? 'msr-chip-ok' : 'msr-chip-off'}`}>
                      {m.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="msr-td-fecha">{fmtFecha(m.fechaCreacion)}</td>
                  <td className="msr-td-acc">
                    <button className="msr-btn-edit"   onClick={() => abrirEditar(m)}>Editar</button>
                    <button className="msr-btn-toggle" onClick={() => handleDesactivar(m)}>
                      {m.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button className="msr-btn-pin"  onClick={() => abrirResetPin(m)} title="Resetear PIN">🔑 PIN</button>
                    <button className="msr-btn-perm" onClick={() => handleEliminarPerm(m)} title="Eliminar permanentemente">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="msr-overlay" onClick={() => setModal(null)}>
          <div className="msr-modal" onClick={e => e.stopPropagation()}>
            <div className="msr-modal-header">
              <span>{modal.modo === 'nuevo' ? 'Nuevo mesero / barman' : 'Editar mesero / barman'}</span>
              <button className="msr-btn-x" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="msr-modal-body">
              <label className="msr-lbl">Nombre *</label>
              <input className="msr-input" value={form.nombre} maxLength={100} autoFocus
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre completo" />

              <label className="msr-lbl">Código (login) *</label>
              <input className="msr-input" value={form.codigo} maxLength={20}
                onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Ej: 23, IRIS" />

              <label className="msr-lbl">PIN {modal.modo === 'editar' ? '(vacío = no cambiar)' : '*'}</label>
              <input className="msr-input" type="password" value={form.pin} maxLength={8}
                onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} placeholder="••••" />

              <label className="msr-lbl">Rol</label>
              <select className="msr-input" value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
                <option value="Mesera">Mesera</option>
                <option value="Barman">Barman</option>
              </select>

              {modal.modo === 'editar' && (
                <div className="msr-toggle-row">
                  <span className="msr-lbl">Activo</span>
                  <input type="checkbox" checked={form.activo}
                    onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />
                </div>
              )}
            </div>
            <div className="msr-modal-footer">
              <button className="msr-btn-guardar" onClick={handleGuardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button className="msr-btn-cerrar" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modalPin && (
        <div className="msr-overlay" onClick={() => setModalPin(null)}>
          <div className="msr-modal" onClick={e => e.stopPropagation()}>
            <div className="msr-modal-header">
              <span>Resetear PIN — {modalPin.mesero.nombre}</span>
              <button className="msr-btn-x" onClick={() => setModalPin(null)}>✕</button>
            </div>
            <div className="msr-modal-body">
              <label className="msr-lbl">Nuevo PIN *</label>
              <input
                className="msr-input"
                type="password"
                value={pinNuevo}
                maxLength={8}
                autoFocus
                onChange={e => setPinNuevo(e.target.value)}
                placeholder="Mínimo 4 dígitos"
                onKeyDown={e => e.key === 'Enter' && !guardandoPin && handleResetPin()}
              />
            </div>
            <div className="msr-modal-footer">
              <button className="msr-btn-guardar" onClick={handleResetPin} disabled={guardandoPin}>
                {guardandoPin ? 'Guardando...' : 'Actualizar PIN'}
              </button>
              <button className="msr-btn-cerrar" onClick={() => setModalPin(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
