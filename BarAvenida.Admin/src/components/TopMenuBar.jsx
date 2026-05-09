import { useState, useEffect, useRef, useCallback } from 'react'
import { useServerClock } from '../hooks/useServerClock'
import * as signalR from '@microsoft/signalr'
import { api, API_URL } from '../api'
import AlertasDrawer from './AlertasDrawer'
import logoBar from '../assets/logo-bar-avenida.jpeg'
import './TopMenuBar.css'

const SECCIONES = [
  {
    id: 'pos',
    label: 'PUNTO DE VENTA',
    icon: '🍺',
    tabs: [
      { id: 'pos-mesas',       label: '🍽️ Mesas',              screen: 'pos-mesas' },
      { id: 'pos-cobrar',      label: '💵 Cuentas por cobrar', screen: 'cuentas-por-cobrar' },
      { id: 'pos-solicitudes', label: '🔔 Solicitudes',        screen: 'solicitudes-pendientes' },
      {
        id: 'pos-caja', label: '💰 Caja', hub: true,
        sub: [
          { label: 'Apertura turno',   screen: 'caja-apertura-turno', shortcut: 'F2' },
          { label: 'Corte X',          screen: 'caja-corte-x',        shortcut: 'F6' },
          { label: 'Corte Z',          screen: 'caja-corte-z' },
          { label: 'Retiros',          screen: 'caja-retiros' },
          { label: 'Histórico cajón',  screen: 'historial-cajon' },
          { label: 'Histórico cortes', screen: 'caja-historico-cortes' },
          { label: 'Incidentes',       screen: 'caja-incidentes' },
        ],
      },
    ],
  },
  {
    id: 'admin',
    label: 'ADMINISTRACIÓN',
    icon: '⚙️',
    tabs: [
      { id: 'adm-productos', label: '📦 Productos',   screen: 'cat-productos' },
      { id: 'adm-mesas',     label: '🪑 Mesas',       screen: 'cat-mesas' },
      { id: 'adm-areas',     label: '🗺️ Áreas',       screen: 'config-areas-venta' },
      { id: 'adm-reglas',    label: '🎯 Sugerencias', screen: 'cat-reglas-crosssell' },
      {
        id: 'adm-reportes', label: '📊 Reportes', hub: true,
        sub: [
          { label: 'Dashboard vivo',    screen: 'rep-dashboard-live' },
          { label: 'Informe del día',   screen: 'rep-informe-dia' },
          { label: 'Resumen ventas',    screen: 'rep-ventas-resumen' },
          { label: 'Productos top',     screen: 'rep-productos-top' },
          { label: 'Ventas por mesera', screen: 'rep-ventas-mesera' },
          { label: 'Ventas categoría',  screen: 'rep-categorias' },
          { label: 'Ventas por hora',   screen: 'rep-ventas-hora' },
          { label: 'Métodos de pago',   screen: 'rep-metodos-pago' },
        ],
      },
      { id: 'adm-usuarios', label: '🛡️ Usuarios', screen: 'usuarios' },
      {
        id: 'adm-config', label: '⚙️ Configuración', hub: true,
        sub: [
          { label: 'General',        screen: 'config-general' },
          { label: 'Formas de pago', screen: 'config-formas-pago' },
          { label: 'Folio ticket',   screen: 'config-folios' },
          { label: 'Cambiar PIN',    screen: 'seg-contrasena' },
        ],
      },
    ],
  },
]

const LS_SECCION  = 'ba_admin_seccion'
const LS_PANTALLA = 'ba_admin_ultima_pantalla'

