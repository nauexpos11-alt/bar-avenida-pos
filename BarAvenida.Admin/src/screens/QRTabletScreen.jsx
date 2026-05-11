import { useState, useEffect } from 'react'
import { API_URL } from '../api'
import './QRTabletScreen.css'

export default function QRTabletScreen({ auth, onVolver }) {
  const [info, setInfo]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    cargarIp()
  }, [])

  const cargarIp = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${API_URL}/api/sistema/ip-real`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setInfo(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const generarQrUrl = (url) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=15&data=${encodeURIComponent(url)}`
  }

  const imprimir = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="qr-tablet-screen">
        <div className="qr-tablet-loading">Cargando IP del servidor...</div>
      </div>
    )
  }

  if (error || !info) {
    return (
      <div className="qr-tablet-screen">
        <div className="qr-tablet-error">
          <h3>No se pudo obtener la IP del servidor</h3>
          <p>{error || 'Error desconocido'}</p>
          <button onClick={cargarIp}>Reintentar</button>
          {onVolver && <button onClick={onVolver}>Volver</button>}
        </div>
      </div>
    )
  }

  const qrUrl = generarQrUrl(info.urlTablet)

  return (
    <div className="qr-tablet-screen">
      <div className="qr-tablet-no-print qr-tablet-header">
        <h2>Conectar tablets de meseras</h2>
        <div className="qr-tablet-actions">
          <button className="qr-btn-secundario" onClick={cargarIp}>Recargar IP</button>
          <button className="qr-btn-primario" onClick={imprimir}>Imprimir esta hoja</button>
          {onVolver && <button className="qr-btn-volver" onClick={onVolver}>Volver</button>}
        </div>
      </div>

      <div className="qr-tablet-hoja">
        <div className="qr-hoja-marca">
          <span className="qr-hoja-marca-bar">BAR AVENIDA</span>
        </div>

        <h1 className="qr-hoja-titulo">Conectar tu celular</h1>

        <div className="qr-hoja-codigo">
          <img src={qrUrl} alt="QR Code" />
        </div>

        <div className="qr-hoja-info">
          <div className="qr-hoja-ip">IP: <strong>{info.ip}</strong></div>
          <div className="qr-hoja-url">{info.urlTablet}</div>
        </div>

        <ol className="qr-hoja-pasos">
          <li>Conecta tu celular al <strong>WiFi del bar</strong></li>
          <li>Abre la <strong>cámara</strong> y apunta al QR</li>
          <li>Toca el link que aparece</li>
          <li>Haz login con tu <strong>código</strong> y <strong>PIN</strong></li>
          <li>Menú Chrome <strong>⋮</strong> → "Añadir a pantalla de inicio"</li>
        </ol>

        <div className="qr-hoja-pie">
          Una vez agregado al inicio, abre el ícono como cualquier app.
        </div>
      </div>

      {info.ipsCandidatas && info.ipsCandidatas.length > 1 && (
        <div className="qr-tablet-no-print qr-tablet-otras-ips">
          <strong>Otras IPs detectadas:</strong>
          <ul>
            {info.ipsCandidatas.map(ip => (
              <li key={ip}>{ip}{ip === info.ip ? ' (usada)' : ''}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
