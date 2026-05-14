import { useEffect, useState } from 'react'
import { api } from '../api'
import './ResumenMeserasTurno.css'

const fmt = n => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtHora = d => d ? new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'

export default function ResumenMeserasTurno({ auth, onClose }) {
  const [data, setData]       = useState(null)
  const [tabActiva, setTab]   = useState(null)
  const [cargando, setCargar] = useState(true)
  const [err, setErr]         = useState('')

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 15000) // refresca cada 15s
    return () => clearInterval(id)
  }, [])

  async function cargar() {
    try {
      const r = await api.adminGetResumenMeserasTurno(auth.token)
      setData(r)
      if (!tabActiva && r?.meseras?.length > 0) setTab(r.meseras[0].meseraId)
      setErr('')
    } catch (e) {
      setErr(e.message || 'Error')
    } finally {
      setCargar(false)
    }
  }

  if (cargando && !data) {
    return (
      <div className="rmt-modal-overlay" onClick={onClose}>
        <div className="rmt-modal" onClick={e => e.stopPropagation()}>
          <div className="rmt-loading">Cargando resumen del turno…</div>
        </div>
      </div>
    )
  }

  const meseraSel = data?.meseras?.find(m => m.meseraId === tabActiva)
  const totalGeneral = (data?.meseras || []).reduce((a, m) => a + (m.totalVendido || 0) + (m.totalAbierto || 0), 0)

  return (
    <div className="rmt-modal-overlay" onClick={onClose}>
      <div className="rmt-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="rmt-header">
          <div>
            <h2 className="rmt-titulo">RESUMEN POR MESERA</h2>
            <div className="rmt-sub">
              Turno #{data?.turnoId ?? '—'} · {data?.meseras?.length ?? 0} mesera{data?.meseras?.length !== 1 ? 's' : ''} · Total: <strong>{fmt(totalGeneral)}</strong>
            </div>
          </div>
          <button className="rmt-close" onClick={onClose}>✕</button>
        </div>

        {err && <div className="rmt-error">{err}</div>}

        {/* Pestañas de meseras */}
        <div className="rmt-tabs">
          {(data?.meseras || []).map(m => {
            const total = (m.totalVendido || 0) + (m.totalAbierto || 0)
            const isActive = m.meseraId === tabActiva
            return (
              <button
                key={m.meseraId}
                className={`rmt-tab${isActive ? ' rmt-tab-active' : ''}`}
                onClick={() => setTab(m.meseraId)}
              >
                <span className="rmt-tab-nombre">{m.meseraNombre}</span>
                <span className="rmt-tab-monto">{fmt(total)}</span>
                <span className="rmt-tab-cuentas">
                  {m.cuentasAbiertas > 0 && <span className="rmt-pill rmt-pill-abierta">{m.cuentasAbiertas} abierta{m.cuentasAbiertas !== 1 ? 's' : ''}</span>}
                  {m.cuentasCobradas > 0 && <span className="rmt-pill rmt-pill-cobrada">{m.cuentasCobradas} cobrada{m.cuentasCobradas !== 1 ? 's' : ''}</span>}
                </span>
              </button>
            )
          })}
          {(data?.meseras?.length ?? 0) === 0 && (
            <div className="rmt-vacio">No hay ventas en el turno actual.</div>
          )}
        </div>

        {/* Contenido de la mesera seleccionada */}
        {meseraSel && (
          <div className="rmt-content">
            {/* Stats arriba */}
            <div className="rmt-stats">
              <div className="rmt-stat">
                <div className="rmt-stat-label">VENDIDO</div>
                <div className="rmt-stat-val rmt-stat-vendido">{fmt(meseraSel.totalVendido)}</div>
                <div className="rmt-stat-sub">{meseraSel.cuentasCobradas} cuentas cobradas</div>
              </div>
              <div className="rmt-stat">
                <div className="rmt-stat-label">EN CURSO</div>
                <div className="rmt-stat-val rmt-stat-abierto">{fmt(meseraSel.totalAbierto)}</div>
                <div className="rmt-stat-sub">{meseraSel.cuentasAbiertas} cuentas abiertas</div>
              </div>
              <div className="rmt-stat">
                <div className="rmt-stat-label">PRIMER PEDIDO</div>
                <div className="rmt-stat-val rmt-stat-hora">{fmtHora(meseraSel.primerPedido)}</div>
                <div className="rmt-stat-sub">Inicio de actividad</div>
              </div>
              <div className="rmt-stat">
                <div className="rmt-stat-label">ÚLTIMO PEDIDO</div>
                <div className="rmt-stat-val rmt-stat-hora">{fmtHora(meseraSel.ultimoPedido)}</div>
                <div className="rmt-stat-sub">Actividad reciente</div>
              </div>
            </div>

            {/* Lista de cuentas */}
            <h3 className="rmt-section-titulo">CUENTAS</h3>
            <div className="rmt-cuentas-grid">
              {meseraSel.cuentas.map(c => (
                <div key={c.id} className={`rmt-cuenta-card rmt-cuenta-${c.estado.toLowerCase()}`}>
                  <div className="rmt-cuenta-head">
                    <span className="rmt-cuenta-titulo">
                      {c.nombreCliente || (c.mesaNumero ? `Mesa ${c.mesaNumero}` : 'BARRA')}
                    </span>
                    <span className="rmt-cuenta-folio">#{c.folio}</span>
                  </div>
                  <div className="rmt-cuenta-meta">
                    <span className="rmt-cuenta-hora">{fmtHora(c.fechaApertura)}</span>
                    <span className={`rmt-cuenta-estado rmt-estado-${c.estado.toLowerCase()}`}>{c.estado.toUpperCase()}</span>
                  </div>
                  <div className="rmt-cuenta-total">{fmt(c.total)}</div>
                  {c.productos.length > 0 && (
                    <ul className="rmt-cuenta-productos">
                      {c.productos.map((p, i) => (
                        <li key={i}>
                          <span className="rmt-prod-cant">{p.cantidad}×</span>
                          <span className="rmt-prod-nombre">{p.nombre}</span>
                          <span className="rmt-prod-sub">{fmt(p.subtotal)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
