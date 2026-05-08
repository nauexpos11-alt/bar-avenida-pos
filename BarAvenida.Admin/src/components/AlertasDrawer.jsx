import './AlertasDrawer.css'

// PROMPT C.2 — Drawer lateral derecho con alertas activas de caja.
// Recibe alertas en memoria; el padre (TopMenuBar) maneja persistencia.

function tituloTipo(tipo) {
  switch (tipo) {
    case 'EfectivoExcesivo': return '💵 Efectivo en cajón'
    case 'TiempoSinCorteX':  return '⏱ Tiempo sin corte'
    case 'MesaInactiva':     return '🚪 Mesa inactiva'
    case 'Anomalia':         return '🔍 Anomalía detectada'
    default:                 return '⚠ Alerta'
  }
}

function fmtHora(iso) {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '' }
}

export default function AlertasDrawer({
  alertas, onClose, onIrPantalla, onDescartar, onDescartarTodas,
}) {
  return (
    <div className="ad-overlay" onClick={onClose}>
      <aside
        className="ad-drawer"
        onClick={e => e.stopPropagation()}
      >
        <header className="ad-header">
          <h2 className="ad-titulo">⚠ ALERTAS DE CAJA</h2>
          <button className="ad-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>

        {alertas.length > 0 && (
          <div className="ad-toolbar">
            <span className="ad-count">
              {alertas.length} activa{alertas.length !== 1 ? 's' : ''}
            </span>
            <button className="ad-btn-clear-all" onClick={onDescartarTodas}>
              Descartar todas
            </button>
          </div>
        )}

        <div className="ad-body">
          {alertas.length === 0 ? (
            <div className="ad-vacio">
              <div className="ad-vacio-ico">✅</div>
              <div className="ad-vacio-txt">Sin alertas activas</div>
              <div className="ad-vacio-sub">
                Las alertas aparecen cuando el sistema detecta situaciones que requieren atención.
              </div>
            </div>
          ) : alertas.map(a => (
            <div
              key={a.id}
              className={`ad-card ad-${(a.severidad || 'amarilla').toLowerCase()}`}
            >
              <div className="ad-card-top">
                <span className="ad-tipo">{tituloTipo(a.tipo)}</span>
                <span className="ad-hora">{fmtHora(a.fechaDeteccion)}</span>
              </div>
              <div className="ad-msg">{a.mensaje}</div>
              <div className="ad-acciones">
                <button
                  className="ad-btn-descartar"
                  onClick={() => onDescartar(a.id)}
                >
                  Descartar
                </button>
                {a.accionScreen && (
                  <button
                    className="ad-btn-accion"
                    onClick={() => {
                      onIrPantalla(a.accionScreen, a.accionSugerida || tituloTipo(a.tipo))
                      onClose()
                    }}
                  >
                    {a.accionSugerida || 'Ir'} →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
