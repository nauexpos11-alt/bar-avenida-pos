import { useState, useEffect } from 'react'
import { apiSetupRefresh, apiClearRefresh } from './api'
import LoginScreen                from './screens/LoginScreen'
import DashboardScreen            from './screens/DashboardScreen'
import UsuariosScreen             from './screens/UsuariosScreen'
import CatalogoProductosScreen    from './screens/CatalogoProductosScreen'
import ConfigGeneralScreen        from './screens/ConfigGeneralScreen'
import HistorialCajonScreen       from './screens/HistorialCajonScreen'
import TurnoCajaScreen            from './screens/TurnoCajaScreen'
import CortesCajaScreen           from './screens/CortesCajaScreen'
import RetirosCajaScreen          from './screens/RetirosCajaScreen'
import AreasScreen                from './screens/AreasScreen'
import MesasScreen                from './screens/MesasScreen'
import FormasPagoScreen           from './screens/FormasPagoScreen'
import FolioScreen                from './screens/FolioScreen'
import CambiarPinScreen           from './screens/CambiarPinScreen'
import ReportesScreen             from './screens/ReportesScreen'
import CuentasPorCobrarScreen     from './screens/CuentasPorCobrarScreen'
import SolicitudesPendientesScreen from './screens/SolicitudesPendientesScreen'
import ReglasCrossSellScreen       from './screens/ReglasCrossSellScreen'
import DashboardLiveScreen         from './screens/DashboardLiveScreen'
import MonitorVentasScreen         from './screens/MonitorVentasScreen'
import InformeDiaScreen            from './screens/InformeDiaScreen'
import ConsultaCuentasScreen       from './screens/ConsultaCuentasScreen'
import AuditoriaScreen             from './screens/AuditoriaScreen'
import BarraRapidaAdminScreen      from './screens/BarraRapidaAdminScreen'
import CentroOperacionScreen       from './screens/CentroOperacionScreen'
import PuntoVentaHomeScreen        from './screens/PuntoVentaHomeScreen'
import QRTabletScreen              from './screens/QRTabletScreen'
import MesaOperableScreen         from './screens/MesaOperableScreen'
import CambioUsuarioModal         from './components/CambioUsuarioModal'
import TopMenuBar                 from './components/TopMenuBar'
import EnConstruccionScreen       from './screens/EnConstruccionScreen'
import './App.css'

const SESSION_KEY = 'ba_admin_auth'
const LS_PANTALLA = 'ba_admin_ultima_pantalla'
const LS_SECCION  = 'ba_admin_seccion'

