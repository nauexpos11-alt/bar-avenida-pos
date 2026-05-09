function tiempoAbierta(fecha) {
  if (!fecha) return '—'
  const mins = Math.floor((Date.now() - new Date(fecha)) / 60000)
  if (mins < 1)  return 'ahora'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60), m = mins % 60
  return `${h}h${m > 0 ? ` ${m}m` : ''}`
}

export default function CuentaCard({ cuenta, seleccionada, tienesSolicitud, tick, onClick }) {
  const esBarra   = !cuenta.mesaId
  const esCobrar  = cuenta.estado === 'PorCobrar'
  const titulo    = cuenta.mesaId
    ? `M${cuenta.mesaNumero}`
    : (cuenta.nombreCliente || 'BARRA')
  const totalStr  = `$${Number(cuenta.total || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
  const tiempo    = tiempoAbierta(cuenta.fechaApertura)

  let colorClass = ''
  if (tienesSolicitud) colorClass = 'cc-solicitud'
  else if (esCobrar)   colorClass = 'cc-cobrar'

  return (
    <div
      className={`cc-card${colorClass ? ` ${colorClass}` : ''}${seleccionada ? ' cc-sel' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
    >
      {seleccionada && <span className="cc-arrow">▶</span>}
      <div className="cc-body">
        <div className="cc-row-top">
          <span className="cc-titulo">
            {titulo}
            {esBarra && <span className="cc-star"> ★</span>}
          </span>
          <span className="cc-total">{totalStr}</span>
        </div>
        <div className="cc-row-bot">
          <span className="cc-mesera">{cuenta.meseraNombre}</span>
          <span className="cc-tiempo">{tiempo}</span>
        </div>
        {(esCobrar || tienesSolicitud) && (
          <div className="cc-badges">
            {esCobrar       && <span className="cc-badge cc-badge-cobrar">💵 COBRANDO</span>}
            {tienesSolicitud && <span className="cc-badge cc-badge-sol">🔔 SOLICITUD</span>}
          </div>
        )}
      </div>
    </div>
  )
}
