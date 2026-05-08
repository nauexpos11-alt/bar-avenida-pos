import { useState, useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { api, API_URL } from '../api'
import CobrarCuentaModal from '../components/CobrarCuentaModal'
import './CuentasPorCobrarScreen.css'

function tiempoEspera(fechaApertura) {
  const minutos = Math.floor((Date.now() - new Date(fechaApertura).getTime()) / 60000)
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

export default function CuentasPorCobrarScreen({ auth, onVolver }) {
  const [cuentas, setCuentas]               = useState([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState(null)
  const [cuentaSeleccionada, setCuentaSel]  = useState(null)
  const [toastMsg, setToastMsg]             = useState(null)
  const [, setTick]                         = useState(0)
  const connRef = useRef(null)

  // Actualizar timer cada 30s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const cargarCuentas = async () => {
    try {
      const data = await api.adminGetCuentasPorCobrar(auth.token)
      setCuentas(Array.isArray(data) ? data : [])
      setError(null)
    } catch (e) {
      setError(e.message || 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargarCuentas() }, [])

  // ── SignalR ─────────────────────────────────────
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/barhub`, { accessTokenFactory: () => auth.token })
      .withAutomaticReconnect([0, 2000, 5000, 15000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('CuentaPorCobrar', () => cargarCuentas())
    conn.on('CuentaCobrada',   () => cargarCuentas())
    conn.on('CuentaCancelada', () => cargarCuentas())

    conn.start()
      .then(() => conn.invoke('UnirseAGrupo', 'Admin').catch(() => {}))
      .catch(e => console.warn('SignalR CuentasPorCobrar:', e.message))

    connRef.current = conn
    return () => conn.stop()
  }, [auth.token])

  const handleCobrado = () => {
    setCuentaSel(null)
    setToastMsg('Cuenta cobrada correctamente')
    setTimeout(() => setToastMsg(null), 3500)
    cargarCuentas()
  }

  return (
    <div className="cpc-root">

      {/* ── Header ── */}
      <div className="cpc-header">
        <button className="cpc-btn-volver" onClick={onVolver}>◀ VOLVER</button>
        <h1 className="cpc-titulo">💵 CUENTAS POR COBRAR</h1>
        <button className="cpc-btn-refresh" onClick={cargarCuentas} title="Recargar">
          ↻
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="cpc-error-bar">
          ⚠ {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ── Toast ── */}
      {toastMsg && (
        <div className="cpc-toast">✅ {toastMsg}</div>
      )}

      {/* ── Contenido ── */}
      <div className="cpc-body">
        {loading ? (
          <div className="cpc-loading">Cargando...</div>
        ) : cuentas.length === 0 ? (
          <div className="cpc-vacio">
            <div className="cpc-vacio-ico">🟢</div>
            <div className="cpc-vacio-txt">Sin cuentas pendientes de cobro</div>
            <div className="cpc-vacio-sub">Cuando una mesera solicite cobro, aparecerá aquí</div>
          </div>
        ) : (
          <div className="cpc-cards">
            {cuentas.map(cuenta => (
              <div key={cuenta.id} className="cpc-card">

                <div className="cpc-card-top">
                  <div className="cpc-folio">Folio #{cuenta.folio}</div>
                  <div className="cpc-espera">{tiempoEspera(cuenta.fechaApertura)} esperando</div>
                </div>

                <div className="cpc-mesa">Mesa {cuenta.mesaNumero}</div>

                <div className="cpc-card-info">
                  <div className="cpc-info-row">
                    <span className="cpc-lbl">Mesera</span>
                    <span className="cpc-val">{cuenta.meseraNombre}</span>
                  </div>
                  <div className="cpc-info-row">
                    <span className="cpc-lbl">Personas</span>
                    <span className="cpc-val">{cuenta.numeroPersonas}</span>
                  </div>
                  <div className="cpc-info-row">
                    <span className="cpc-lbl">Productos</span>
                    <span className="cpc-val">{cuenta.productosCount} ítem{cuenta.productosCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="cpc-total">{fmt(cuenta.total)}</div>

                <button
                  className="cpc-btn-cobrar"
                  onClick={() => setCuentaSel(cuenta)}
                >
                  💰 COBRAR
                </button>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal de cobro ── */}
      {cuentaSeleccionada && (
        <CobrarCuentaModal
          cuenta={cuentaSeleccionada}
          auth={auth}
          onClose={() => setCuentaSel(null)}
          onCobrado={handleCobrado}
        />
      )}

    </div>
  )
}
