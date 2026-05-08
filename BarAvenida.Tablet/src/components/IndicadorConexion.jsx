import { useEstadoConexion } from '../hooks/useEstadoConexion'
import './IndicadorConexion.css'

export default function IndicadorConexion() {
  const { online, pendientes } = useEstadoConexion()

  if (online && pendientes === 0) {
    return (
      <div className="ic-wrap ic-online">
        <span className="ic-dot" />
        <span className="ic-txt">ONLINE</span>
      </div>
    )
  }
  if (!online) {
    return (
      <div className="ic-wrap ic-offline">
        <span className="ic-dot ic-pulse" />
        <span className="ic-txt">SIN CONEXION</span>
        {pendientes > 0 && <span className="ic-badge">{pendientes}</span>}
      </div>
    )
  }
  // Online pero hay cola por sincronizar
  return (
    <div className="ic-wrap ic-syncing">
      <span className="ic-dot ic-pulse" />
      <span className="ic-txt">SINCRONIZANDO {pendientes}</span>
    </div>
  )
}
