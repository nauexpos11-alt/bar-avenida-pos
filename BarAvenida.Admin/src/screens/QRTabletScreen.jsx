import { useState, useEffect } from 'react'
import { API_URL } from '../api'
import './QRTabletScreen.css'

// Genera el string formato WIFI QR estandar (Android/iOS lo reconocen nativo)
// https://en.wikipedia.org/wiki/QR_code#Wi-Fi_network_login
function buildWifiString(ssid, password, seguridad = 'WPA') {
  if (!ssid) return null
  const escape = s => String(s || '').replace(/([\\;,:"])/g, '\\$1')
  const tipo = seguridad === 'nopass' ? 'nopass' : (seguridad === 'WEP' ? 'WEP' : 'WPA')
  const pw   = tipo === 'nopass' ? '' : `P:${escape(password)};`
  return `WIFI:T:${tipo};S:${escape(ssid)};${pw};`
}

const QR_SERVICES = [
  (u) => `https://quickchart.io/qr?text=${encodeURIComponent(u)}&size=400&margin=2&ecLevel=M`,
  (u) => `https://chart.googleapis.com/chart?cht=qr&chs=400x400&chld=M%7C2&chl=${encodeURIComponent(u)}`,
  (u) => `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=15&data=${encodeURIComponent(u)}`,
]

function cargarQR(url, setSrc, setFallo) {
  setFallo(false)
  if (!url) { setSrc(null); return }
  let idx = 0
  const probarSiguiente = () => {
    if (idx >= QR_SERVICES.length) { setFallo(true); setSrc(null); return }
    const src = QR_SERVICES[idx](url)
    const test = new Image()
    test.onload  = () => setSrc(src)
    test.onerror = () => { idx++; probarSiguiente() }
    test.src = src
  }
  probarSiguiente()
}

export default function QRTabletScreen({ auth, onVolver }) {
  const [info, setInfo]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // QR app (URL del tablet)
  const [qrApp, setQrApp]             = useState(null)
  const [qrAppFallo, setQrAppFallo]   = useState(false)

  // Config Wifi del bar
  const [ssid, setSsid]               = useState('')
  const [wifiPass, setWifiPass]       = useState('')
  const [wifiSec, setWifiSec]         = useState('WPA')
  const [editandoWifi, setEditandoWifi] = useState(false)
  const [guardandoWifi, setGuardando] = useState(false)
  const [verPass, setVerPass]         = useState(false)

  // QR Wifi
  const [qrWifi, setQrWifi]           = useState(null)
  const [qrWifiFallo, setQrWifiFallo] = useState(false)

  useEffect(() => {
    cargarIp()
    cargarWifi()
  }, [])

  useEffect(() => {
    if (info?.urlTablet) cargarQR(info.urlTablet, setQrApp, setQrAppFallo)
  }, [info?.urlTablet])

  useEffect(() => {
    const wifiStr = buildWifiString(ssid, wifiPass, wifiSec)
    cargarQR(wifiStr, setQrWifi, setQrWifiFallo)
  }, [ssid, wifiPass, wifiSec])

  const cargarIp = async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch(`${API_URL}/api/sistema/ip-real`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setInfo(await r.json())
    } catch (err) { setError(err.message) }
    finally       { setLoading(false) }
  }

  const cargarWifi = async () => {
    try {
      const r = await fetch(`${API_URL}/api/sistema/wifi-bar`)
      if (!r.ok) return
      const d = await r.json()
      setSsid(d.ssid || '')
      setWifiPass(d.password || '')
      setWifiSec(d.seguridad || 'WPA')
    } catch {}
  }

  const guardarWifi = async () => {
    setGuardando(true)
    try {
      const r = await fetch(`${API_URL}/api/sistema/wifi-bar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
        body: JSON.stringify({ ssid: ssid.trim(), password: wifiPass, seguridad: wifiSec }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setEditandoWifi(false)
    } catch (e) { alert('Error al guardar wifi: ' + e.message) }
    finally     { setGuardando(false) }
  }

  const imprimir = () => window.print()

  if (loading) return (<div className="qr-tablet-screen"><div className="qr-tablet-loading">Cargando IP del servidor...</div></div>)
  if (error || !info) return (
    <div className="qr-tablet-screen">
      <div className="qr-tablet-error">
        <h3>No se pudo obtener la IP del servidor</h3>
        <p>{error || 'Error desconocido'}</p>
        <button onClick={cargarIp}>Reintentar</button>
        {onVolver && <button onClick={onVolver}>Volver</button>}
      </div>
    </div>
  )

  const wifiConfigurado = ssid.trim().length > 0

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

      {/* Configurar wifi del bar (NO se imprime) */}
      <div className="qr-tablet-no-print" style={{
        background:'#1a1a1a', border:'1.5px solid #333', borderRadius:10,
        padding:'14px 18px', margin:'16px 24px', maxWidth:720,
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
          <div>
            <div style={{fontSize:'0.85rem', fontWeight:800, letterSpacing:'0.08em', color:'#f0c842'}}>
              📶 WIFI DEL BAR
            </div>
            <div style={{fontSize:'0.78rem', color:'#888', marginTop:4}}>
              {wifiConfigurado
                ? <>Red: <strong style={{color:'#fff'}}>{ssid}</strong> · seguridad: {wifiSec}</>
                : <span style={{color:'#fbbf24'}}>⚠ Sin configurar — las tablets no se conectaran solas</span>}
            </div>
          </div>
          <button
            onClick={() => setEditandoWifi(v => !v)}
            style={{
              background: editandoWifi ? '#333' : '#f0c842',
              color: editandoWifi ? '#aaa' : '#000',
              border:'none', borderRadius:6, padding:'8px 16px',
              fontWeight:800, cursor:'pointer', fontSize:'0.8rem',
            }}
          >{editandoWifi ? 'Cancelar' : (wifiConfigurado ? 'Editar' : 'Configurar')}</button>
        </div>

        {editandoWifi && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:10, marginTop:12, alignItems:'end'}}>
            <label style={{display:'flex', flexDirection:'column', gap:4}}>
              <span style={{fontSize:'0.7rem', color:'#aaa', fontWeight:700, letterSpacing:'0.06em'}}>NOMBRE DE LA RED (SSID)</span>
              <input type="text" value={ssid} onChange={e => setSsid(e.target.value)}
                placeholder="ej. INFINITUM5GHz" maxLength={32}
                style={{padding:'8px 10px', background:'#0a0a0a', border:'1.5px solid #444', borderRadius:6, color:'#fff'}} />
            </label>
            <label style={{display:'flex', flexDirection:'column', gap:4}}>
              <span style={{fontSize:'0.7rem', color:'#aaa', fontWeight:700, letterSpacing:'0.06em'}}>CONTRASEÑA</span>
              <div style={{display:'flex', gap:6}}>
                <input type={verPass ? 'text' : 'password'} value={wifiPass}
                  onChange={e => setWifiPass(e.target.value)}
                  placeholder="contraseña wifi" maxLength={63}
                  style={{flex:1, padding:'8px 10px', background:'#0a0a0a', border:'1.5px solid #444', borderRadius:6, color:'#fff'}} />
                <button onClick={() => setVerPass(v => !v)} type="button"
                  style={{background:'#333', border:'none', borderRadius:6, color:'#aaa', padding:'0 10px', cursor:'pointer'}}>
                  {verPass ? '🙈' : '👁'}
                </button>
              </div>
            </label>
            <label style={{display:'flex', flexDirection:'column', gap:4}}>
              <span style={{fontSize:'0.7rem', color:'#aaa', fontWeight:700, letterSpacing:'0.06em'}}>SEGURIDAD</span>
              <select value={wifiSec} onChange={e => setWifiSec(e.target.value)}
                style={{padding:'8px 10px', background:'#0a0a0a', border:'1.5px solid #444', borderRadius:6, color:'#fff'}}>
                <option value="WPA">WPA / WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">Sin contraseña</option>
              </select>
            </label>
            <button onClick={guardarWifi} disabled={guardandoWifi || !ssid.trim()}
              style={{
                gridColumn:'1 / -1', marginTop:8,
                background:'#f0c842', color:'#000', border:'none', borderRadius:6,
                padding:'10px', fontWeight:800, cursor:'pointer', fontSize:'0.85rem',
              }}>
              {guardandoWifi ? 'Guardando…' : '💾 Guardar wifi'}
            </button>
          </div>
        )}
      </div>

      {/* Hoja imprimible */}
      <div className="qr-tablet-hoja">
        <div className="qr-hoja-marca">
          <span className="qr-hoja-marca-bar">BAR AVENIDA</span>
        </div>

        <h1 className="qr-hoja-titulo">Conectar tu celular</h1>

        <div style={{
          display:'grid',
          gridTemplateColumns: wifiConfigurado ? '1fr 1fr' : '1fr',
          gap:24, margin:'16px 0',
        }}>
          {wifiConfigurado && (
            <div style={{textAlign:'center'}}>
              <div style={{
                fontSize:'0.78rem', fontWeight:900, letterSpacing:'0.18em',
                color:'#2563eb', marginBottom:8,
              }}>1️⃣ CONECTAR AL WIFI</div>
              <div className="qr-hoja-codigo" style={{margin:0}}>
                {qrWifi && !qrWifiFallo && <img src={qrWifi} alt="Wifi QR" />}
                {qrWifiFallo && (
                  <div style={{padding:'30px', textAlign:'center', border:'2px dashed #2563eb'}}>
                    <p style={{margin:0, fontSize:'12px'}}>QR no disponible (sin internet)</p>
                    <p style={{margin:'8px 0 0', fontSize:'13px', fontWeight:'bold'}}>
                      Red: {ssid}<br/>Pass: {wifiPass}
                    </p>
                  </div>
                )}
                {!qrWifi && !qrWifiFallo && <div style={{padding:'30px'}}>Generando…</div>}
              </div>
              <div style={{fontSize:'0.7rem', color:'#666', marginTop:6}}>
                Red: <strong>{ssid}</strong>
              </div>
            </div>
          )}

          <div style={{textAlign:'center'}}>
            <div style={{
              fontSize:'0.78rem', fontWeight:900, letterSpacing:'0.18em',
              color:'#f0c842', marginBottom:8,
            }}>{wifiConfigurado ? '2️⃣ ' : ''}ABRIR LA APP</div>
            <div className="qr-hoja-codigo" style={{margin:0}}>
              {qrApp && !qrAppFallo && <img src={qrApp} alt="App QR" />}
              {qrAppFallo && (
                <div style={{padding:'30px', textAlign:'center', border:'2px dashed #f0c842'}}>
                  <p style={{margin:0, fontSize:'12px'}}>QR no disponible (sin internet)</p>
                  <p style={{margin:'8px 0 0', fontSize:'14px', fontWeight:'bold'}}>{info.urlTablet}</p>
                </div>
              )}
              {!qrApp && !qrAppFallo && <div style={{padding:'30px'}}>Generando…</div>}
            </div>
            <div style={{fontSize:'0.7rem', color:'#666', marginTop:6}}>
              {info.urlTablet}
            </div>
          </div>
        </div>

        <div className="qr-hoja-info">
          <div className="qr-hoja-ip">IP: <strong>{info.ip}</strong></div>
        </div>

        <ol className="qr-hoja-pasos">
          {wifiConfigurado ? (
            <>
              <li>Abre la <strong>cámara</strong> del celular</li>
              <li>Apunta al <strong>QR azul</strong> → toca "Conectarse" al wifi</li>
              <li>Apunta al <strong>QR dorado</strong> → toca el link de la app</li>
              <li>Login con tu <strong>código</strong> y <strong>PIN</strong></li>
              <li>Chrome <strong>⋮</strong> → "Añadir a pantalla de inicio"</li>
            </>
          ) : (
            <>
              <li>Conecta tu celular al <strong>WiFi del bar</strong> manualmente</li>
              <li>Abre la <strong>cámara</strong> y apunta al QR dorado</li>
              <li>Toca el link que aparece</li>
              <li>Login con tu <strong>código</strong> y <strong>PIN</strong></li>
              <li>Chrome <strong>⋮</strong> → "Añadir a pantalla de inicio"</li>
            </>
          )}
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
