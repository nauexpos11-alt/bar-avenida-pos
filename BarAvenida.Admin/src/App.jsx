import { useState, useEffect } from 'react'
import LoginScreen                from './screens/LoginScreen'
import DashboardScreen            from './screens/DashboardScreen'
import UsuariosScreen             from './screens/UsuariosScreen'
import CatalogoProductosScreen    from './screens/CatalogoProductosScreen'
import ConfigGeneralScreen        from './screens/ConfigGeneralScreen'
import HistorialCajonScreen       from './screens/HistorialCajonScreen'
import ConsultaCuentasScreen      from './screens/ConsultaCuentasScreen'
import TurnoCajaScreen            from './screens/TurnoCajaScreen'
import CortesCajaScreen           from './screens/CortesCajaScreen'
import RetirosCajaScreen          from './screens/RetirosCajaScreen'
import AreasScreen                from './screens/AreasScreen'
import MesasScreen                from './screens/MesasScreen'
import MeserosScreen              from './screens/MeserosScreen'
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

export default function App() {
  const [auth, setAuth]                     = useState(null)
  const [pantallaActual, setPantallaActual] = useState('dashboard')
  const [pantallaNombre, setPantallaNombre] = useState('Dashboard')
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
    setAuth(null)
    setPantallaActual('dashboard')
    setPantallaNombre('Dashboard')
  }

  const irPantalla = (screen, nombre) => {
    if (screen === 'seg-cambio-usuario') { setModalCambioUser(true); return }
    setPantallaActual(screen)
    setPantallaNombre(nombre || screen)
  }

  if (!auth) return <LoginScreen onLogin={handleLogin} />

  function renderPantalla() {
    switch (pantallaActual) {
      case 'dashboard':
        return <DashboardScreen auth={auth} onLogout={handleLogout} />
      case 'usuarios':
        return <UsuariosScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'cat-productos':
        return <CatalogoProductosScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'config-general':
        return <ConfigGeneralScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'historial-cajon':
        return <HistorialCajonScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'cons-cuentas':
        return <ConsultaCuentasScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'caja-apertura-turno':
      case 'caja-cierre-diario':
        return <TurnoCajaScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'caja-corte-x':
        return <CortesCajaScreen key="corte-x" auth={auth} tab="x" onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'caja-corte-z':
        return <CortesCajaScreen key="corte-z" auth={auth} tab="z" onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'caja-historico-cortes':
        return <CortesCajaScreen key="historico" auth={auth} tab="historico" onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'caja-incidentes':
        return <CortesCajaScreen key="incidentes" auth={auth} tab="incidentes" onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'caja-retiros':
        return <RetirosCajaScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'config-areas-venta':
        return <AreasScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'cat-mesas':
        return <MesasScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'cat-meseros':
        return <MeserosScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'config-formas-pago':
        return <FormasPagoScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'config-folios':
        return <FolioScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'seg-contrasena':
        return <CambiarPinScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'rep-ventas-resumen':
        return <ReportesScreen auth={auth} initialTab="ventas"    onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'rep-productos-top':
        return <ReportesScreen auth={auth} initialTab="productos" onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'rep-ventas-mesera':
        return <ReportesScreen auth={auth} initialTab="meseros"   onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'rep-categorias':
        return <ReportesScreen auth={auth} initialTab="categorias" onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'rep-ventas-hora':
        return <ReportesScreen auth={auth} initialTab="hora"      onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'rep-metodos-pago':
        return <ReportesScreen auth={auth} initialTab="metodos"   onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'cuentas-por-cobrar':
        return <CuentasPorCobrarScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'solicitudes-pendientes':
        return <SolicitudesPendientesScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'cat-reglas-crosssell':
        return <ReglasCrossSellScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'ventas-rapido':
        return <CuentasPorCobrarScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'rep-dashboard-live':
        return <DashboardLiveScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      case 'rep-informe-dia':
        return <InformeDiaScreen auth={auth} onVolver={() => irPantalla('dashboard', 'Dashboard')} />
      default:
        return (
          <EnConstruccionScreen
            nombrePantalla={pantallaNombre}
            onVolver={() => irPantalla('dashboard', 'Dashboard')}
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
    setPantallaActual('dashboard')
    setPantallaNombre('Dashboard')
  }

  return (
    <div className="admin-shell">
      <TopMenuBar
        auth={auth}
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
