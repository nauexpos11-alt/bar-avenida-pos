import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import './UsuariosScreen.css'

const ROLES = ['Admin', 'Mesera']

function emptyForm() {
  return { nombre: '', codigo: '', rol: 'Mesera', pin: '', activo: true }
}

export default function UsuariosScreen({ auth, onVolver }) {
  const [usuarios,   setUsuarios]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [filtroRol,  setFiltroRol]  = useState('Todos')
  const [modal,      setModal]      = useState(null)   // null | { modo: 'nuevo'|'editar', usuario? }
  const [form,       setForm]       = useState(emptyForm())
  const [saving,     setSaving]     = useState(false)
  const [formError,  setFormError]  = useState(null)
  // Modal de eliminar definitivo con PIN admin
  const [modalEliminar,    setModalEliminar]    = useState(null) // { usuario }
  const [pinEliminar,      setPinEliminar]      = useState('')
  const [pinEliminarError, setPinEliminarError] = useState('')
  const [eliminando,       setEliminando]       = useState(false)

  const cargar = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const data = await api.getUsuarios(auth.token)
      setUsuarios(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [auth.token])

  useEffect(() => { cargar() }, [cargar])

  const filtrados = filtroRol === 'Todos'
    ? usuarios
    : usuarios.filter(u => u.rol === filtroRol)

  function abrirNuevo() {
    setForm(emptyForm()); setFormError(null)
    setModal({ modo: 'nuevo' })
  }

  function abrirEditar(u) {
    setForm({ nombre: u.nombre, codigo: u.codigo, rol: u.rol, pin: '', activo: u.activo })
    setFormError(null)
    setModal({ modo: 'editar', usuario: u })
  }

  async function toggleActivo(u) {
    try {
      await api.updateUsuario(auth.token, u.id, {
        nombre: u.nombre, codigo: u.codigo, rol: u.rol, activo: !u.activo
      })
      await cargar()
    } catch (e) { setError(e.message) }
  }

  async function guardar() {
    if (!form.nombre.trim()) { setFormError('El nombre es requerido.'); return }
    if (!form.codigo.trim()) { setFormError('El código es requerido.'); return }
    if (modal.modo === 'nuevo' && form.pin.length !== 4) {
      setFormError('El PIN debe ser exactamente 4 dígitos.'); return
    }
    if (form.pin && form.pin.length !== 4) {
      setFormError('El PIN debe ser exactamente 4 dígitos.'); return
    }
    try {
      setSaving(true); setFormError(null)
      if (modal.modo === 'nuevo') {
        await api.createUsuario(auth.token, form)
      } else {
        await api.updateUsuario(auth.token, modal.usuario.id, form)
      }
      setModal(null)
      await cargar()
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function handlePinChange(val) {
    setForm(f => ({ ...f, pin: val.replace(/\D/g, '').slice(0, 4) }))
  }

  function abrirEliminar(u) {
    setPinEliminar('')
    setPinEliminarError('')
    setModalEliminar({ usuario: u })
  }

  async function confirmarEliminar() {
    if (eliminando) return
    if (!pinEliminar || pinEliminar.length < 4) {
      setPinEliminarError('Ingresa tu PIN admin (mín. 4 dígitos)')
      return
    }
    setEliminando(true)
    setPinEliminarError('')
    try {
      await api.adminEliminarUsuario(auth.token, modalEliminar.usuario.id, pinEliminar)
      setModalEliminar(null)
      await cargar()
    } catch (e) {
      const msg = e?.message || 'Error al eliminar'
      if (msg.toLowerCase().includes('pin')) {
        setPinEliminarError(msg)
        setPinEliminar('')
      } else {
        setPinEliminarError(msg)
      }
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="usr-root">

      {/* ── Header ── */}
      <div className="usr-header">
        <div className="usr-title">
          <span className="usr-icon">◉</span>
          Usuarios
        </div>
        <div className="usr-header-right">
          <div className="usr-filters">
            {['Todos', ...ROLES].map(r => (
              <button
                key={r}
                className={`filter-btn${filtroRol === r ? ' filter-active' : ''}`}
                onClick={() => setFiltroRol(r)}
              >{r}</button>
            ))}
          </div>
          <button className="btn-nuevo" onClick={abrirNuevo}>+ Nuevo Usuario</button>
          {onVolver && (
            <button onClick={onVolver} title="Volver al dashboard"
              style={{ background:'none', border:'none', color:'#666', fontSize:'1.1rem', cursor:'pointer', padding:'4px 8px', borderRadius:4 }}>✕</button>
          )}
        </div>
      </div>

      {/* ── Error global ── */}
      {error && <div className="usr-error-banner">{error}</div>}

      {/* ── Tabla ── */}
      <div className="usr-table-wrap">
        {loading ? (
          <div className="usr-loading">Cargando usuarios...</div>
        ) : (
          <table className="usr-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>NOMBRE</th>
                <th>CÓDIGO</th>
                <th>ROL</th>
                <th>PIN</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="usr-empty">Sin usuarios registrados</td>
                </tr>
              ) : filtrados.map(u => (
                <tr key={u.id} className={u.activo ? '' : 'row-inactivo'}>
                  <td className="col-id">{u.id}</td>
                  <td className="col-nombre">{u.nombre}</td>
                  <td className="col-codigo">{u.codigo}</td>
                  <td>
                    <span className={`badge-rol badge-${u.rol?.toLowerCase()}`}>{u.rol}</span>
                  </td>
                  <td className="col-pin">••••</td>
                  <td>
                    <span className={`badge-estado ${u.activo ? 'badge-activo' : 'badge-inactivo'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="col-acciones">
                    <button className="btn-row btn-editar" onClick={() => abrirEditar(u)}>
                      Editar
                    </button>
                    <button
                      className={`btn-row ${u.activo ? 'btn-desactivar' : 'btn-activar'}`}
                      onClick={() => toggleActivo(u)}
                    >
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      className="btn-row btn-eliminar"
                      onClick={() => abrirEliminar(u)}
                      title="Eliminar permanentemente (con PIN admin)"
                      disabled={u.id === auth.id}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal crear / editar ── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box usr-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {modal.modo === 'nuevo' ? 'Nuevo Usuario' : 'Editar Usuario'}
            </div>

            {formError && <div className="modal-error">{formError}</div>}

            <div className="usr-form">
              <label className="usr-label">NOMBRE COMPLETO</label>
              <input
                className="usr-input"
                placeholder="Ej: Juan García"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                maxLength={50}
                autoFocus
              />

              <label className="usr-label">CÓDIGO / ID LOGIN</label>
              <input
                className="usr-input"
                placeholder="Ej: 23, ABBY"
                value={form.codigo}
                onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                maxLength={20}
              />

              <label className="usr-label">ROL</label>
              <select
                className="usr-input"
                value={form.rol}
                onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
              >
                <option value="Admin">Admin</option>
                <option value="Mesera">Mesera</option>
              </select>

              <label className="usr-label">
                PIN (4 dígitos)
                {modal.modo === 'editar' && (
                  <span className="lbl-opcional"> — dejar vacío para no cambiar</span>
                )}
              </label>
              <input
                className="usr-input usr-input-pin"
                type="password"
                inputMode="numeric"
                placeholder="••••"
                value={form.pin}
                onChange={e => handlePinChange(e.target.value)}
                maxLength={4}
                autoComplete="new-password"
              />

              <div className="usr-toggle-row">
                <span className="usr-label" style={{ margin: 0 }}>ESTADO</span>
                <button
                  type="button"
                  className={`toggle-btn ${form.activo ? 'toggle-on' : 'toggle-off'}`}
                  onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
                >
                  <span className="toggle-dot" />
                </button>
                <span className="toggle-label">{form.activo ? 'Activo' : 'Inactivo'}</span>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModal(null)} disabled={saving}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar permanente con PIN admin */}
      {modalEliminar && (
        <div className="modal-overlay" onClick={() => !eliminando && setModalEliminar(null)}>
          <div className="modal-box usr-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title" style={{ color: '#ff6b6b' }}>
              ⚠ Eliminar permanentemente
            </div>
            <p style={{ color: '#ccc', fontSize: '0.9rem', margin: '12px 0 16px', lineHeight: 1.5 }}>
              Vas a eliminar a <strong style={{ color: '#fff' }}>{modalEliminar.usuario.nombre}</strong> permanentemente.
              <br/><strong style={{ color: '#ff8888' }}>Esta acción NO se puede deshacer.</strong>
              <br/>Sus cuentas y solicitudes se transferirán al admin que ejecuta el borrado.
            </p>
            {pinEliminarError && <div className="modal-error">{pinEliminarError}</div>}
            <div className="usr-form">
              <label className="usr-label">Tu PIN ADMIN (confirmación)</label>
              <input
                className="usr-input"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoFocus
                value={pinEliminar}
                onChange={e => setPinEliminar(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setModalEliminar(null)} disabled={eliminando}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                style={{ background: 'linear-gradient(180deg, #ef4444, #c0392b)', color: '#fff' }}
                onClick={confirmarEliminar}
                disabled={eliminando}
              >
                {eliminando ? 'Eliminando…' : 'Eliminar permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
