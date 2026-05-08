import { useState } from 'react'
import { api } from '../api'
import './CancelarProductoModal.css'

const MOTIVOS = [
  'Error del mesero',
  'Cliente cambió de opinión',
  'Producto no disponible',
  'Calidad del producto',
  'Otro',
]

// BUG 1 fix: productoNombre (camelCase DTO) primero; incluye d.id (OrdenDetalle PK)
function obtenerProductos(cuenta) {
  const lista = []
  let idx = 0
  ;(cuenta?.ordenes ?? []).forEach((orden) => {
    const detalles = orden.detalles ?? orden.ordenDetalles ?? []
    detalles.forEach(d => {
      const precio = d.precioUnitario ?? d.precio ?? 0
      lista.push({
        idx:         idx++,
        id:          d.id,   // OrdenDetalle.Id — usado como detalleId en el POST
        cantidad:    d.cantidad,
        descripcion: d.productoNombre ?? d.nombreProducto ?? d.producto?.nombre ?? '—',
        precio,
        importe:     d.cantidad * precio,
      })
    })
  })
  return lista
}

export default function CancelarProductoModal({ cuenta, token, onConfirmar, onCancelar }) {
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [motivo, setMotivo]               = useState('')
  const [enviando, setEnviando]           = useState(false)
  const [error, setError]                 = useState(null)
  const [toastOk, setToastOk]             = useState(false)

  const productos = obtenerProductos(cuenta)
  const mesaNum   = cuenta?.mesaNumero ?? cuenta?.mesa?.numero ?? '?'

  const toggleSeleccion = (id) => {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const puedeEnviar = seleccionados.size > 0 && motivo !== '' && !enviando

  const handleSolicitar = async () => {
    if (!puedeEnviar) return
    setEnviando(true)
    setError(null)
    try {
      const detallesIds = Array.from(seleccionados)
      await api.solicitarCancelacionProductos(token, cuenta.id, { detallesIds, motivo })
      setToastOk(true)
      setTimeout(() => onConfirmar(), 1500)
    } catch (e) {
      setError(e.message ?? 'Error al enviar solicitud')
      setEnviando(false)
    }
  }

  if (toastOk) {
    return (
      <div className="cp-overlay">
        <div style={{
          background: '#064e3b', border: '1px solid #059669', color: '#6ee7b7',
          padding: '16px 28px', borderRadius: 10, fontSize: '1rem', fontWeight: 700,
          letterSpacing: '0.04em', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          ✅ Solicitud enviada al admin
        </div>
      </div>
    )
  }

  return (
    <div className="cp-overlay" onClick={e => e.target === e.currentTarget && !enviando && onCancelar()}>
      <div className="cp-box">

        <div className="cp-header">
          <div className="cp-title">CANCELAR PRODUCTOS — MESA {mesaNum}</div>
          <div className="cp-subtitle">Selecciona los productos que el admin debe autorizar cancelar</div>
        </div>

        {/* Contador */}
        <div className="cp-contador">
          {seleccionados.size} de {productos.length} seleccionado{seleccionados.size !== 1 ? 's' : ''}
        </div>

        {/* Tabla con checkboxes */}
        <div className="cp-tabla-wrapper">
          <table className="cp-tabla">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>CANT</th>
                <th>DESCRIPCIÓN</th>
                <th>PRECIO</th>
                <th>IMPORTE</th>
              </tr>
            </thead>
            <tbody>
              {productos.length === 0 ? (
                <tr><td colSpan={5} className="cp-vacio">Sin productos</td></tr>
              ) : (
                productos.map(p => {
                  const key    = p.id ?? p.idx
                  const activo = seleccionados.has(key)
                  return (
                    <tr
                      key={p.idx}
                      className={`cp-tr ${activo ? 'cp-tr-sel' : ''}`}
                      onClick={() => toggleSeleccion(key)}
                    >
                      <td style={{ textAlign: 'center', paddingRight: 4 }}>
                        <input
                          type="checkbox"
                          checked={activo}
                          onChange={() => toggleSeleccion(key)}
                          onClick={e => e.stopPropagation()}
                          style={{ accentColor: '#f0c842', width: 16, height: 16 }}
                        />
                      </td>
                      <td className="cp-td-cant">{p.cantidad}</td>
                      <td className="cp-td-desc">{p.descripcion}</td>
                      <td className="cp-td-precio">${p.precio.toFixed(2)}</td>
                      <td className="cp-td-imp">${p.importe.toFixed(2)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Motivo */}
        <div className="cp-motivo-wrap">
          <label className="cp-motivo-label">MOTIVO DE CANCELACIÓN</label>
          <select
            className="cp-motivo-select"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
          >
            <option value="">— seleccionar —</option>
            {MOTIVOS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {error && (
          <div style={{ padding: '4px 16px 8px', color: '#f87171', fontSize: '0.8rem', fontWeight: 600 }}>
            ⚠ {error}
          </div>
        )}

        {/* Footer */}
        <div className="cp-footer">
          <button className="cp-btn-cancelar" onClick={onCancelar} disabled={enviando}>
            CANCELAR
          </button>
          <button
            className="cp-btn-siguiente"
            disabled={!puedeEnviar}
            onClick={handleSolicitar}
          >
            {enviando ? 'ENVIANDO...' : '📤 SOLICITAR CANCELACIÓN'}
          </button>
        </div>

      </div>
    </div>
  )
}
