import { useState } from 'react'
import './MesaCard.css'

function getMinutes(fecha, now) {
  if (!fecha) return 0
  return (now - new Date(fecha)) / 60000
}

function colorClass(fecha, now) {
  const mins = getMinutes(fecha, now)
  if (mins >= 5) return 'mc-red'
  if (mins >= 2) return 'mc-yellow'
  return 'mc-green'
}

function formatElapsed(fecha, now) {
  const mins = Math.floor(getMinutes(fecha, now))
  if (mins < 1) return 'Recien'
  if (mins === 1) return '1 min'
  return `${mins} min`
}

function formatHora(fecha) {
  if (!fecha) return '--:--'
  return new Date(fecha).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit',
  })
}

export default function MesaCard({ grupo, now, onListo, onTodaLaMesaListo }) {
  const [removingId, setRemovingId] = useState(null)
  const [removingTodos, setRemovingTodos] = useState(false)
  const color   = colorClass(grupo.primeraFecha, now)
  const elapsed = formatElapsed(grupo.primeraFecha, now)
  const urgente = getMinutes(grupo.primeraFecha, now) >= 5

  const handleListo = (ordenId) => {
    if (removingId || removingTodos) return
    setRemovingId(ordenId)
    setTimeout(() => onListo(ordenId), 360)
  }

  const handleTodaLaMesa = () => {
    if (removingId || removingTodos) return
    if (typeof onTodaLaMesaListo !== 'function') return
    setRemovingTodos(true)
    // Damos un tick para que el confirm no bloquee la animación visual
    setTimeout(() => {
      onTodaLaMesaListo(grupo)
      // Si el usuario cancela, restauramos el estado para no dejar el botón muerto.
      // El padre quitará las órdenes optimistamente si confirma.
      setTimeout(() => setRemovingTodos(false), 400)
    }, 0)
  }

  return (
    <article className={`mesa-card ${color} ${urgente ? 'mc-urgente' : ''}`}>

      <header className="mc-top">
        <span className="mc-mesa">MESA {grupo.mesaNumero}</span>
        {urgente && <span className="mc-badge-urgente">URGENTE</span>}
      </header>

      <div className="mc-mesera">{String(grupo.mesera).toUpperCase()}</div>

      <hr className="mc-sep" />

      <div className="mc-ordenes">
        {grupo.ordenes.map((orden, idx) => {
          const detalles    = orden.detalles ?? orden.ordenDetalles ?? []
          const isRemoving  = removingId === orden.id
          return (
            <div
              key={orden.id}
              className={`mc-orden ${isRemoving ? 'removing' : ''}`}
            >
              <div className="mc-orden-header">
                <span className="mc-orden-num">
                  ORDEN #{orden.numeroOrden ?? (idx + 1)}
                  {orden.esAgregado && <span className="mc-orden-agr"> AGRE.</span>}
                </span>
                <span className="mc-orden-hora">{formatHora(orden.fechaEnvio)}</span>
              </div>
              <ul className="mc-detalles">
                {detalles.map((d, i) => (
                  <li key={i} className="mc-det">
                    <span className="mc-cant">{d.cantidad}x</span>
                    <span className="mc-prod">
                      {d.nombreProducto ?? d.producto?.nombre ?? d.productoNombre ?? '?'}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                className="mc-btn-listo"
                onClick={() => handleListo(orden.id)}
                disabled={isRemoving}
              >
                LISTO
              </button>
            </div>
          )
        })}
      </div>

      <hr className="mc-sep" />

      {grupo.ordenes.length > 1 && typeof onTodaLaMesaListo === 'function' && (
        <button
          className="mc-btn-toda-mesa"
          onClick={handleTodaLaMesa}
          disabled={removingTodos || !!removingId}
        >
          ✓ TODA LA MESA LISTA
        </button>
      )}

      <footer className="mc-footer">
        <span className="mc-tiempo">{elapsed} esperando</span>
        <span className="mc-count">
          {grupo.ordenes.length} comanda{grupo.ordenes.length !== 1 ? 's' : ''}
        </span>
      </footer>

    </article>
  )
}
