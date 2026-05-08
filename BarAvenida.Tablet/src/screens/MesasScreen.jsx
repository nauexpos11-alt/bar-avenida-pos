import { useState, useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { api, API_URL } from '../api'
import AbrirMesaModal from '../components/AbrirMesaModal'
import OpcionesMesaModal from '../components/OpcionesMesaModal'
import './MesasScreen.css'

const AREAS = ['TODAS LAS ÁREAS', 'COMEDOR', 'TERRAZA', 'BARRA']
const POR_PAGINA = 24

const IcoVerPrecios = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className="action-ico">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    <line x1="11" y1="8" x2="11" y2="14"/>
    <line x1="8" y1="11" x2="14" y2="11"/>
  </svg>
)

export default function MesasScreen({ auth, onLogout, onIrCuenta, onIrResumen, onVerPrecios }) {
  const [mesas, setMesas]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [connected, setConnected] = useState(false)
  const [areaActual, setAreaActual] = useState('TODAS LAS ÁREAS')
  const [pagina, setPagina]       = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [confirmAbandonar, setConfirmAbandonar] = useState(false)

  const [modalMesa, setModalMesa]           = useState(null)
  const [modalOpciones, setModalOpciones]   = useState(null)
  const [cargandoCuenta, setCargandoCuenta] = useState(false)
  const [porCobrarMesas, setPorCobrarMesas]       = useState(new Set())
  const [solicitudesMesas, setSolicitudesMesas]   = useState(new Map())
  const connRef = useRef(null)

  const cargarMesas = () => {
    setLoading(true)
    setPorCobrarMesas(new Set())
    api.getMesas(auth.token)
      .then(data => { setMesas(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(e  => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { cargarMesas() }, [])

  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/barhub`, { accessTokenFactory: () => auth.token })
      .withAutomaticReconnect([0, 2000, 5000, 15000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('MesaActualizada', (data) => {
      if (typeof data === 'object' && data !== null)
        setMesas(prev => prev.map(m => m.id === data.id ? { ...m, ...data } : m))
      else
        cargarMesas()
    })

    conn.on('MesaPorCobrar', (mesaId) => {
      setPorCobrarMesas(prev => new Set([...prev, mesaId]))
    })

    conn.on('SolicitudCancelacion', (payload) => {
      if (payload?.mesaId)
        setSolicitudesMesas(prev =>
          new Map(prev).set(payload.mesaId, { tipo: payload.tipo, monto: payload.montoTotal }))
    })

    conn.on('SolicitudResuelta', (payload) => {
      setSolicitudesMesas(prev => { const m = new Map(prev); m.delete(payload.mesaId); return m })
    })

    conn.on('CuentaAbierta',   () => cargarMesas())
    conn.on('VentaCobrada',    () => cargarMesas())
    conn.on('CuentaCobrada',   () => cargarMesas())
    conn.on('CuentaCancelada', () => cargarMesas())

    conn.onreconnected(() => { setConnected(true); cargarMesas() })
    conn.onclose(() => setConnected(false))
    conn.start()
      .then(() => setConnected(true))
      .catch(e => console.warn('SignalR:', e.message))

    connRef.current = conn
    return () => conn.stop()
  }, [auth.token])

  const handleTapMesa = async (mesa) => {
    if (porCobrarMesas.has(mesa.id)) return

    const ocupada = mesa.estado === 'Ocupada' || !!mesa.cuentaActivaId || !!mesa.cuentaId || !!mesa.cuentaActualId
    if (!ocupada) {
      setModalMesa(mesa)
      return
    }

    setCargandoCuenta(true)
    try {
      let cuenta = null
      const cuentaId = mesa.cuentaActivaId ?? mesa.cuentaId ?? mesa.cuentaActualId
      if (cuentaId) {
        cuenta = await api.getCuenta(cuentaId, auth.token)
      } else {
        const abiertas = await api.getCuentasAbiertas(auth.token)
        cuenta = abiertas.find(c => c.mesaId === mesa.id || c.mesa?.id === mesa.id) ?? null
      }
      if (cuenta) setModalOpciones({ mesa, cuenta })
      else setError('No se encontró la cuenta de esta mesa')
    } catch (e) { setError(e.message) }
    finally { setCargandoCuenta(false) }
  }

  const mesasFiltradas = areaActual === 'TODAS LAS ÁREAS'
    ? mesas
    : mesas.filter(m => (m.areaNombre ?? m.area ?? m.zona ?? '').toUpperCase() === areaActual)

  const totalPags  = Math.ceil(mesasFiltradas.length / POR_PAGINA)
  const mesasPag   = mesasFiltradas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA)
  const ocupadasCount = mesas.filter(m => m.estado === 'Ocupada' || !!m.cuentaActivaId || !!m.cuentaId).length

  const handleArea = (area) => { setAreaActual(area); setPagina(0); setSidebarOpen(false) }

  const renderMesa = (mesa) => {
    const porCobrar      = porCobrarMesas.has(mesa.id)
    const tieneSolicitud = !porCobrar && solicitudesMesas.has(mesa.id)
    const ocupada        = !porCobrar && !tieneSolicitud && (mesa.estado === 'Ocupada' || !!mesa.cuentaActivaId || !!mesa.cuentaId || !!mesa.cuentaActualId)
    const pendiente      = !porCobrar && !tieneSolicitud && !ocupada && (mesa.estado === 'Pendiente' || mesa.estado === 'EnProceso')

    // Cuando el backend devuelva meseraActualId usar eso; fallback temporal: comparar nombre
    const esMia = ocupada && (
      mesa.meseraActualId != null
        ? String(mesa.meseraActualId) === String(auth.id)
        : (mesa.meseraActual != null && mesa.meseraActual === auth.nombre)
    )
    const esOtra = ocupada && !esMia

    const cls = porCobrar      ? 'mesa-por-cobrar'
      : tieneSolicitud ? 'mesa-con-solicitud'
      : esMia          ? 'mesa-mia'
      : esOtra         ? 'mesa-otra'
      : pendiente      ? 'mesa-pendiente'
      : 'mesa-libre'

    const sol = tieneSolicitud ? solicitudesMesas.get(mesa.id) : null

    return (
      <button
        key={mesa.id}
        className={`mesa-card ${cls}`}
        onClick={() => handleTapMesa(mesa)}
        disabled={cargandoCuenta || porCobrar || esOtra}
      >
        <span className="mesa-numero">{mesa.numero}</span>
        {porCobrar ? (
          <div className="mesa-info">
            <span className="mesa-mesera">{mesa.meseraActual || mesa.nombreMesera || ''}</span>
            <span className="mesa-monto-cobrar">${(mesa.totalActual ?? 0).toFixed(0)}</span>
            <span className="mesa-estado-txt txt-por-cobrar">💵 COBRANDO</span>
          </div>
        ) : tieneSolicitud ? (
          <div className="mesa-info">
            <span className="mesa-mesera">{mesa.meseraActual || mesa.nombreMesera || ''}</span>
            <span className="mesa-monto-solicitud">${(sol?.monto ?? mesa.totalActual ?? 0).toFixed(0)}</span>
            <span className="mesa-estado-txt txt-solicitud">🔔 SOLICITUD</span>
          </div>
        ) : esMia ? (
          <div className="mesa-info">
            <span className="mesa-mesera mesa-mesera-mia">{mesa.meseraActual || mesa.nombreMesera || ''}</span>
            <span className="mesa-total mesa-total-mia">${(mesa.totalActual ?? 0).toFixed(0)}</span>
          </div>
        ) : esOtra ? (
          <div className="mesa-info">
            <span className="mesa-mesera">{mesa.meseraActual || mesa.nombreMesera || ''}</span>
            <span className="mesa-estado-txt txt-otra">🔒 OCUPADA</span>
          </div>
        ) : (
          <span className={`mesa-estado-txt ${pendiente ? 'txt-pendiente' : 'txt-libre'}`}>
            {pendiente ? 'PENDIENTE' : 'LIBRE'}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="mesas-root">

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Barra de acciones superior ── */}
      <div className="action-bar">
        <div className="action-bar-logo">
          <span className="logo-bar">BAR</span>
          <span className="logo-av">AVENIDA</span>
        </div>

        <div className="action-bar-btns">
          <button className="action-btn" onClick={() => onVerPrecios?.()}>
            <IcoVerPrecios />
            <span>VER PRECIOS</span>
          </button>
        </div>

        <div className="action-bar-end">
          <span className={`conn-dot ${connected ? 'conn-ok' : 'conn-err'}`}>
            ● {connected ? 'EN LÍNEA' : 'DESCONECTADO'}
          </span>
          <button className="btn-hamburger" onClick={() => setSidebarOpen(o => !o)}>☰</button>
        </div>
      </div>

      {/* ── Cuerpo principal ── */}
      <div className="mesas-body">

        <div className="mesas-main">

          <div className="mesas-topbar">
            <button className="btn-atras" onClick={onLogout}>
              <span className="atras-arrow">◀</span>
              <span>ATRÁS</span>
            </button>

            <div className="topbar-center">
              <span className="area-label">{areaActual}</span>
              <div className="area-stats">
                <span className="stat-ocp">{ocupadasCount} ocup.</span>
                <span className="stat-lib">{mesas.length - ocupadasCount} libres</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="error-banner">
              ⚠ {error}
              <button className="err-close" onClick={() => setError(null)}>✕</button>
            </div>
          )}

          {loading
            ? <div className="mesas-loading">Cargando mesas...</div>
            : <div className="mesas-grid">{mesasPag.map(renderMesa)}</div>
          }

          {totalPags > 1 && (
            <div className="mesas-paginacion">
              <button className="btn-pag" disabled={pagina === 0}
                onClick={() => setPagina(p => p - 1)}>◀ ANTERIOR</button>
              <span className="pag-info">{pagina + 1} / {totalPags}</span>
              <button className="btn-pag" disabled={pagina >= totalPags - 1}
                onClick={() => setPagina(p => p + 1)}>SIGUIENTE ▶</button>
            </div>
          )}
        </div>

        <aside className={`mesas-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-inner">

            <div className="sidebar-mesero">
              <div className="mesero-codigo">{auth.id ?? '—'}</div>
              <div className="mesero-nombre">{auth.nombre}</div>
              <div className="mesero-rol">{auth.rol}</div>
            </div>

            <div className="sidebar-areas">
              <div className="areas-title">ÁREAS</div>
              {AREAS.map(area => (
                <button
                  key={area}
                  className={`btn-area ${areaActual === area ? 'area-activa' : ''}`}
                  onClick={() => handleArea(area)}
                >
                  {area}
                </button>
              ))}
            </div>

            <div className="sidebar-footer">
              <div className="area-arrows">
                <button className="btn-arrow" title="Anterior">◀</button>
                <button className="btn-arrow" title="Siguiente">▶</button>
              </div>
              <button className="btn-abandonar" onClick={() => setConfirmAbandonar(true)}>
                ABANDONAR
              </button>
            </div>

          </div>
        </aside>
      </div>

      {cargandoCuenta && (
        <div className="loading-overlay">Cargando cuenta...</div>
      )}

      {confirmAbandonar && (
        <div className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setConfirmAbandonar(false)}>
          <div className="modal-box modal-abandonar">
            <div className="modal-title modal-title-danger">¿ABANDONAR?</div>
            <div className="modal-sub">Cerrarás tu sesión. Las cuentas abiertas quedan activas.</div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setConfirmAbandonar(false)}>
                CANCELAR
              </button>
              <button className="btn-danger"
                onClick={() => { setConfirmAbandonar(false); onLogout() }}>
                SÍ, ABANDONAR
              </button>
            </div>
          </div>
        </div>
      )}

      {modalMesa && (
        <AbrirMesaModal
          mesa={modalMesa}
          auth={auth}
          onExito={(cuenta) => { setModalMesa(null); onIrCuenta(modalMesa, cuenta) }}
          onCancelar={() => setModalMesa(null)}
        />
      )}

      {modalOpciones && (
        <OpcionesMesaModal
          mesa={modalOpciones.mesa}
          cuenta={modalOpciones.cuenta}
          auth={auth}
          onIrCapturar={(mesa) => { setModalOpciones(null); onIrCuenta(mesa, modalOpciones.cuenta) }}
          onIrResumen={(mesa)  => { setModalOpciones(null); onIrResumen?.(mesa, modalOpciones.cuenta) }}
          onCancelar={() => setModalOpciones(null)}
        />
      )}

    </div>
  )
}