function fmtClock(d) {
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function findSeccionForScreen(screen) {
  for (const s of SECCIONES) {
    for (const tab of s.tabs) {
      if (tab.hub) {
        if (tab.sub.some(sub => sub.screen === screen)) return s.id
      } else {
        if (tab.screen === screen) return s.id
      }
    }
  }
  return null
}

export default function TopMenuBar({ auth, pantallaActual, onIrPantalla, onLogout }) {
  const [seccionActiva, setSeccionActiva] = useState(
    () => localStorage.getItem(LS_SECCION) || 'pos'
  )
  const [openHub, setOpenHub]                 = useState(null)
  const clock                                  = useServerClock()
  const [pendientesCount, setPendientesCount] = useState(0)
  const [alertas, setAlertas]                 = useState([])
  const [drawerAbierto, setDrawerAbierto]     = useState(false)
  const barRef                                = useRef(null)
  const connRef                               = useRef(null)

  const seccionData = SECCIONES.find(s => s.id === seccionActiva) || SECCIONES[0]

  // Auto-switch section when pantallaActual changes (e.g. via keyboard shortcut)
  useEffect(() => {
    if (!pantallaActual) return
    const found = findSeccionForScreen(pantallaActual)
    if (found && found !== seccionActiva) {
      setSeccionActiva(found)
      localStorage.setItem(LS_SECCION, found)
    }
  }, [pantallaActual, seccionActiva])

  // ── Contador de solicitudes pendientes ──
  const cargarPendientes = useCallback(async () => {
    if (!auth?.token) return
    try {
      const data = await api.getSolicitudesPendientes(auth.token)
      setPendientesCount(Array.isArray(data) ? data.length : 0)
    } catch {}
  }, [auth?.token])

  useEffect(() => { cargarPendientes() }, [cargarPendientes])

  // ── SignalR ──
  useEffect(() => {
    if (!auth?.token) return
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/barhub`, { accessTokenFactory: () => auth.token })
      .withAutomaticReconnect([0, 2000, 5000, 15000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('SolicitudCancelacion', () => cargarPendientes())
    conn.on('SolicitudResuelta',    () => cargarPendientes())
    conn.on('AlertaCaja', (alerta) => {
      if (!alerta?.id) return
      setAlertas(prev => prev.some(a => a.id === alerta.id) ? prev : [alerta, ...prev])
    })

    conn.start()
      .then(() => conn.invoke('UnirseAGrupo', 'Admin').catch(() => {}))
      .catch(e => console.warn('SignalR TopMenuBar:', e.message))

    connRef.current = conn
    return () => { conn.stop() }
  }, [auth?.token, cargarPendientes])

  const descartarAlerta = useCallback((id) => setAlertas(prev => prev.filter(a => a.id !== id)), [])
  const descartarTodas  = useCallback(() => setAlertas([]), [])

  // Close hub dropdown on outside click
  useEffect(() => {
    if (!openHub) return
    const handler = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) setOpenHub(null)
    }
    const t = setTimeout(() => document.addEventListener('click', handler), 0)
    return () => { clearTimeout(t); document.removeEventListener('click', handler) }
  }, [openHub])

  // Keyboard shortcuts
  const handleKeyNav = useCallback((e) => {
    if (e.key === 'Escape') { setOpenHub(null); return }

    // Atajos de teclado del Admin v2 (alineados con el menu nuevo)
    const fnKeys = {
      F2: 'caja-apertura-turno', // PUNTO DE VENTA → Caja → Apertura turno
      F3: 'caja-corte-z',        // PUNTO DE VENTA → Caja → Corte Z (cierre diario)
      F6: 'caja-corte-x',        // PUNTO DE VENTA → Caja → Corte X (parcial)
    }
    if (fnKeys[e.key]) {
      e.preventDefault()
      onIrPantalla(fnKeys[e.key], e.key)
      setOpenHub(null)
      return
    }
    if (e.key === 'F8') { e.preventDefault(); return }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
      e.preventDefault()
      onIrPantalla('seg-cambio-usuario', 'Cambio de usuario')
      setOpenHub(null)
    }
  }, [onIrPantalla])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyNav)
    return () => document.removeEventListener('keydown', handleKeyNav)
  }, [handleKeyNav])

  const cambiarSeccion = (id) => {
    setSeccionActiva(id)
    localStorage.setItem(LS_SECCION, id)
    setOpenHub(null)
    const seccion = SECCIONES.find(s => s.id === id)
    if (!seccion) return
    const primerTab = seccion.tabs[0]
    if (primerTab.hub) {
      const sub = primerTab.sub[0]
      onIrPantalla(sub.screen, sub.label)
      localStorage.setItem(LS_PANTALLA, sub.screen)
    } else {
      onIrPantalla(primerTab.screen, primerTab.label)
      localStorage.setItem(LS_PANTALLA, primerTab.screen)
    }
  }

  const handleTabClick = (tab) => {
    if (tab.hub) {
      setOpenHub(prev => prev === tab.id ? null : tab.id)
    } else {
      setOpenHub(null)
      onIrPantalla(tab.screen, tab.label)
      localStorage.setItem(LS_PANTALLA, tab.screen)
    }
  }

  const handleSubClick = (sub) => {
    setOpenHub(null)
    onIrPantalla(sub.screen, sub.label)
    localStorage.setItem(LS_PANTALLA, sub.screen)
  }

  const isTabActive = (tab) => {
    if (tab.hub) return tab.sub.some(s => s.screen === pantallaActual)
    return tab.screen === pantallaActual
  }

  return (
    <header className="top-menu-bar" ref={barRef}>

      {/* ── Row 1: Header ── */}
      <div className="tmb-header-row">
        <div className="tmb-brand">
          <img src={logoBar} className="tmb-logo" alt="Bar Avenida" />
          <span className="tmb-title">BAR AVENIDA <span className="tmb-sep">·</span> ADMIN</span>
        </div>

        <div className="tmb-right">
          {alertas.length > 0 && (
            <button
              className="tmb-alerta-btn"
              onClick={() => setDrawerAbierto(true)}
              title={`${alertas.length} alerta${alertas.length !== 1 ? 's' : ''} de caja`}
            >
              <span className="tmb-alerta-ico">⚠</span>
              <span className="tmb-alerta-badge">{alertas.length}</span>
            </button>
          )}
          <span className="tmb-online"><span className="tmb-dot">●</span> EN LÍNEA</span>
          <span className="tmb-clock">{fmtClock(clock)}</span>
          <span className="tmb-user">{auth?.nombre}</span>
          <button className="tmb-logout" onClick={onLogout}>SALIR</button>
        </div>
      </div>

      {/* ── Row 2: Section selector ── */}
      <div className="seccion-selector">
        {SECCIONES.map(s => (
          <button
            key={s.id}
            className={`seccion-btn${seccionActiva === s.id ? ' activa' : ''}`}
            onClick={() => cambiarSeccion(s.id)}
          >
            <span className="seccion-icon">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Row 3: Sub-tabs of active section ── */}
      <div className="sub-tabs">
        {seccionData.tabs.map(tab => {
          const isActive  = isTabActive(tab)
          const showBadge = tab.id === 'pos-solicitudes' && pendientesCount > 0
          return (
            <div key={tab.id} className="sub-tab-wrap">
              <button
                className={`sub-tab${isActive ? ' activa' : ''}${tab.hub ? ' hub' : ''}`}
                onClick={() => handleTabClick(tab)}
              >
                {tab.label}
                {showBadge && (
                  <span
                    className="tmb-badge"
                    title={`${pendientesCount} solicitud${pendientesCount !== 1 ? 'es' : ''} pendiente${pendientesCount !== 1 ? 's' : ''}`}
                  >
                    {pendientesCount}
                  </span>
                )}
                {tab.hub && <span className="sub-tab-arrow">▾</span>}
              </button>

              {tab.hub && openHub === tab.id && (
                <div className="sub-tab-dropdown">
                  {tab.sub.map((sub, idx) => (
                    <button
                      key={idx}
                      className="sub-tab-dropdown-item"
                      onClick={() => handleSubClick(sub)}
                    >
                      <span>{sub.label}</span>
                      {sub.shortcut && <span className="sub-tab-sc">{sub.shortcut}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Drawer lateral de alertas ── */}
      {drawerAbierto && (
        <AlertasDrawer
          alertas={alertas}
          onClose={() => setDrawerAbierto(false)}
          onIrPantalla={onIrPantalla}
          onDescartar={descartarAlerta}
          onDescartarTodas={descartarTodas}
        />
      )}
    </header>
  )
}
