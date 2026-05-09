import { useState, useEffect } from 'react'
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
import InformeDiaScreen            from './screens/InformeDiaScreen'
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
    () => localStorage.getItem(LS_PANTALLA) || 'pos-mesas'
  )
  const [pantallaNombre, setPantallaNombre] = useState('Mesas')
  const [modalCambioUser, setModalCambioUser] = useState(false)

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(SESSION_KEY)
      if (s) { const p = JSON.parse(s); if (p.token) setAuth(p) }
    } catch {}
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
  }

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(LS_PANTALLA)
    localStorage.removeItem(LS_SECCION)
    setAuth(null)
    setPantallaActual('pos-mesas')
    setPantallaNombre('Mesas')
  }

  const irPantalla = (screen, nombre) => {
    if (screen === 'seg-cambio-usuario') { setModalCambioUser(true); return }
    setPantallaActual(screen)
    setPantallaNombre(nombre || screen)
    localStorage.setItem(LS_PANTALLA, screen)
  }

  if (!auth) return <LoginScreen onLogin={handleLogin} />

  function renderPantalla() {
    switch (pantallaActual) {
      case 'pos-mesas':
      case 'dashboard':
        return <DashboardScreen auth={auth} onLogout={handleLogout} />
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
      case 'cuentas-por-cobrar':
        return <CuentasPorCobrarScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'solicitudes-pendientes':
        return <SolicitudesPendientesScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'cat-reglas-crosssell':
        return <ReglasCrossSellScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'rep-dashboard-live':
        return <DashboardLiveScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
      case 'rep-informe-dia':
        return <InformeDiaScreen auth={auth} onVolver={() => irPantalla('pos-mesas', 'Mesas')} />
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
    setModalCambioUser(false)
    setPantallaActual('pos-mesas')
    setPantallaNombre('Mesas')
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
