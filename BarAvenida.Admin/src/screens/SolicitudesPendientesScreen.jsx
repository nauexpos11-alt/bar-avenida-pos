import { useState, useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { api, API_URL } from '../api'
import Icon from '../components/Icon'
import './SolicitudesPendientesScreen.css'

function tiempoEspera(fechaSolicitud) {
  if (!fechaSolicitud) return '—'
  const t = new Date(fechaSolicitud).getTime()
  if (!Number.isFinite(t)) return '—'
  const minutos = Math.floor((Date.now() - t) / 60000)
  if (minutos < 1)  return 'menos de 1 min'
  if (minutos < 60) return `${minutos} min`
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function fmt(n) {
  return `$${Number(n || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`
}

export default function SolicitudesPendientesScreen({ auth, onVolver }) {
  const [solicitudes, setSolicitudes] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [toastMsg, setToastMsg]       = useState(null)
  const [procesandoId, setProcesando] = useState(null)
  const [confirmDialog, setConfirm]   = useState(null) // { id, accion: 'aprobar' | 'rechazar', solicitud }
  const [, setTick]                   = useState(0)
  const connRef = useRef(null)

  // Re-render cada 30s para refrescar el contador de tiempo
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const cargarSolicitudes = async () => {
    try {
      const data = await api.getSolicitudesPendientes(auth.token)
      setSolicitudes(Array.isArray(data) ? data : [])
      setError(null)
    } catch (e) {
      setError(e.message || 'Error al cargar solicitudes')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargarSolicitudes() }, [])

  // Esc para cerrar modal de confirmación
  useEffect(() => {
    if (!confirmDialog) return
    const onKey = (e) => { if (e.key === 'Escape') setConfirm(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmDialog])

  // ── SignalR ─────────────────────────────────────
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/barhub`, { accessTokenFactory: () => auth.token })
      .withAutomaticReconnect([0, 2000, 5000, 15000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('SolicitudCancelacion', () => cargarSolicitudes())
    conn.on('SolicitudResuelta',    () => cargarSolicitudes())

    conn.start()
      .then(() => conn.invoke('UnirseAGrupo', 'Admin').catch(() => {}))
      .catch(e => console.warn('SignalR Solicitudes:', e.message))

    connRef.current = conn
    return () => conn.stop()
  }, [auth.token])

  const ejecutarAccion = async () => {
    if (!confirmDialog) return
    const { id, accion } = confirmDialog
    setConfirm(null)
    setProcesando(id)
    try {
      if (accion === 'aprobar') {
        await api.aprobarSolicitud(auth.token, id)
        setToastMsg('Solicitud APROBADA — productos cancelados')
      } else {
        await api.rechazarSolicitud(auth.token, id)
        setToastMsg('Solicitud RECHAZADA — productos conservados')
      }
      setTimeout(() => setToastMsg(null), 3500)
      // Quitar de la lista inmediatamente para feedback rápido
      setSolicitudes(prev => prev.filter(s => s.id !== id))
      // Recarga real (por si llegó otra)
      cargarSolicitudes()
    } catch (e) {
      setError(e.message || 'Error al procesar la solicitud')
    } finally {
      setProcesando(null)
    }
  }

  const pedirConfirmacion = (solicitud, accion) => {
    setConfirm({ id: solicitud.id, accion, solicitud })
  }

  return (
    <div className="solp-root">

      {/* ── Header ── */}
      <div className="solp-header">
        <button className="solp-btn-volver" onClick={onVolver}><Icon name="back" size={16} /> VOLVER</button>
        <h1 className="solp-titulo"><Icon name="bell" size={20} /> SOLICITUDES PENDIENTES</h1>
        <button className="solp-btn-refresh" onClick={cargarSolicitudes} title="Recargar" aria-label="Recargar"><Icon name="refresh" size={16} /></button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="solp-error-bar">
          <Icon name="warning" size={14} /> {error}
          <button onClick={() => setError(null)} aria-label="Cerrar"><Icon name="close" size={14} /></button>
        </div>
      )}

      {/* ── Toast ── */}
      {toastMsg && (
        <div className="solp-toast">{toastMsg}</div>
      )}

      {/* ── Contador ── */}
      {!loading && solicitudes.length > 0 && (
        <div className="solp-contador">
          <span className="solp-contador-num">{solicitudes.length}</span>
          <span className="solp-contador-txt">
            solicitud{solicitudes.length !== 1 ? 'es' : ''} esperando aprobación
          </span>
        </div>
      )}

      {/* ── Body ── */}
      <div className="solp-body">
        {loading ? (
          <div className="solp-loading">Cargando solicitudes...</div>
        ) : solicitudes.length === 0 ? (
          <div className="solp-vacio">
            <div className="solp-vacio-ico"><Icon name="check" size={56} strokeWidth={1.4} /></div>
            <div className="solp-vacio-txt">Sin solicitudes pendientes</div>
            <div className="solp-vacio-sub">Cuando una mesera solicite una cancelación, aparecerá aquí</div>
          </div>
        ) : (
          <div className="solp-cards">
            {solicitudes.map(s => {
              const esTipoCuenta = s.tipo === 'Cuenta'
              const procesando   = procesandoId === s.id
              return (
                <div
                  key={s.id}
                  className={`solp-card ${esTipoCuenta ? 'solp-card-cuenta' : 'solp-card-producto'}`}
                >

                  <div className="solp-card-top">
                    <div className="solp-folio">Folio #{s.folio}</div>
                    <div className="solp-espera">{tiempoEspera(s.fechaSolicitud)} esperando</div>
                  </div>

                  <div className="solp-mesa-row">
                    <div className="solp-mesa">Mesa {s.mesaNumero}</div>
                    <div className={`solp-tipo-badge solp-tipo-${esTipoCuenta ? 'cuenta' : 'producto'}`}>
                      {esTipoCuenta ? <><Icon name="cancel" size={12} /> CUENTA COMPLETA</> : <><Icon name="cuentas" size={12} /> PRODUCTOS</>}
                    </div>
                  </div>

                  <div className="solp-info">
                    <div className="solp-info-row">
                      <span className="solp-lbl">Mesera</span>
                      <span className="solp-val">{s.meseraNombre}</span>
                    </div>
                    <div className="solp-info-row">
                      <span className="solp-lbl">Motivo</span>
                      <span className="solp-val solp-val-motivo">
                        {s.motivo && s.motivo.trim() ? s.motivo : '— (sin motivo)'}
                      </span>
                    </div>
                  </div>

                  {/* Productos involucrados */}
                  {!esTipoCuenta && s.productos && s.productos.length > 0 && (
                    <div className="solp-productos">
                      <div className="solp-productos-titulo">Productos a cancelar:</div>
                      <ul className="solp-productos-lista">
                        {s.productos.map(p => (
                          <li key={p.ordenDetalleId} className="solp-prod-item">
                            <span className="solp-prod-cant">{p.cantidad}×</span>
                            <span className="solp-prod-nom">{p.productoNombre}</span>
                            <span className="solp-prod-sub">{fmt(p.subtotal)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {esTipoCuenta && (
                    <div className="solp-cuenta-warn">
                      <Icon name="warning" size={14} /> Se cancelará la cuenta completa
                    </div>
                  )}

                  <div className="solp-monto">{fmt(s.montoTotal)}</div>

                  <div className="solp-botones">
                    <button
                      className="solp-btn-rechazar"
                      onClick={() => pedirConfirmacion(s, 'rechazar')}
                      disabled={procesando}
                    >
                      {procesando ? '...' : (<><Icon name="close" size={14} /> RECHAZAR</>)}
                    </button>
                    <button
                      className="solp-btn-aprobar"
                      onClick={() => pedirConfirmacion(s, 'aprobar')}
                      disabled={procesando}
                    >
                      {procesando ? '...' : (<><Icon name="check" size={14} /> APROBAR</>)}
                    </button>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal de confirmación ── */}
      {confirmDialog && (
        <div className="solp-modal-overlay" onClick={() => setConfirm(null)}>
          <div className="solp-modal" onClick={e => e.stopPropagation()}>
            <div className="solp-modal-titulo">
              {confirmDialog.accion === 'aprobar' ? 'Aprobar solicitud' : 'Rechazar solicitud'}
            </div>
            <div className="solp-modal-msg">
              {confirmDialog.accion === 'aprobar' ? (
                confirmDialog.solicitud.tipo === 'Cuenta' ? (
                  <>¿Confirmas la cancelación de la <b>cuenta completa</b> de la Mesa {confirmDialog.solicitud.mesaNumero}?<br />
                  <span className="solp-modal-warn">Esta acción no se puede deshacer.</span></>
                ) : (
                  <>¿Confirmas cancelar los <b>{confirmDialog.solicitud.productos.length} producto{confirmDialog.solicitud.productos.length !== 1 ? 's' : ''}</b> de la Mesa {confirmDialog.solicitud.mesaNumero}?<br />
                  <span className="solp-modal-warn">Los productos se quitarán de la cuenta.</span></>
                )
              ) : (
                <>¿Confirmas <b>rechazar</b> esta solicitud?<br />
                <span className="solp-modal-info">La mesa volverá a su estado normal y los productos quedarán intactos.</span></>
              )}
            </div>
            <div className="solp-modal-botones">
              <button className="solp-modal-cancelar" onClick={() => setConfirm(null)}>
                CANCELAR
              </button>
              <button
                className={confirmDialog.accion === 'aprobar' ? 'solp-modal-confirmar-aprobar' : 'solp-modal-confirmar-rechazar'}
                onClick={ejecutarAccion}
              >
                {confirmDialog.accion === 'aprobar' ? 'SÍ, APROBAR' : 'SÍ, RECHAZAR'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
