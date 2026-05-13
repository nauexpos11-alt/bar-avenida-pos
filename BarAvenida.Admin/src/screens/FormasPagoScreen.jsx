import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import ToastContainer from '../components/Toast'
import './FormasPagoScreen.css'

const VACIO = { nombre: '', codigo: '', comisionPorcentaje: 0, activaParaCobro: true, orden: 0 }

export default function FormasPagoScreen({ auth, onVolver }) {
  const [formas,    setFormas]    = useState([])
  const [cargando,  setCargando]  = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [seeding,   setSeeding]   = useState(false)
  const [toasts,    setToasts]    = useState([])
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState(VACIO)

  const toast = useCallback((msg, tipo = 'ok') => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, mensaje: msg, tipo }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000)
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const d = await api.adminGetFormasPago(auth.token)
      setFormas(Array.isArray(d) ? d : [])
    }
    catch (e) { toast('Error al cargar: ' + e.message, 'error') }
    finally   { setCargando(false) }
  }, [auth.token, toast])

  useEffect(() => { cargar() }, [cargar])

  const abrirNuevo = () => { setForm(VACIO); setModal({ modo: 'nuevo' }) }
  const abrirEditar = (f) => {
    setForm({
      nombre:             f.nombre ?? '',
      codigo:             f.codigo ?? '',
      comisionPorcentaje: f.comisionPorcentaje ?? 0,
      activaParaCobro:    f.activaParaCobro ?? true,
      orden:              f.orden ?? 0,
    })
    setModal({ modo: 'editar', fp: f })
  }

  const handleGuardar = async () => {
    const nomStr = String(form.nombre ?? '').trim()
    const codStr = String(form.codigo ?? '').trim().toUpperCase()
    if (!nomStr) { toast('El nombre es requerido', 'error'); return }
    setGuardando(true)
    try {
      const dto = { ...form, nombre: nomStr, codigo: codStr, comisionPorcentaje: Number(form.comisionPorcentaje), orden: Number(form.orden) }
      if (modal.modo === 'nuevo') { await api.adminCreateFormaPago(auth.token, dto); toast('Forma de pago creada') }
      else                        { await api.adminUpdateFormaPago(auth.token, modal.fp.id, dto); toast('Forma de pago actualizada') }
      setModal(null)
      cargar()
    } catch (e) { toast(e.message, 'error') }
    finally     { setGuardando(false) }
  }

  const handleSeed = async () => {
    if (!confirm('¿Inicializar formas de pago predeterminadas? (Efectivo, Tarjeta, Pago mixto)\n\nSólo agrega las que no existen, no borra nada.')) return
    setSeeding(true)
    try {
      const r = await api.adminSeedFormasPago(auth.token)
      toast(r.message || `${r.creadas} forma(s) creadas`)
      cargar()
    } catch (e) { toast(e.message, 'error') }
    finally { setSeeding(false) }
  }

  const handleEliminar = async (fp) => {
    if (!confirm(`¿Eliminar "${fp.nombre}"?`)) return
    try { await api.adminDeleteFormaPago(auth.token, fp.id); toast('Eliminada'); cargar() }
    catch (e) { toast(e.message, 'error') }
  }

  return (
    <div className="fp-screen">
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(ts => ts.filter(t => t.id !== id))} />

      <div className="fp-header">
        <div>
          <h2 className="fp-titulo">Formas de pago</h2>
          <div className="fp-breadcrumb">CONFIGURACIÓN → Formas de pago</div>
        </div>
        <div className="fp-header-btns">
          <button className="fp-btn-seed" onClick={handleSeed} disabled={seeding} title="Insertar Efectivo, Tarjeta y Pago mixto si no existen">
            {seeding ? 'Inicializando...' : '⚡ Inicializar'}
          </button>
          <button className="fp-btn-add" onClick={abrirNuevo}>+ Nueva</button>
          <button className="fp-btn-x"   onClick={cargar} title="Refrescar">↻</button>
          <button className="fp-btn-x"   onClick={onVolver}>✕</button>
        </div>
      </div>

      <div className="fp-body">
        {cargando ? <div className="fp-loader">Cargando...</div> : (
          <table className="fp-tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Código</th>
                <th>Comisión</th>
                <th>Activa para cobro</th>
                <th>Orden</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {formas.length === 0 && <tr><td colSpan={6} className="fp-vacio">No hay formas de pago</td></tr>}
              {formas.map((f, i) => (
                <tr key={f.id} className={i % 2 === 0 ? 'fp-par' : 'fp-impar'}>
                  <td className="fp-td-nombre">{f.nombre}</td>
                  <td className="fp-td-cod">{f.codigo}</td>
                  <td>{f.comisionPorcentaje > 0 ? `${f.comisionPorcentaje}%` : '—'}</td>
                  <td>
                    <span className={`fp-chip ${f.activaParaCobro ? 'fp-chip-ok' : 'fp-chip-off'}`}>
                      {f.activaParaCobro ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td>{f.orden}</td>
                  <td className="fp-td-acc">
                    <button className="fp-btn-edit" onClick={() => abrirEditar(f)}>Editar</button>
                    <button className="fp-btn-del"  onClick={() => handleEliminar(f)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fp-overlay" onClick={() => setModal(null)}>
          <div className="fp-modal" onClick={e => e.stopPropagation()}>
            <div className="fp-modal-header">
              <span>{modal.modo === 'nuevo' ? 'Nueva forma de pago' : 'Editar forma de pago'}</span>
              <button className="fp-btn-x" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="fp-modal-body">
              <label className="fp-lbl">Nombre *</label>
              <input className="fp-input" value={form.nombre} maxLength={50} autoFocus
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Transferencia" />

              <label className="fp-lbl">Código (máx. 20 chars)</label>
              <input className="fp-input" value={form.codigo} maxLength={20}
                onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Ej: TRF" />

              <label className="fp-lbl">Comisión %</label>
              <input className="fp-input" type="number" min={0} max={100} step={0.01}
                value={form.comisionPorcentaje}
                onChange={e => setForm(f => ({ ...f, comisionPorcentaje: e.target.value }))} />

              <label className="fp-lbl">Orden</label>
              <input className="fp-input" type="number" min={0}
                value={form.orden}
                onChange={e => setForm(f => ({ ...f, orden: e.target.value }))} />

              <div className="fp-toggle-row">
                <span className="fp-lbl">Activa para cobro</span>
                <input type="checkbox" checked={form.activaParaCobro}
                  onChange={e => setForm(f => ({ ...f, activaParaCobro: e.target.checked }))} />
              </div>
            </div>
            <div className="fp-modal-footer">
              <button className="fp-btn-guardar" onClick={handleGuardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button className="fp-btn-cerrar" onClick={() => setModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
