import { useState, useEffect, useRef } from 'react'
import { api } from './api'
import { useEstadoConexion } from './hooks/useEstadoConexion'
import { sincronizarCola } from './lib/syncOfflineQueue'
import IndicadorConexion from './components/IndicadorConexion'
import LoginScreen from './screens/LoginScreen'
import MesasScreen from './screens/MesasScreen'
import CuentaScreen from './screens/CuentaScreen'
import ResumenCuentaScreen from './screens/ResumenCuentaScreen'
import VerPreciosScreen from './screens/VerPreciosScreen'
import BarraRapidaScreen from './screens/BarraRapidaScreen'
import './App.css'

const SESSION_KEY = 'ba_auth'

export default function App() {
  const [screen, setScreen]       = useState('login')
  const [auth, setAuth]           = useState(null)
  const [mesaCtx, setMesaCtx]     = useState(null)
  const [cuentaCtx, setCuentaCtx] = useState(null)
  const [toast, setToast]         = useState(null)

  const { online } = useEstadoConexion()
  const toastTimerRef = useRef(null)

  // Restaurar sesión
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.token) { setAuth(parsed); setScreen('mesas') }
      }
    } catch {}
  }, [])

  // Sync automático cuando vuelve la red
  useEffect(() => {
    if (!online) return
    sincronizarCola(api, null)
      .then(({ exitosas }) => {
        if (exitosas > 0)
          mostrarToast(
            `${exitosas} orden${exitosas !== 1 ? 'es' : ''} sincronizada${exitosas !== 1 ? 's' : ''}`,
            'verde'
          )
      })
      .catch(() => {})
  }, [online])

  // Toast cuando se encola una orden (CustomEvent desde api.js)
  useEffect(() => {
    const handler = () => mostrarToast('Sin conexión — orden encolada localmente', 'amarillo')
    window.addEventListener('orden-encolada', handler)
    return () => window.removeEventListener('orden-encolada', handler)
  }, [])

  function mostrarToast(msg, tipo) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ msg, tipo })
    toastTimerRef.current = setTimeout(() => setToast(null), 4000)
  }

  const handleLogin = (data) => {
    const authObj = {
      token:  data.token,
      nombre: data.nombre ?? data.name ?? 'Usuario',
      id:     data.id ?? data.usuarioId ?? data.userId,
      rol:    data.rol ?? data.role ?? '',
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(authObj))
    setAuth(authObj)
    setScreen('mesas')
  }

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setAuth(null)
    setMesaCtx(null)
    setCuentaCtx(null)
    setScreen('login')
  }

  const handleIrCuenta = (mesa, cuenta) => {
    setMesaCtx(mesa)
    setCuentaCtx(cuenta)
    setScreen('cuenta')
  }

  const handleIrResumen = (mesa, cuenta) => {
    setMesaCtx(mesa)
    setCuentaCtx(cuenta)
    setScreen('resumen')
  }

  const handleIrBarra = () => setScreen('barra-rapida')

  const handleVolverMesas = () => {
    setMesaCtx(null)
    setCuentaCtx(null)
    setScreen('mesas')
  }

  const handleVolverCuenta = () => {
    setScreen('cuenta')
  }

  const handleVerPrecios = () => {
    setScreen('ver-precios')
  }

  function renderScreen() {
    if (screen === 'login')
      return <LoginScreen onLogin={handleLogin} />

    if (screen === 'mesas')
      return (
        <MesasScreen
          auth={auth}
          onLogout={handleLogout}
          onIrCuenta={handleIrCuenta}
          onIrResumen={handleIrResumen}
          onVerPrecios={handleVerPrecios}
          onIrBarra={handleIrBarra}
        />
      )

    if (screen === 'cuenta')
      return (
        <CuentaScreen
          auth={auth}
          mesa={mesaCtx}
          cuenta={cuentaCtx}
          onVolver={handleVolverMesas}
          onCobrada={handleVolverMesas}
          onIrResumen={handleIrResumen}
        />
      )

    if (screen === 'resumen')
      return (
        <ResumenCuentaScreen
          auth={auth}
          mesa={mesaCtx}
          cuenta={cuentaCtx}
          onVolver={handleVolverCuenta}
          onIrMesas={handleVolverMesas}
          onCobrada={handleVolverMesas}
        />
      )

    if (screen === 'ver-precios')
      return (
        <VerPreciosScreen
          auth={auth}
          onVolver={handleVolverMesas}
        />
      )

    if (screen === 'barra-rapida')
      return (
        <BarraRapidaScreen
          auth={auth}
          onVolver={handleVolverMesas}
          onIrCuenta={handleIrCuenta}
        />
      )

    return null
  }

  return (
    <>
      {renderScreen()}

      {/* Indicador online/offline — visible en todas las pantallas excepto login */}
      {screen !== 'login' && (
        <div className="app-conexion-overlay">
          <IndicadorConexion />
        </div>
      )}

      {/* Toast global para encolado y sincronización */}
      {toast && (
        <div className={`app-toast app-toast-${toast.tipo}`}>
          {toast.msg}
        </div>
      )}
    </>
  )
}
