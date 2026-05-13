import { useState, useEffect, useCallback, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { api, API_URL } from '../api'
import ReportesPanel from '../components/ReportesPanel'
import ModalCobrar   from '../components/ModalCobrar'
import logoBar       from '../assets/logo-bar-avenida.jpeg'
import './DashboardScreen.css'

// ── Helpers ─────────────────────────────────────────────
const fmt    = (n) => `$${Number(n ?? 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
const fmtDec = (n) => `$${Number(n ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtHora = (d) => !d ? '--:--' : new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

function getResumen(cuenta) {
  const mapa = {}
  ;(cuenta?.ordenes ?? []).forEach(o => {
    ;(o.detalles ?? o.ordenDetalles ?? []).forEach(d => {
      const k      = String(d.productoId ?? d.nombreProducto ?? '?')
      const nombre = d.nombreProducto ?? d.producto?.nombre ?? '?'
      const precio = d.precioUnitario ?? d.precio ?? 0
      if (mapa[k]) { mapa[k].cantidad += d.cantidad; mapa[k].subtotal += d.cantidad * precio }
      else           mapa[k] = { nombre, cantidad: d.cantidad, precio, subtotal: d.cantidad * precio }
    })
  })
  return Object.values(mapa)
}

// ── Componente ───────────────────────────────────────────
export default function DashboardScreen({ auth, onLogout, onIrPantalla }) {
  const [mesas, setMesas]                       = useState([])
  const [cuentasAbiertas, setCuentasAbiertas]   = useState([])
  const [kpis, setKpis]                         = useState(null)
  const [mesaSel, setMesaSel]                   = useState(null)
  const [cuentaSel, setCuentaSel]               = useState(null)
  const [loadingCuenta, setLoadingCuenta]       = useState(false)
  const [connected, setConnected]               = useState(false)
  const [showReportes, setShowReportes]         = useState(false)
  const [showCobrar, setShowCobrar]             = useState(false)
  const [toasts, setToasts]                     = useState([])
  const [cancelModal, setCancelModal]           = useState(null)
  const [cancelando, setCancelando]             = useState(false)

  const cuentaSelRef = useRef(null)
  const reloadRef    = useRef(null)

  useEffect(() => { cuentaSelRef.current = cuentaSel }, [cuentaSel])

  // ── Loaders ────────────────────────────────────────────
  const cargarMesas = useCallback(async () => {
    try { const d = await api.getMesas(auth.token); setMesas(Array.isArray(d) ? d : []) }
    catch (e) { console.warn('mesas:', e.message) }
  }, [auth.token])

  const cargarCuentas = useCallback(async () => {
    try { const d = await api.getCuentasAbiertas(auth.token); setCuentasAbiertas(Array.isArray(d) ? d : []) }
    catch (e) { console.warn('cuentas:', e.message) }
  }, [auth.token])

  const cargarKpis = useCallback(async () => {
    try { const d = await api.resumenMovil(auth.token); if (d) setKpis(d) }
    catch (e) { console.warn('kpis:', e.message) }
  }, [auth.token])

  reloadRef.current = () => { cargarMesas(); cargarCuentas(); cargarKpis() }

  useEffect(() => { reloadRef.current() }, [])

  useEffect(() => {
    const id = setInterval(cargarKpis, 2 * 60 * 1000)
    return () => clearInterval(id)
  }, [cargarKpis])

  // ── Toast ──────────────────────────────────────────────
  const addToast = useCallback((text, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev.slice(-3), { id, text, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  // ── SignalR ────────────────────────────────────────────
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/barhub`, { accessTokenFactory: () => auth.token })
      .withAutomaticReconnect([0, 2000, 5000, 15000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('CuentaAbierta', (data) => {
      reloadRef.current()
      const mesa = data?.mesaNumero ?? data?.mesa?.numero ?? ''
      addToast(`Mesa ${mesa} — cuenta abierta`, 'info')
    })

    conn.on('CuentaCobrada', (idOrData) => {
      reloadRef.current()
      const cobradaId = typeof idOrData === 'object' ? idOrData?.id : idOrData
      if (cuentaSelRef.current?.id === cobradaId) {
        setCuentaSel(null)
        setMesaSel(null)
      }
      addToast('Cuenta cobrada ✓', 'success')
    })

    conn.on('CuentaActualizada', (cuenta) => {
      if (typeof cuenta === 'object' && cuenta?.id) {
        setCuentasAbiertas(prev => prev.map(c => c.id === cuenta.id ? { ...c, ...cuenta } : c))
        if (cuentaSelRef.current?.id === cuenta.id) {
          setCuentaSel(prev => prev ? { ...prev, ...cuenta } : prev)
        }
        setMesas(prev => prev.map(m =>
          (m.cuentaId ?? m.cuentaActualId) === cuenta.id
            ? { ...m, totalActual: cuenta.total ?? m.totalActual }
            : m
        ))
      }
    })

    conn.on('MesaActualizada', (data) => {
      if (typeof data === 'object' && data?.id) {
        setMesas(prev => prev.map(m => m.id === data.id ? { ...m, ...data } : m))
      } else {
        cargarMesas()
      }
    })

    conn.on('OrdenLista',      () => addToast('Orden lista en barra ✓', 'success'))
    conn.on('VentaRegistrada', cargarKpis)
    conn.on('VentaCobrada',    () => reloadRef.current())

    conn.onreconnected(() => { setConnected(true); reloadRef.current() })
    conn.onclose(() => setConnected(false))
    conn.start()
      .then(() => setConnected(true))
      .catch(e => console.warn('SignalR:', e.message))

    return () => conn.stop()
  }, [auth.token, addToast, cargarMesas, cargarKpis])

  // ── Tap mesa (cuenta lateral) ─────────────────────────
  // Se mantiene para rows de "Cuentas Abiertas" en el panel izq.
  const handleTapMesa = useCallback(async (mesa) => {
    const ocupada = mesa.estado === 'Ocupada' || !!mesa.cuentaId || !!mesa.cuentaActualId
    if (!ocupada) { setMesaSel(null); setCuentaSel(null); return }

    setMesaSel(mesa)
    const cuentaId = mesa.cuentaId ?? mesa.cuentaActualId
    if (!cuentaId) return

    setLoadingCuenta(true)
    try {
      const c = await api.getCuenta(cuentaId, auth.token)
      setCuentaSel(c)
    } catch (e) {
      addToast('Error al cargar cuenta: ' + e.message, 'warn')
    } finally {
      setLoadingCuenta(false)
    }
  }, [auth.token, addToast])

  // ── Click en card de mesa: ir a MesaOperableScreen ─────
  const handleClickMesaCard = useCallback((mesa) => {
    if (typeof onIrPantalla === 'function') {
      onIrPantalla('mesa-operable', `Mesa ${mesa.numero}`, {
        mesaId:     mesa.id,
        mesaNumero: mesa.numero,
      })
    } else {
      // Fallback al panel lateral si no hay router (no debería ocurrir)
      handleTapMesa(mesa)
    }
  }, [onIrPantalla, handleTapMesa])

  // ── Cobrar ─────────────────────────────────────────────
  const handleCobrar = useCallback(async (metodo) => {
    await api.cobrar(auth.token, {
      cuentaId:   cuentaSel.id,
      metodoPago: metodo,
      descuento:  0,
    })
    setCuentaSel(null)
    setMesaSel(null)
    setShowCobrar(false)
    reloadRef.current()
  }, [auth.token, cuentaSel])

  // ── Cancelar mesa vacía (FIX-4) ────────────────────────
  const handleCancelarVacia = useCallback(async () => {
    if (!cancelModal) return
    setCancelando(true)
    try {
      await api.adminCancelarCuenta(auth.token, cancelModal.cuentaId, { motivo: 'Mesa vacía — cancelada desde Admin' })
      setCancelModal(null)
      addToast(`Mesa ${cancelModal.mesaN} cerrada ✓`, 'success')
      reloadRef.current()
    } catch (e) {
      addToast('Error al cancelar: ' + e.message, 'warn')
    } finally {
      setCancelando(false)
    }
  }, [auth.token, cancelModal, addToast])

  // ── Derivados ──────────────────────────────────────────
  const ocupadas = mesas.filter(m => m.estado === 'Ocupada' || !!m.cuentaId).length
  const resumen  = getResumen(cuentaSel)

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="dash-root">

      {/* ── Toasts ── */}
      <div className="toasts-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.text}</div>
        ))}
      </div>

      {/* ── Cuerpo ── */}
      <div className="dash-body">

        {/* ═══ Panel izquierdo 40% ═══ */}
        <aside className="dash-left">

          {/* Encabezado del panel izquierdo */}
          <div className="dash-left-header">
            <img src={logoBar} className="dash-logo-sm" alt="Bar Avenida" />
            <span className="dash-left-title">BAR AVENIDA</span>
            <span className={`conn-pill ${connected ? 'conn-ok' : 'conn-err'}`}>
              ● {connected ? 'En línea' : 'Sin señal'}
            </span>
          </div>

          {/* KPIs 2×2 */}
          <div className="kpis-grid">
            <KpiCard color="gold"  icon="💰" label="VENTAS HOY"     value={fmt(kpis?.ventasHoy ?? kpis?.totalVentas)}         animIndex={0} />
            <KpiCard color="red"   icon="🍺" label="MESAS ABIERTAS" value={kpis?.cuentasAbiertas ?? ocupadas}                  animIndex={1} />
            <KpiCard color="blue"  icon="📋" label="TOTAL EN MESAS" value={fmt(kpis?.totalEnMesasAbiertas ?? kpis?.totalMesas)} animIndex={2} />
            <KpiCard color="green" icon="🎯" label="TICKET PROM."   value={fmt(kpis?.ticketPromedio ?? kpis?.promedioTicket)}  animIndex={3} />
          </div>

          {/* Separador */}
          <div className="section-title">
            CUENTAS ABIERTAS
            <span className="section-badge">{cuentasAbiertas.length}</span>
          </div>

          {/* Lista cuentas abiertas */}
          <div className="cuentas-list">
            {cuentasAbiertas.length === 0 ? (
              <div className="cuentas-empty">Sin cuentas abiertas</div>
            ) : (
              cuentasAbiertas.map(c => {
                const mesaN  = c.mesaNumero ?? c.mesa?.numero ?? c.mesaId ?? '?'
                const mesera = c.nombreMesera ?? c.mesera?.nombre ?? '—'
                const isSel  = cuentaSel?.id === c.id
                return (
                  <div
                    key={c.id}
                    className={`cuenta-row${isSel ? ' cuenta-row-sel' : ''}`}
                    onClick={() => handleTapMesa({ id: c.mesaId ?? c.mesa?.id, numero: mesaN, estado: 'Ocupada', cuentaId: c.id })}
                  >
                    <span className="cr-mesa">M{mesaN}</span>
                    <div className="cr-info">
                      <span className="cr-mesera">{mesera}</span>
                      <span className="cr-hora">{fmtHora(c.fechaApertura ?? c.createdAt)}</span>
                    </div>
                    <span className="cr-total">{fmt(c.total)}</span>
                    {(c.total === 0 || c.total === '0') && (
                      <button
                        className="cr-cancel-btn"
                        title="Cancelar mesa vacía"
                        onClick={e => {
                          e.stopPropagation()
                          const mins = Math.round((Date.now() - new Date(c.fechaApertura ?? c.createdAt).getTime()) / 60000)
                          setCancelModal({ cuentaId: c.id, mesaN, minutosAbierta: mins })
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </aside>

        {/* ═══ Panel derecho 60% ═══ */}
        <div className="dash-right">

          {/* Mesa grid */}
          <div className="mesas-area">
            <div className="mesas-stats-bar">
              <span className="ms-item ms-ocupadas">{ocupadas} ocupadas</span>
              <span className="ms-item ms-libres">{mesas.length - ocupadas} libres</span>
              <span className="ms-item ms-total">{mesas.length} total</span>
              <button className="btn-reportes ripple" onClick={() => setShowReportes(true)}>
                📊 RESUMEN HOY
              </button>
            </div>
            <div className="mesas-grid">
              {[...mesas].sort((a, b) => Number(a.numero) - Number(b.numero)).map(mesa => {
                const ocu   = mesa.estado === 'Ocupada' || !!mesa.cuentaId || !!mesa.cuentaActualId
                const isSel = mesaSel?.id === mesa.id
                return (
                  <button
                    key={mesa.id}
                    className={`mesa-card${ocu ? ' mesa-ocu' : ' mesa-lib'}${isSel ? ' mesa-sel' : ''}`}
                    onClick={() => handleClickMesaCard(mesa)}
                  >
                    {ocu && mesa.folio != null && (
                      <span className="mc-folio">#{mesa.folio}</span>
                    )}
                    <span className="mc-num">{mesa.numero}</span>
                    {ocu ? (
                      <>
                        <span className="mc-mes">{(mesa.nombreMesera ?? mesa.meseraActual ?? '').split(' ')[0]}</span>
                        <span className="mc-tot">{fmt(mesa.totalActual ?? 0)}</span>
                      </>
                    ) : (
                      <span className="mc-lib">·</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cuenta detalle — panel lateral */}
          <aside className={`cuenta-detalle-panel${cuentaSel || loadingCuenta ? ' abierta' : ''}`}>
            {loadingCuenta && (
              <div className="det-loading">Cargando...</div>
            )}
            {cuentaSel && !loadingCuenta && (
              <div className="det-inner">
                <div className="det-header">
                  <div className="det-hdr-info">
                    <span className="det-mesa">MESA {cuentaSel.mesaNumero ?? mesaSel?.numero ?? '?'}</span>
                    <span className="det-mesera">{cuentaSel.nombreMesera ?? '—'}</span>
                  </div>
                  <button className="det-close" onClick={() => { setCuentaSel(null); setMesaSel(null) }}>✕</button>
                </div>

                <div className="det-total-box">
                  <span className="det-total-label">TOTAL</span>
                  <span className="det-total-val">{fmtDec(cuentaSel.total)}</span>
                </div>

                <div className="det-section-title">PEDIDO COMPLETO</div>
                <ul className="det-list">
                  {resumen.length === 0
                    ? <li className="det-empty">Sin órdenes registradas</li>
                    : resumen.map((item, i) => (
                        <li key={i} className="det-row">
                          <span className="det-cant">{item.cantidad}x</span>
                          <span className="det-nombre">{item.nombre}</span>
                          <span className="det-sub">{fmt(item.subtotal)}</span>
                        </li>
                      ))
                  }
                </ul>

                <div className="det-footer">
                  <div className="det-footer-info">
                    <span>{cuentaSel.numeroPersonas ?? 1} personas</span>
                    {cuentaSel.nombreCliente && <span>· {cuentaSel.nombreCliente}</span>}
                  </div>
                  <button
                    className="btn-cobrar-det ripple"
                    onClick={() => setShowCobrar(true)}
                    disabled={!cuentaSel.total}
                  >
                    COBRAR {fmtDec(cuentaSel.total)}
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {showReportes && (
        <ReportesPanel auth={auth} onClose={() => setShowReportes(false)} />
      )}

      {showCobrar && cuentaSel && (
        <ModalCobrar
          total={cuentaSel.total ?? 0}
          onCobrar={handleCobrar}
          onCancel={() => setShowCobrar(false)}
        />
      )}

      {cancelModal && (
        <div className="cancel-overlay">
          <div className="cancel-box">
            <div className="cancel-title">¿Cancelar Mesa {cancelModal.mesaN}?</div>
            <div className="cancel-msg">
              Está vacía y lleva {cancelModal.minutosAbierta} min abierta.
              Esta acción no se puede deshacer.
            </div>
            <div className="cancel-actions">
              <button
                className="cancel-btn-no"
                onClick={() => setCancelModal(null)}
                disabled={cancelando}
              >
                No, volver
              </button>
              <button
                className="cancel-btn-si"
                onClick={handleCancelarVacia}
                disabled={cancelando}
              >
                {cancelando ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── KPI Card ─────────────────────────────────────────────
function KpiCard({ icon, label, value, color, animIndex }) {
  return (
    <div
      className={`kpi-card kpi-${color}`}
      style={{ animationDelay: `${animIndex * 50}ms` }}
    >
      <span className="kpi-icon">{icon}</span>
      <span className="kpi-value">{value ?? '—'}</span>
      <span className="kpi-label">{label}</span>
    </div>
  )
}
