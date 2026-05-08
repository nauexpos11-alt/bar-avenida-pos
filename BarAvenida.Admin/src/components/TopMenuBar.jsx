import { useState, useEffect, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import { api, API_URL } from '../api'
import AlertasDrawer from './AlertasDrawer'
import logoBar from '../assets/logo-bar-avenida.jpeg'
import './TopMenuBar.css'

const MENUS = [
  {
    label: 'CONFIGURACIÓN',
    items: [
      { label: 'Configuración general',            screen: 'config-general' },
      { label: 'Configuración de estaciones',      screen: 'config-estaciones' },
      { label: 'Áreas de venta',                   screen: 'config-areas-venta' },
      { label: '🚧 Áreas de impresión de comandas',  placeholder: true },
      { label: 'Formas de pago',                   screen: 'config-formas-pago' },
      { label: 'Folio de ticket',                  screen: 'config-folios' },
      { label: 'Contabilidad',                     screen: 'config-contabilidad' },
      { label: 'Configurar formatos de impresión', screen: 'config-formatos' },
    ],
  },
  {
    label: 'EDICIÓN',
    items: [
      { label: 'Deshacer', shortcut: 'CTRL+Z', placeholder: true },
      { label: 'Copiar',   shortcut: 'CTRL+C', placeholder: true },
      { label: 'Pegar',    shortcut: 'CTRL+V', placeholder: true },
    ],
  },
  {
    label: 'CATÁLOGOS',
    items: [
      { label: 'Productos para venta',          screen: 'cat-productos' },
      { label: '🎯 Reglas de sugerencias',      screen: 'cat-reglas-crosssell' },
      { label: 'Meseros / Repartidores',        screen: 'cat-meseros' },
      { label: 'Clientes',                      screen: 'cat-clientes' },
      { label: 'Promociones',                   screen: 'cat-promociones' },
      { label: 'Tipos de descuento a clientes', screen: 'cat-descuentos' },
      { label: 'Insumos (materia prima)',        screen: 'cat-insumos' },
      { label: 'Almacenes',                     screen: 'cat-almacenes' },
      { label: 'Tipo de proveedores',           screen: 'cat-tipo-proveedores' },
      { label: 'Proveedores',                   screen: 'cat-proveedores' },
      { label: 'Tipo de mesa',                  screen: 'cat-tipo-mesa' },
      { label: 'Mesas',                         screen: 'cat-mesas' },
    ],
  },
  {
    label: 'CAJA',
    items: [
      { label: 'Apertura de turno',                       screen: 'caja-apertura-turno', shortcut: 'F2' },
      { label: 'Cierre diario',                           screen: 'caja-cierre-diario',  shortcut: 'F3' },
      { label: 'Registrar/modificar propina en efectivo', screen: 'caja-propinas' },
      { label: 'Pagar propinas de meseros',               screen: 'caja-pagar-propinas' },
      { label: 'Retiros y depósitos de efectivo',         screen: 'caja-retiros' },
      { label: 'Corte de caja X (parcial)',               screen: 'caja-corte-x',        shortcut: 'F6' },
      { label: 'Corte de caja Z (cierre)',                screen: 'caja-corte-z' },
      { label: 'Histórico de cortes',                     screen: 'caja-historico-cortes' },
      { label: 'Historial de cajón',                      screen: 'historial-cajon' },
      { label: 'Histórico de incidentes',                 screen: 'caja-incidentes' },
      { label: 'Abrir cajón de dinero',                   placeholder: true },
    ],
  },
  {
    label: 'VENTAS',
    items: [
      { label: 'Servicio COMEDOR',         screen: 'ventas-comedor',    shortcut: 'F7' },
      { label: 'Pago agrupado',            placeholder: true },
      { label: 'Folios de comandas',       screen: 'ventas-folios' },
      { label: 'Servicio DOMICILIO',       placeholder: true,           shortcut: 'F8' },
      { label: 'Servicio RÁPIDO',          placeholder: true,           shortcut: 'F9' },
      { label: 'Facturación',              screen: 'ventas-facturacion' },
      { label: '💵 Cuentas por cobrar',    screen: 'cuentas-por-cobrar' },
      { label: '🔔 Solicitudes pendientes', screen: 'solicitudes-pendientes' },
      { label: 'Imprimir nota de consumo', placeholder: true },
      { label: 'Reimprimir folios',        placeholder: true },
      { label: 'Tarjeta de crédito',       placeholder: true },
    ],
  },
  {
    label: 'OPERACIONES',
    items: [
      { label: 'Gastos',                        screen: 'op-gastos' },
      { label: 'Cuentas por cobrar (consulta)', screen: 'op-cobrar' },
      { label: 'Cuentas por pagar',             screen: 'op-pagar' },
      { label: 'Pago de comisiones de agentes', screen: 'op-comisiones' },
      { label: 'Cortesías',                     screen: 'op-cortesias' },
    ],
  },
  {
    label: 'ALMACÉN',
    items: [
      { label: 'Pedidos',                   screen: 'alm-pedidos' },
      { label: 'Órdenes de compra',         screen: 'alm-ordenes' },
      { label: 'Compras',                   screen: 'alm-compras' },
      { label: 'Movimientos de almacén',    screen: 'alm-movimientos' },
      { label: 'Traspasos entre almacenes', screen: 'alm-traspasos' },
      { label: 'Inventario físico',         screen: 'alm-inventario' },
      { label: 'Elaboración de insumos',    screen: 'alm-elaboracion' },
      { label: 'Desperdicios',              screen: 'alm-desperdicios' },
      { label: 'Explosión de productos',    screen: 'alm-explosion' },
    ],
  },
  {
    label: 'CONSULTAS',
    items: [
      { label: 'Consulta de cuentas', screen: 'cons-cuentas' },
      { label: 'Movimientos',         screen: 'cons-movimientos' },
      { label: 'Estado de mesas',     screen: 'dashboard' },
    ],
  },
  {
    label: 'REPORTES',
    items: [
      { label: 'Dashboard vivo',         screen: 'rep-dashboard-live' },
      { label: 'Informe del dia',        screen: 'rep-informe-dia' },
      { label: 'Resumen de ventas',      screen: 'rep-ventas-resumen' },
      { label: 'Productos más vendidos', screen: 'rep-productos-top' },
      { label: 'Ventas por mesero',      screen: 'rep-ventas-mesera' },
      { label: 'Ventas por categoría',   screen: 'rep-categorias' },
      { label: 'Ventas por hora',        screen: 'rep-ventas-hora' },
      { label: 'Métodos de pago',        screen: 'rep-metodos-pago' },
    ],
  },
  {
    label: 'SEGURIDAD',
    items: [
      { label: 'Usuarios',              screen: 'usuarios' },
      { label: 'Perfiles de seguridad', screen: 'seg-perfiles' },
      { label: 'Cambiar contraseña',    screen: 'seg-contrasena' },
      { label: 'Cambio de usuario',     screen: 'seg-cambio-usuario', shortcut: 'CTRL+U' },
    ],
  },
  {
    label: 'MANTENIMIENTO',
    items: [
      { label: 'Base de datos',                    screen: 'mant-bd' },
      { label: 'Exportar / Importar datos',        screen: 'mant-export' },
      { label: 'Herramientas para administradores', screen: 'mant-admin' },
      { label: 'Sincronizar catálogo (admin)',     screen: 'mant-sync-catalogo' },
    ],
  },
  {
    label: 'AYUDA',
    items: [
      { label: 'Soporte técnico',         screen: 'ayuda-soporte' },
      { label: 'Información del sistema', screen: 'ayuda-info' },
      { label: 'Acerca de',               screen: 'ayuda-acerca' },
    ],
  },
]

function fmtClock(d) {
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function TopMenuBar({ auth, onIrPantalla, onLogout }) {
  const [openMenu, setOpenMenu]               = useState(null)
  const [clock, setClock]                     = useState(new Date())
  const [pendientesCount, setPendientesCount] = useState(0)
  // PROMPT C.2 — Alertas activas de caja
  const [alertas, setAlertas]                 = useState([])
  const [drawerAbierto, setDrawerAbierto]     = useState(false)
  const barRef                                = useRef(null)
  const connRef                               = useRef(null)

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // ── Contador de solicitudes pendientes (PROMPT B3) ──
  const cargarPendientes = useCallback(async () => {
    if (!auth?.token) return
    try {
      const data = await api.getSolicitudesPendientes(auth.token)
      setPendientesCount(Array.isArray(data) ? data.length : 0)
    } catch {
      // Silencioso: el badge no debe romper el header si la API falla
    }
  }, [auth?.token])

  useEffect(() => {
    cargarPendientes()
  }, [cargarPendientes])

  useEffect(() => {
    if (!auth?.token) return

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/barhub`, { accessTokenFactory: () => auth.token })
      .withAutomaticReconnect([0, 2000, 5000, 15000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('SolicitudCancelacion', () => cargarPendientes())
    conn.on('SolicitudResuelta',    () => cargarPendientes())

    // PROMPT C.2 — recibir alertas activas de caja
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

  // PROMPT C.2 — handlers del drawer de alertas
  const descartarAlerta = useCallback((id) => {
    setAlertas(prev => prev.filter(a => a.id !== id))
  }, [])
  const descartarTodas  = useCallback(() => setAlertas([]), [])

  useEffect(() => {
    if (!openMenu) return
    const handler = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setOpenMenu(null)
      }
    }
    const t = setTimeout(() => {
      document.addEventListener('click', handler)
    }, 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('click', handler)
    }
  }, [openMenu])

  const handleKeyNav = useCallback((e) => {
    if (e.key === 'Escape') { setOpenMenu(null); return }

    const fnKeys = { F2: 'caja-apertura-turno', F3: 'caja-cierre-diario', F6: 'caja-corte-x', F7: 'ventas-comedor' }
    if (fnKeys[e.key]) {
      e.preventDefault()
      onIrPantalla(fnKeys[e.key], e.key)
      setOpenMenu(null)
      return
    }
    if (['F8', 'F9'].includes(e.key)) { e.preventDefault(); return }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
      e.preventDefault()
      onIrPantalla('seg-cambio-usuario', 'Cambio de usuario')
      setOpenMenu(null)
    }
  }, [onIrPantalla])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyNav)
    return () => document.removeEventListener('keydown', handleKeyNav)
  }, [handleKeyNav])

  const toggleMenu = (label) => setOpenMenu(prev => prev === label ? null : label)

  const handleItemClick = (item) => {
    setOpenMenu(null)
    if (item.placeholder) {
      alert(`"${item.label}" — función próximamente disponible`)
      return
    }
    if (item.screen) onIrPantalla(item.screen, item.label)
  }

  return (
    <header className="top-menu-bar" ref={barRef}>
      <div className="tmb-brand">
        <img src={logoBar} className="tmb-logo" alt="Bar Avenida" />
        <span className="tmb-title">BAR AVENIDA <span className="tmb-sep">·</span> ADMIN</span>
      </div>

      <nav className="tmb-nav">
        {MENUS.map((menu) => {
          const showBadge = menu.label === 'VENTAS' && pendientesCount > 0
          return (
            <div
              key={menu.label}
              className={`tmb-menu-wrap${openMenu === menu.label ? ' tmb-menu-open' : ''}`}
            >
              <button className="tmb-menu-btn" onClick={() => toggleMenu(menu.label)}>
                {menu.label}
                {showBadge && (
                  <span className="tmb-badge" title={`${pendientesCount} solicitud${pendientesCount !== 1 ? 'es' : ''} pendiente${pendientesCount !== 1 ? 's' : ''}`}>
                    {pendientesCount}
                  </span>
                )}
              </button>

              {openMenu === menu.label && (
                <div className="tmb-dropdown">
                  {menu.items.map((item, idx) => {
                    const itemBadge = item.screen === 'solicitudes-pendientes' && pendientesCount > 0
                    return (
                      <button
                        key={idx}
                        className={`tmb-drop-item${item.placeholder ? ' tmb-item-dim' : ''}`}
                        style={{ animationDelay: `${idx * 30}ms` }}
                        onClick={() => handleItemClick(item)}
                      >
                        <span className="tmb-item-label">
                          {item.label}
                          {itemBadge && <span className="tmb-item-badge">{pendientesCount}</span>}
                        </span>
                        {item.shortcut && <span className="tmb-item-sc">{item.shortcut}</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="tmb-right">
        {/* PROMPT C.2 — Botón de alertas de caja con badge */}
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

      {/* PROMPT C.2 — Drawer lateral de alertas */}
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
