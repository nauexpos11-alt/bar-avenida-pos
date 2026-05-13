import { useState, useEffect, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import { api, API_URL } from '../api'
import CobrarCuentaModal    from '../components/CobrarCuentaModal'
import CuentaCard           from '../components/CuentaCard'
import EditarInfoCuentaModal from '../components/EditarInfoCuentaModal'
import MoverAreaModal       from '../components/MoverAreaModal'
import Icon                 from '../components/Icon'
import './CentroOperacionScreen.css'

const LS_FILTROS = 'ba_centro_filtros'
const LS_ORDEN   = 'ba_centro_orden'
const DFLT_FILTROS = { mesa: true, barra: true, cobrar: true, solicitud: true }

function fmt0(n)  { return `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}` }
function fmt2(n)  { return `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

function tiempoAbierta(fecha) {
  if (!fecha) return '—'
  const mins = Math.floor((Date.now() - new Date(fecha)) / 60000)
  if (mins < 1)  return 'ahora'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60), m = mins % 60
  return `${h}h${m > 0 ? ` ${m}m` : ''}`
}

function fmtHora(fecha) {
  if (!fecha) return ''
  return new Date(fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function cuentaPasa(cuenta, solsIds, filtros) {
  const esBarra   = !cuenta.mesaId
  const esCobrar  = cuenta.estado === 'PorCobrar'
  const hasSol    = solsIds.has(cuenta.id)
  if (hasSol && (filtros.solicitud ?? true)) return true
  if (esCobrar && (filtros.cobrar    ?? true)) return true
  if (!esBarra && (filtros.mesa      ?? true)) return true
  if (esBarra  && (filtros.barra     ?? true)) return true
  return false
}

function sortCuentas(list, ordenPor) {
  return [...list].sort((a, b) => {
    if (ordenPor === 'mesa') {
      // mesaNumero puede venir como número o como string ("Mesa 3", "M3", "3", etc.)
      const na = parseInt(String(a.mesaNumero ?? '').replace(/\D/g, ''), 10) || 9999
      const nb = parseInt(String(b.mesaNumero ?? '').replace(/\D/g, ''), 10) || 9999
      return na - nb
    }
    if (ordenPor === 'total') return (b.total || 0) - (a.total || 0)
    return new Date(a.fechaApertura) - new Date(b.fechaApertura)
  })
}

export default function CentroOperacionScreen({ auth, onIrPantalla }) {
  const [cuentas,     setCuentas]     = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [selId,       setSelId]       = useState(null)
  const [detalle,     setDetalle]     = useState(null)
  const [cargandoDet, setCargandoDet] = useState(false)
  const [filtros,     setFiltros]     = useState(() => {
    try { return { ...DFLT_FILTROS, ...JSON.parse(localStorage.getItem(LS_FILTROS) || '{}') } }
    catch { return { ...DFLT_FILTROS } }
  })
  const [ordenPor,    setOrdenPor]    = useState(() => localStorage.getItem(LS_ORDEN) || 'tiempo')
  const [collapsed,   setCollapsed]   = useState(new Set())
  const [modalCobrar, setModalCobrar] = useState(false)
  const [modalEditar, setModalEditar] = useState(false)
  const [modalMover,  setModalMover]  = useState(false)
  const [toast,       setToast]       = useState(null)
  const [tick,        setTick]        = useState(0)

  const selIdRef = useRef(null)
  useEffect(() => { selIdRef.current = selId }, [selId])

  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 30000)
    return () => clearInterval(t)
  }, [])

  const mostrarToast = (msg, tipo = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  const cargarCuentas = useCallback(async () => {
    try {
      const data = await api.adminGetCuentasActivas(auth.token)
      setCuentas(Array.isArray(data) ? data : [])
    } catch (e) { console.warn('cargarCuentas:', e.message) }
  }, [auth.token])

  const cargarSolicitudes = useCallback(async () => {
    try {
      const data = await api.getSolicitudesPendientes(auth.token)
      setSolicitudes(Array.isArray(data) ? data : [])
    } catch {}
  }, [auth.token])

  const cargarDetalle = useCallback(async (id) => {
    if (!id) { setDetalle(null); return }
    setCargandoDet(true)
    try {
      const d = await api.adminGetCuentaDetalle(auth.token, id)
      setDetalle(d)
    } catch { setDetalle(null) }
    finally { setCargandoDet(false) }
  }, [auth.token])

  useEffect(() => {
    cargarCuentas()
    cargarSolicitudes()
  }, [cargarCuentas, cargarSolicitudes])

  useEffect(() => {
    if (selId) cargarDetalle(selId)
    else setDetalle(null)
  }, [selId, cargarDetalle])

  // SignalR
  useEffect(() => {
    if (!auth?.token) return
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/barhub`, { accessTokenFactory: () => auth.token })
      .withAutomaticReconnect([0, 2000, 5000, 15000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    const reload = () => { cargarCuentas(); cargarSolicitudes() }
    const reloadConDetalle = (id) => {
      cargarCuentas(); cargarSolicitudes()
      if (selIdRef.current && selIdRef.current === id) cargarDetalle(id)
    }
    const reloadDetalle = () => {
      if (selIdRef.current) cargarDetalle(selIdRef.current)
    }

    conn.on('CuentaAbierta',      () => reload())
    conn.on('CuentaPorCobrar',    () => reload())
    conn.on('SolicitudCancelacion', () => reload())
    conn.on('SolicitudResuelta',  () => reload())
    conn.on('CuentaActualizada',  (id) => reloadConDetalle(id))
    conn.on('OrdenLista',         () => { reload(); reloadDetalle() })
    conn.on('CuentaCobrada', (id) => {
      reload()
      if (selIdRef.current === id) { setSelId(null); setDetalle(null) }
    })
    conn.on('CuentaCancelada', (id) => {
      reload()
      if (selIdRef.current === id) { setSelId(null); setDetalle(null) }
    })

    conn.start()
      .then(() => conn.invoke('UnirseAGrupo', 'Admin').catch(() => {}))
      .catch(e => console.warn('SignalR Centro:', e.message))

    return () => { conn.stop() }
  }, [auth.token, cargarCuentas, cargarSolicitudes, cargarDetalle])

  // Derived data
  const solsIds        = new Set(solicitudes.map(s => s.cuentaId))
  const totalEnMesas   = cuentas.reduce((s, c) => s + (c.total || 0), 0)
  const cuentasFiltradas = sortCuentas(
    cuentas.filter(c => cuentaPasa(c, solsIds, filtros)),
    ordenPor
  )
  const counts = {
    mesa:      cuentas.filter(c =>  c.mesaId).length,
    barra:     cuentas.filter(c => !c.mesaId).length,
    cobrar:    cuentas.filter(c => c.estado === 'PorCobrar').length,
    solicitud: solicitudes.length,
  }
  const solicitudActiva = detalle
    ? solicitudes.find(s => s.cuentaId === detalle.id && s.estado === 'Pendiente')
    : null

  const estaActiva   = detalle && (detalle.estado === 'Abierta' || detalle.estado === 'PorCobrar')
  const puedeEditar  = detalle && detalle.estado === 'Abierta'
  const puedeTicket  = detalle && detalle.estado === 'Cobrada'

  const cuentaParaCobrar = detalle ? {
    ...detalle,
    mesaNumero:    detalle.mesaNumero || detalle.nombreCliente || 'BARRA',
    productosCount: (detalle.ordenes || []).reduce(
      (s, o) => s + (o.detalles || []).reduce((a, d) => a + d.cantidad, 0), 0),
  } : null

  // Handlers
  const toggleFiltro = (key) => {
    setFiltros(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(LS_FILTROS, JSON.stringify(next))
      return next
    })
  }
  const cambiarOrden = (val) => {
    setOrdenPor(val)
    localStorage.setItem(LS_ORDEN, val)
  }
  const seleccionarCuenta = (id) => {
    setSelId(prev => { if (prev === id) { setDetalle(null); return null } return id })
    setCollapsed(new Set())
  }
  const toggleColapsado = (ordenId) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(ordenId)) next.delete(ordenId); else next.add(ordenId)
      return next
    })
  }

  const handleCobrado = () => {
    setModalCobrar(false); setSelId(null); setDetalle(null)
    cargarCuentas(); cargarSolicitudes()
    mostrarToast('Cuenta cobrada')
  }
  const handleAprobar = async () => {
    if (!solicitudActiva) return
    try {
      await api.aprobarSolicitud(auth.token, solicitudActiva.id)
      cargarCuentas(); cargarSolicitudes()
      if (selId) cargarDetalle(selId)
      mostrarToast('Solicitud aprobada')
    } catch (e) { mostrarToast(e.message || 'Error', 'err') }
  }
  const handleRechazar = async () => {
    if (!solicitudActiva) return
    try {
      await api.rechazarSolicitud(auth.token, solicitudActiva.id)
      cargarSolicitudes()
      if (selId) cargarDetalle(selId)
      mostrarToast('Solicitud rechazada')
    } catch (e) { mostrarToast(e.message || 'Error', 'err') }
  }
  const handleEditarGuardar = async (dto) => {
    try {
      await api.editarInfoCuenta(auth.token, detalle.id, dto)
      setModalEditar(false)
      cargarCuentas(); cargarDetalle(detalle.id)
      mostrarToast('Info actualizada')
    } catch (e) { mostrarToast(e.message || 'Error', 'err') }
  }
  const handleMoverGuardar = async (areaNueva) => {
    try {
      await api.moverAreaCuenta(auth.token, detalle.id, areaNueva)
      setModalMover(false)
      cargarCuentas(); cargarDetalle(detalle.id)
      mostrarToast(`Movida a ${areaNueva} ✓`)
    } catch (e) { mostrarToast(e.message || 'Error', 'err') }
  }
  const handleNuevaBarra = async () => {
    try {
      await api.adminAbrirCuentaRapida(auth.token, { meseraId: auth.id })
      cargarCuentas()
      mostrarToast('Nueva barra abierta')
    } catch (e) { mostrarToast(e.message || 'Error al abrir barra', 'err') }
  }
  const handleTicket = async () => {
    try {
      await api.adminReimprimirCuenta(auth.token, detalle.id)
      mostrarToast('Ticket reimpreso')
    } catch (e) { mostrarToast(e.message || 'Error al reimprimir', 'err') }
  }

  return (
    <div className="co-root">

      {/* ── Header ── */}
      <div className="co-header">
        <div className="co-header-left">
          <span className="co-title"><Icon name="centro" size={18} /> CENTRO DE OPERACIÓN</span>
          <div className="co-stats">
            <span>{cuentas.length} cuenta{cuentas.length !== 1 ? 's' : ''} activa{cuentas.length !== 1 ? 's' : ''}</span>
            <span className="co-sep">·</span>
            <span>{fmt0(totalEnMesas)} en mesas</span>
            {solicitudes.length > 0 && (
              <>
                <span className="co-sep">·</span>
                <span className="co-stat-sol">{solicitudes.length} solicitud{solicitudes.length !== 1 ? 'es' : ''}</span>
              </>
            )}
          </div>
        </div>
        <button className="co-btn-nueva-barra" onClick={handleNuevaBarra}><Icon name="add" size={16} /> NUEVA BARRA</button>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`co-toast${toast.tipo === 'err' ? ' co-toast-err' : ''}`}>{toast.msg}</div>
      )}

      {/* ── Main ── */}
      <div className="co-main">

        {/* ── Left panel ── */}
        <aside className="co-left">

          <div className="co-section-lbl">FILTROS</div>
          <div className="co-filtros">
            {[
              { key: 'mesa',      label: 'Mesas' },
              { key: 'barra',     label: 'Barra' },
              { key: 'cobrar',    label: 'Por cobrar' },
              { key: 'solicitud', label: 'Solicitudes' },
            ].map(f => (
              <label key={f.key} className="co-check-item">
                <input
                  type="checkbox"
                  checked={filtros[f.key] ?? true}
                  onChange={() => toggleFiltro(f.key)}
                />
                <span>{f.label} <span className="co-cnt">({counts[f.key]})</span></span>
              </label>
            ))}
          </div>

          <div className="co-section-lbl co-section-lbl--mt">ORDENAR POR</div>
          <div className="co-orden">
            {[
              { val: 'tiempo', label: 'Tiempo abierta' },
              { val: 'mesa',   label: 'Mesa' },
              { val: 'total',  label: 'Total' },
            ].map(o => (
              <label key={o.val} className="co-radio-item">
                <input
                  type="radio"
                  name="co-orden"
                  checked={ordenPor === o.val}
                  onChange={() => cambiarOrden(o.val)}
                />
                <span>{o.label}</span>
              </label>
            ))}
          </div>

          <div className="co-section-lbl co-section-lbl--mt">
            CUENTAS ({cuentasFiltradas.length})
          </div>
          <div className="co-lista">
            {cuentasFiltradas.length === 0 ? (
              <div className="co-lista-vacio">Sin cuentas activas</div>
            ) : cuentasFiltradas.map(c => (
              <CuentaCard
                key={c.id}
                cuenta={c}
                seleccionada={selId === c.id}
                tienesSolicitud={solsIds.has(c.id)}
                tick={tick}
                onClick={() => seleccionarCuenta(c.id)}
              />
            ))}
          </div>

        </aside>

        {/* ── Right panel ── */}
        <section className="co-right">

          {!detalle && !cargandoDet && (
            <div className="co-placeholder">
              <div className="co-ph-ico"><Icon name="centro" size={56} strokeWidth={1.2} /></div>
              <div className="co-ph-txt">Selecciona una cuenta del panel izquierdo</div>
            </div>
          )}

          {cargandoDet && (
            <div className="co-placeholder">
              <div className="co-ph-txt">Cargando…</div>
            </div>
          )}

          {detalle && !cargandoDet && (
            <div className="co-det-wrap">

              {/* Detalle header */}
              <div className="co-det-header">
                <div className="co-det-title">
                  {detalle.mesaNumero
                    ? `Mesa ${detalle.mesaNumero}`
                    : (detalle.nombreCliente || 'BARRA')}
                  {detalle.estado === 'PorCobrar' && (
                    <span className="co-badge-cobrar"><Icon name="cobrar" size={12} /> COBRANDO</span>
                  )}
                  {solicitudActiva && (
                    <span className="co-badge-sol"><Icon name="bell" size={12} /> SOLICITUD</span>
                  )}
                </div>
                <div className="co-det-meta">
                  <span>Mesera: <strong>{detalle.meseraNombre}</strong></span>
                  <span className="co-meta-sep">·</span>
                  <span>Folio #{detalle.folio}</span>
                  <span className="co-meta-sep">·</span>
                  <span>Abierta {fmtHora(detalle.fechaApertura)} ({tiempoAbierta(detalle.fechaApertura)})</span>
                </div>
                {(detalle.numeroPersonas > 1 || detalle.area) && (
                  <div className="co-det-meta co-det-meta--sm">
                    {detalle.numeroPersonas > 1 && <span>{detalle.numeroPersonas} personas</span>}
                    {detalle.numeroPersonas > 1 && detalle.area && <span className="co-meta-sep">·</span>}
                    {detalle.area && <span>Área: {detalle.area}</span>}
                  </div>
                )}
              </div>

              {/* Solicitud banner */}
              {solicitudActiva && (
                <div className="co-sol-banner">
                  <div className="co-sol-info">
                    <Icon name="bell" size={14} /> {solicitudActiva.tipo === 'Cuenta' ? 'Cancelar cuenta' : 'Cancelar productos'}
                    {solicitudActiva.motivo ? ` — ${solicitudActiva.motivo}` : ''}
                    {' · '}por {solicitudActiva.meseraNombre}
                    {' · '}hace {tiempoAbierta(solicitudActiva.fechaSolicitud)}
                  </div>
                  <div className="co-sol-btns">
                    <button className="co-sol-btn co-sol-aprobar" onClick={handleAprobar}>APROBAR</button>
                    <button className="co-sol-btn co-sol-rechazar" onClick={handleRechazar}>RECHAZAR</button>
                  </div>
                </div>
              )}

              {/* Ordenes */}
              <div className="co-ordenes">
                {(!detalle.ordenes || detalle.ordenes.length === 0) ? (
                  <div className="co-ordenes-vacio">Sin órdenes todavía</div>
                ) : detalle.ordenes.map(orden => {
                  const isCol     = collapsed.has(orden.id)
                  const isCan     = orden.estado === 'Cancelado' || orden.estado === 'Cancelada'
                  const isListo   = orden.estado === 'Listo'
                  return (
                    <div key={orden.id} className={`co-orden${isCan ? ' co-orden--can' : ''}`}>
                      <div className="co-orden-hdr" onClick={() => toggleColapsado(orden.id)}>
                        <span className="co-ord-arrow">{isCol ? '▸' : '▾'}</span>
                        <span className="co-ord-num">
                          {isCan ? <s>Orden #{orden.numeroOrden} CANCELADA</s> : `Orden #${orden.numeroOrden}`}
                        </span>
                        <span className="co-ord-hora">· {fmtHora(orden.fechaEnvio)}</span>
                        {orden.esAgregado && <span className="co-ord-agr">(Agregado)</span>}
                        {isListo && <span className="co-ord-listo"><Icon name="check" size={12} /> Listo</span>}
                      </div>
                      {!isCol && (
                        <ul className="co-detalles">
                          {(orden.detalles || []).map((d, i) => (
                            <li key={i} className="co-det-row">
                              <span className="co-det-cant">{d.cantidad}x</span>
                              <span className="co-det-nom">{d.productoNombre}</span>
                              <span className="co-det-precio">{fmt2(d.subtotal)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Totales */}
              <div className="co-totales">
                <div className="co-tot-row">
                  <span className="co-tot-lbl">Subtotal:</span>
                  <span className="co-tot-val">{fmt2(detalle.subtotal)}</span>
                </div>
                {(detalle.descuento || 0) > 0 && (
                  <div className="co-tot-row">
                    <span className="co-tot-lbl">Descuento:</span>
                    <span className="co-tot-val">-{fmt2(detalle.descuento)}</span>
                  </div>
                )}
                <div className="co-tot-row co-tot-row--final">
                  <span className="co-tot-lbl--final">TOTAL:</span>
                  <span className="co-tot-val--final">{fmt2(detalle.total)}</span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="co-acciones">
                <button
                  className="co-accion co-accion-cobrar"
                  disabled={!estaActiva}
                  onClick={() => estaActiva && setModalCobrar(true)}
                >
                  <span className="co-accion-ico"><Icon name="cobrar" size={22} /></span>
                  <span>COBRAR</span>
                </button>
                <button
                  className="co-accion co-accion-prod"
                  disabled={!estaActiva}
                  onClick={() => estaActiva && onIrPantalla?.('pos-barra', 'Barra')}
                >
                  <span className="co-accion-ico"><Icon name="add" size={22} /></span>
                  <span>PROD.</span>
                </button>
                <button
                  className="co-accion"
                  disabled={!puedeEditar}
                  onClick={() => puedeEditar && setModalEditar(true)}
                >
                  <span className="co-accion-ico"><Icon name="edit" size={22} /></span>
                  <span>EDITAR</span>
                </button>
                <button
                  className="co-accion"
                  disabled={!puedeEditar}
                  onClick={() => puedeEditar && setModalMover(true)}
                >
                  <span className="co-accion-ico"><Icon name="arrow_right" size={22} /></span>
                  <span>MOVER</span>
                </button>
                <button
                  className="co-accion"
                  disabled={!puedeTicket}
                  onClick={puedeTicket ? handleTicket : undefined}
                  title={estaActiva ? 'El ticket se genera al cobrar' : undefined}
                >
                  <span className="co-accion-ico"><Icon name="imprimir" size={22} /></span>
                  <span>TICKET</span>
                </button>
              </div>

            </div>
          )}

        </section>
      </div>

      {/* Modals */}
      {modalCobrar && detalle && (
        <CobrarCuentaModal
          cuenta={cuentaParaCobrar}
          auth={auth}
          onClose={() => setModalCobrar(false)}
          onCobrado={handleCobrado}
        />
      )}
      {modalEditar && detalle && (
        <EditarInfoCuentaModal
          cuenta={detalle}
          onClose={() => setModalEditar(false)}
          onGuardar={handleEditarGuardar}
        />
      )}
      {modalMover && detalle && (
        <MoverAreaModal
          cuenta={detalle}
          auth={auth}
          onClose={() => setModalMover(false)}
          onGuardar={handleMoverGuardar}
        />
      )}

    </div>
  )
}
