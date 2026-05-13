import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import ToastContainer from '../components/Toast'
import './MeserosScreen.css'

const VACIO = { nombre: '', codigo: '', pin: '', rol: 'Mesera', activo: true }

// PIN admin requerido para resetear PIN de mesera
function isPinAdminInvalido(pin) {
  return !pin || pin.length < 4 || !/^\d+$/.test(pin)
}

export default function MeserosScreen({ auth, onVolver }) {
  const [meseros,      setMeseros]      = useState([])
  const [cargando,     setCargando]     = useState(true)
  const [guardando,    setGuardando]    = useState(false)
  const [toasts,       setToasts]       = useState([])
  const [modal,        setModal]        = useState(null)
  const [form,         setForm]         = useState(VACIO)
  const [modalPin,     setModalPin]     = useState(null)   // { mesero }
  const [pinNuevo,     setPinNuevo]     = useState('')
  const [pinAdminInput,setPinAdminInput]= useState('')
  const [guardandoPin, setGuardandoPin] = useState(false)
  const [pinAdminError,setPinAdminError]= useState('')
  // Modal de eliminacion definitiva — pide PIN admin
  const [modalEliminar,    setModalEliminar]    = useState(null)  // { mesero }
  const [pinEliminar,      setPinEliminar]      = useState('')
  const [pinEliminarError, setPinEliminarError] = useState('')
  const [eliminando,       setEliminando]       = useState(false)
  // Filtro por rol
  const [filtroRol,    setFiltroRol]    = useState('Todos')   // Todos | Admin | Mesera

  const toast = useCallback((msg, tipo = 'ok') => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, mensaje: msg, tipo }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000)
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const d = await api.adminGetMeseros(auth.token)
      setMeseros(Array.isArray(d) ? d : [])
    }
    catch (e) { toast('Error al cargar: ' + e.message, 'error') }
    finally   { setCargando(false) }
  }, [auth.token, toast])

  useEffect(() => { cargar() }, [cargar])

  const abrirNuevo = () => { setForm(VACIO); setModal({ modo: 'nuevo' }) }
  const abrirEditar = (m) => {
    // Si el rol guardado es "Barman" (legacy), al editar default cambia a "Admin"
    const rolEdit = (m.rol === 'Mesera' || m.rol === 'Admin') ? m.rol : 'Admin'
    setForm({ nombre: m.nombre, codigo: m.codigo, pin: '', rol: rolEdit, activo: m.activo })
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

  const abrirResetPin = (m) => {
    setPinNuevo('')
    setPinAdminInput('')
    setPinAdminError('')
    setModalPin({ mesero: m })
  }

  const handleResetPin = async () => {
    if (pinNuevo.length < 4) { toast('El PIN nuevo debe tener al menos 4 dígitos', 'error'); return }
    if (isPinAdminInvalido(pinAdminInput)) { setPinAdminError('Ingresa tu PIN admin (mín. 4 dígitos)'); return }
    setPinAdminError('')
    setGuardandoPin(true)
    try {
      await api.cambiarPinAdmin(auth.token, {
        codigoUsuario: modalPin.mesero.codigo,
        pinNuevo,
        pin: pinAdminInput,
      })
      toast('PIN actualizado')
      setModalPin(null)
    } catch (e) {
      // Si el backend dice "PIN admin incorrecto" lo mostramos inline; si no, toast
      const msg = e?.message || ''
      if (/pin admin/i.test(msg)) {
        setPinAdminError(msg)
        setPinAdminInput('')
      } else {
        toast(msg || 'Error al actualizar PIN', 'error')
      }
    }
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

  // Eliminacion DEFINITIVA forzada con PIN admin — borra al usuario aunque tenga
  // cuentas (las referencias en auditoria/cuentas quedan sueltas). Solicitud Coronado.
  const abrirEliminar = (m) => {
    setPinEliminar('')
    setPinEliminarError('')
    setModalEliminar({ mesero: m })
  }

  const handleEliminarDefinitivo = async () => {
    if (isPinAdminInvalido(pinEliminar)) { setPinEliminarError('Ingresa tu PIN admin (mín. 4 dígitos)'); return }
    setPinEliminarError('')
    setEliminando(true)
    try {
      await api.adminEliminarUsuario(auth.token, modalEliminar.mesero.id, pinEliminar)
      toast(`${modalEliminar.mesero.nombre} eliminado definitivamente`)
      setModalEliminar(null)
      cargar()
    } catch (e) {
      const msg = e?.message || ''
      if (/pin admin/i.test(msg)) {
        setPinEliminarError(msg)
        setPinEliminar('')
      } else {
        toast(msg || 'Error al eliminar', 'error')
      }
    } finally {
      setEliminando(false)
    }
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
        {/* Filtros por rol — chips */}
        <div className="msr-filtros">
          {['Todos', 'Admin', 'Mesera'].map(f => (
            <button
              key={f}
              className={`msr-chip-filtro ${filtroRol === f ? 'msr-chip-filtro-activo' : ''}`}
              onClick={() => setFiltroRol(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {cargando ? <div className="msr-loader">Cargando...</div> : (() => {
          const visibles = filtroRol === 'Todos' ? meseros : meseros.filter(m => m.rol === filtroRol)
          return (
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
              {visibles.length === 0 && <tr><td colSpan={6} className="msr-vacio">No hay usuarios para este filtro</td></tr>}
              {visibles.map((m, i) => (
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
                    <button className="msr-btn-elim" onClick={() => abrirEliminar(m)} title="Eliminar (irreversible)">Eliminar</button>
                    <button className="msr-btn-perm" onClick={() => handleEliminarPerm(m)} title="Eliminar (sólo si no tiene cuentas)">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )
        })()}
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
                <option value="Admin">Admin</option>
                <option value="Mesera">Mesera</option>
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

      {modalEliminar && (
        <div className="msr-overlay" onClick={() => !eliminando && setModalEliminar(null)}>
          <div className="msr-modal" onClick={e => e.stopPropagation()}>
            <div className="msr-modal-header" style={{ color: '#ff6b6b' }}>
              <span>Eliminar usuario — {modalEliminar.mesero.nombre}</span>
              <button className="msr-btn-x" onClick={() => !eliminando && setModalEliminar(null)}>✕</button>
            </div>
            <div className="msr-modal-body">
              <div style={{ background: '#2a0e0e', border: '1px solid #6b1f1f', borderRadius: 6, padding: 12, color: '#fecaca', fontSize: '.85rem', lineHeight: 1.5 }}>
                <strong style={{ color: '#ff6b6b' }}>⚠ Acción irreversible.</strong> Esto borra
                permanentemente al usuario <strong>{modalEliminar.mesero.nombre}</strong> y sus
                referencias en auditoría quedan sueltas. ¿Confirmas?
              </div>

              <label className="msr-lbl" style={{ marginTop: 12 }}>
                Tu PIN admin <span style={{ color: '#c0392b' }}>*</span>
              </label>
              <input
                className="msr-input"
                type="password"
                inputMode="numeric"
                value={pinEliminar}
                maxLength={6}
                autoFocus
                onChange={e => { setPinEliminar(e.target.value.replace(/\D/g,'').slice(0,6)); if (pinEliminarError) setPinEliminarError('') }}
                placeholder="Confirmación admin"
                onKeyDown={e => e.key === 'Enter' && !eliminando && handleEliminarDefinitivo()}
                style={pinEliminarError ? { borderColor: '#c0392b' } : undefined}
              />
              {pinEliminarError && (
                <div style={{ marginTop: 6, color: '#ff6b6b', fontSize: 12 }}>{pinEliminarError}</div>
              )}
            </div>
            <div className="msr-modal-footer">
              <button className="msr-btn-elim-confirm" onClick={handleEliminarDefinitivo} disabled={eliminando}>
                {eliminando ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
              <button className="msr-btn-cerrar" onClick={() => setModalEliminar(null)} disabled={eliminando}>Cancelar</button>
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
              />

              <label className="msr-lbl" style={{ marginTop: 12 }}>
                Tu PIN admin <span style={{ color: '#c0392b' }}>*</span>
              </label>
              <input
                className="msr-input"
                type="password"
                inputMode="numeric"
                value={pinAdminInput}
                maxLength={6}
                onChange={e => { setPinAdminInput(e.target.value.replace(/\D/g,'').slice(0,6)); if (pinAdminError) setPinAdminError('') }}
                placeholder="Confirmación admin"
                onKeyDown={e => e.key === 'Enter' && !guardandoPin && handleResetPin()}
                style={pinAdminError ? { borderColor: '#c0392b' } : undefined}
              />
              {pinAdminError && (
                <div style={{ marginTop: 6, color: '#ff6b6b', fontSize: 12 }}>{pinAdminError}</div>
              )}
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