export default function App() {
  const [auth, setAuth]                     = useState(null)
  const [pantallaActual, setPantallaActual] = useState(
    () => localStorage.getItem(LS_PANTALLA) || 'pos-home'
  )
  const [pantallaNombre, setPantallaNombre] = useState('Mesas')
  const [modalCambioUser, setModalCambioUser] = useState(false)
  // Estado adicional para pantallas que necesitan un id contextual (ej. MesaOperable)
  const [mesaOperable, setMesaOperable]     = useState(null) // { mesaId, mesaNumero }

  // ── Helper: cuando el módulo api recibe nuevo token (refresh OK) o null (refresh falló)
  const handleTokenRefreshed = (nuevoToken) => {
    if (nuevoToken) {
      setAuth(prev => {
        if (!prev) return prev
        const next = { ...prev, token: nuevoToken }
        try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(next)) } catch {}
        return next
      })
    } else {
      // refresh falló — sesión muerta, logout
      handleLogout()
    }
  }

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(SESSION_KEY)
      if (s) {
        const p = JSON.parse(s)
        if (p.token) {
          setAuth(p)
          apiSetupRefresh(p.token, handleTokenRefreshed)
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'u') { e.preventDefault(); if (auth) setModalCambioUser(true) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [auth])

  const handleLogin = (data) => {
    const authObj = {
      token:  data.token,
      nombre: data.nombre ?? data.name ?? 'Admin',
      id:     data.id ?? data.usuarioId,
      rol:    data.rol ?? data.role ?? 'Admin',
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(authObj))
    setAuth(authObj)
    apiSetupRefresh(authObj.token, handleTokenRefreshed)
  }

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(LS_PANTALLA)
    localStorage.removeItem(LS_SECCION)
    apiClearRefresh()
    setAuth(null)
    setPantallaActual('pos-home')
    setPantallaNombre('Inicio')
  }

  const irPantalla = (screen, nombre, payload) => {
    if (screen === 'seg-cambio-usuario') { setModalCambioUser(true); return }
    if (screen === 'mesa-operable' && payload) {
      setMesaOperable({
        mesaId:     payload.mesaId,
        mesaNumero: payload.mesaNumero,
      })
    }
    setPantallaActual(screen)
    setPantallaNombre(nombre || screen)
    // No persistir 'mesa-operable' porque depende de un mesaId en memoria;
    // si el usuario recarga, debe volver a Mesas.
    if (screen !== 'mesa-operable') {
      localStorage.setItem(LS_PANTALLA, screen)
    } else {
      localStorage.setItem(LS_PANTALLA, 'pos-mesas')
    }
  }

  if (!auth) return <LoginScreen onLogin={handleLogin} />

  function renderPantalla() {
    switch (pantallaActual) {
      case 'pos-home':
        return <PuntoVentaHomeScreen auth={auth} onIrPantalla={irPantalla} />
      case 'pos-centro':
        return <CentroOperacionScreen auth={auth} onIrPantalla={irPantalla} />
      case 'pos-mesas':
      case 'dashboard':
        return <DashboardScreen auth={auth} onLogout={handleLogout} onIrPantalla={irPantalla} />
      case 'usuarios':
        return <UsuariosScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'cat-productos':
        return <CatalogoProductosScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'config-general':
        return <ConfigGeneralScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'historial-cajon':
        return <HistorialCajonScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'caja-apertura-turno':
      case 'caja-cierre-diario':
        return <TurnoCajaScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'caja-corte-x':
        return <CortesCajaScreen key="corte-x" auth={auth} tab="x" onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'caja-corte-z':
        return <CortesCajaScreen key="corte-z" auth={auth} tab="z" onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'caja-historico-cortes':
        return <CortesCajaScreen key="historico" auth={auth} tab="historico" onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'caja-incidentes':
        return <CortesCajaScreen key="incidentes" auth={auth} tab="incidentes" onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'caja-retiros':
        return <RetirosCajaScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'config-areas-venta':
        return <AreasScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'cat-mesas':
        return <MesasScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'config-formas-pago':
        return <FormasPagoScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'config-folios':
        return <FolioScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'seg-contrasena':
        return <CambiarPinScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'rep-ventas-resumen':
        return <ReportesScreen auth={auth} initialTab="ventas"     onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'rep-productos-top':
        return <ReportesScreen auth={auth} initialTab="productos"  onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'rep-ventas-mesera':
        return <ReportesScreen auth={auth} initialTab="meseros"    onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'rep-categorias':
        return <ReportesScreen auth={auth} initialTab="categorias" onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'rep-ventas-hora':
        return <ReportesScreen auth={auth} initialTab="hora"       onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'rep-metodos-pago':
        return <ReportesScreen auth={auth} initialTab="metodos"    onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'pos-barra':
        return auth.rol === 'Admin'
          ? <BarraRapidaAdminScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
          : <EnConstruccionScreen nombrePantalla="Acceso restringido" onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'cuentas-por-cobrar':
        return <CuentasPorCobrarScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'solicitudes-pendientes':
        return <SolicitudesPendientesScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'cat-reglas-crosssell':
        return <ReglasCrossSellScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'rep-monitor-ventas':
        return <MonitorVentasScreen auth={auth} />
      case 'rep-dashboard-live':
        return <DashboardLiveScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'rep-informe-dia':
        return <InformeDiaScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'consulta-cuentas':
        return <ConsultaCuentasScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'auditoriaScreen':
      case 'auditoria':
        return <AuditoriaScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'conectar-tablets':
        return <QRTabletScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'mesa-operable':
        if (!mesaOperable?.mesaId) {
          // Sin mesa seleccionada — volver al dashboard
          return <DashboardScreen auth={auth} onLogout={handleLogout} onIrPantalla={irPantalla} />
        }
        return (
          <MesaOperableScreen
            auth={auth}
            mesaId={mesaOperable.mesaId}
            mesaNumero={mesaOperable.mesaNumero}
            onVolver={() => { setMesaOperable(null); irPantalla('pos-mesas', 'Mesas') }}
          />
        )
      default:
        return (
          <EnConstruccionScreen
            nombrePantalla={pantallaNombre}
            onVolver={() => irPantalla('pos-mesas', 'Mesas')}
          />
        )
    }
  }

  const handleCambioUsuario = (data) => {
    const authObj = {
      token:  data.token,
      nombre: data.nombre ?? data.name ?? 'Admin',
      id:     data.id ?? data.usuarioId,
      rol:    data.rol ?? data.role ?? 'Admin',
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(authObj))
    setAuth(authObj)
    apiSetupRefresh(authObj.token, handleTokenRefreshed)
    setModalCambioUser(false)
    setPantallaActual('pos-home')
    setPantallaNombre('Inicio')
  }

  return (
    <div className="admin-shell">
      <TopMenuBar
        auth={auth}
        pantallaActual={pantallaActual}
        onIrPantalla={irPantalla}
        onLogout={handleLogout}
      />
      <main className="admin-content">
        {renderPantalla()}
      </main>
      {modalCambioUser && (
        <CambioUsuarioModal
          onLogin={handleCambioUsuario}
          onClose={() => setModalCambioUser(false)}
        />
      )}
    </div>
  )
}
