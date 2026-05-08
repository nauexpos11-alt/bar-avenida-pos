import { useState } from 'react'
import './OrdenCard.css'

function getMinutes(fechaEnvio, now) {
  if (!fechaEnvio) return 0
  return (now - new Date(fechaEnvio)) / 60000
}

function colorClass(fechaEnvio, now) {
  const mins = getMinutes(fechaEnvio, now)
  if (mins >= 5) return 'card-red'
  if (mins >= 2) return 'card-yellow'
  return 'card-green'
}

function formatHora(fecha) {
  if (!fecha) return '--:--'
  return new Date(fecha).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatElapsed(fechaEnvio, now) {
  const mins = Math.floor(getMinutes(fechaEnvio, now))
  if (mins < 1) return 'Recién llegó'
  if (mins === 1) return '1 min'
  return `${mins} min`
}

export default function OrdenCard({ orden, now, onListo }) {
  const [removing, setRemoving] = useState(false)

  const handleListo = () => {
    if (removing) return
    setRemoving(true)
    setTimeout(() => onListo(orden.id), 420)
  }

  // Soporte para distintos shapes que puede devolver el backend
  const detalles  = orden.detalles ?? orden.ordenDetalles ?? []
  const mesaNum   = orden.mesaNumero ?? orden.mesa?.numero ?? orden.mesaId ?? '?'
  const mesera    = orden.nombreMesera ?? orden.mesera?.nombre ?? orden.usuarioNombre ?? 'Mesera'
  const color     = colorClass(orden.fechaEnvio, now)
  const elapsed   = formatElapsed(orden.fechaEnvio, now)

  return (
    <article className={`orden-card ${color} ${removing ? 'removing' : ''}`}>

      {/* Mesa + badge */}
      <div className="card-top">
        <span className="mesa-num">MESA {mesaNum}</span>
        {orden.esAgregado && (
          <span className="badge-agregado">≡≡ AGREGADO ≡≡</span>
        )}
      </div>

      {/* Mesera */}
      <div className="mesera-nombre">{String(mesera).toUpperCase()}</div>

      <hr className="sep" />

      {/* Productos */}
      <ul className="detalles">
        {detalles.map((d, i) => (
          <li key={i} className="det-row">
            <span className="det-cant">{d.cantidad}x</span>
            <span className="det-prod">
              {d.nombreProducto ?? d.producto?.nombre ?? d.productoNombre ?? '—'}
            </span>
          </li>
        ))}
      </ul>

      <hr className="sep" />

      {/* Hora + botón */}
      <div className="card-footer">
        <div className="tiempo">
          <span className="hora">{formatHora(orden.fechaEnvio)}</span>
          <span className="elapsed">{elapsed}</span>
        </div>
        <button
          className="btn-listo"
          onClick={handleListo}
          disabled={removing}
        >
          ✓ LISTO
        </button>
      </div>

    </article>
  )
}
