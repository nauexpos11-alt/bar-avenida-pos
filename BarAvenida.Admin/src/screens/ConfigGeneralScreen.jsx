import { useState, useEffect, useCallback } from 'react'
import { api, API_URL } from '../api'
import ToastContainer from '../components/Toast'
import Modal from '../components/Modal'
import PinAdminModal from '../components/PinAdminModal'
import ToggleSwitch from '../components/ToggleSwitch'
import './ConfigGeneralScreen.css'

const TAB_NEGOCIO   = 'negocio'
const TAB_IMPRESORA = 'impresora'
const TAB_CAJON     = 'cajon'

const EMPTY_CFG = {
  nombreNegocio: '', rfc: '', razonSocial: '', direccion: '', telefono: '', mensajePie: '',
  tipoConexion: 'USB', nombreImpresoraUsb: '', ipImpresora: '', puertoImpresora: 9100,
  abrirCajonAlCobrar: true, impresionHabilitada: true, anchoTicket: 32,
}

export default function ConfigGeneralScreen({ auth, onVolver }) {
  const [tab, setTab]                   = useState(TAB_NEGOCIO)
  const [cfg, setCfg]                   = useState(EMPTY_CFG)
  const [cargando, setCargando]         = useState(true)
  const [guardando, setGuardando]       = useState(false)
  const [toasts, setToasts]             = useState([])
  const [impresoras, setImpresoras]     = useState([])
  const [tickets, setTickets]           = useState([])
  const [registros, setRegistros]       = useState([])
  const [modalCajon, setModalCajon]     = useState(false)
  const [motivoCajon, setMotivoCajon]   = useState('')
  const [pinCajon,   setPinCajon]       = useState('')
  const [abriendo, setAbriendo]         = useState(false)
  const [imprimiendo, setImprimiendo]   = useState(false)
  const [pinModalGuardar, setPinModalGuardar] = useState(false)

  const toast = useCallback((mensaje, tipo = 'ok') => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, mensaje, tipo }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000)
  }, [])

  const cargarCfg = useCallback(async () => {
    try {
      const d = await api.adminGetConfiguracion(auth.token)
      setCfg({
        nombreNegocio:      d.nombreNegocio      ?? '',
        rfc:                d.rfc                 ?? '',
        razonSocial:        d.razonSocial         ?? '',
        direccion:          d.direccion           ?? '',
        telefono:           d.telefono            ?? '',
        mensajePie:         d.mensajePie          ?? '',
        tipoConexion:       d.tipoConexion        ?? 'USB',
        nombreImpresoraUsb: d.nombreImpresoraUsb  ?? '',
        ipImpresora:        d.ipImpresora         ?? '',
        puertoImpresora:    d.puertoImpresora     ?? 9100,
        abrirCajonAlCobrar: d.abrirCajonAlCobrar  ?? true,
        impresionHabilitada:d.impresionHabilitada ?? true,
        anchoTicket:        d.anchoTicket         ?? 32,
      })
    } catch (e) {
      toast('Error al cargar configuración: ' + e.message, 'error')
    } finally {
      setCargando(false)
    }
  }, [auth.token, toast])

  const cargarImpresoras = useCallback(async () => {
    try {
      const d = await api.adminGetImpresorasDisponibles(auth.token)
      setImpresoras(d.impresoras ?? [])
    } catch {}
  }, [auth.token])

  const cargarTickets = useCallback(async () => {
    try {
      const d = await api.adminGetTicketsSimulados(auth.token, 10)
      setTickets(d.tickets ?? [])
    } catch {}
  }, [auth.token])

  const cargarRegistros = useCallback(async () => {
    try {
      const d = await api.adminGetRegistrosCajon(auth.token)
      setRegistros(d ?? [])
    } catch {}
  }, [auth.token])

  useEffect(() => { cargarCfg() }, [cargarCfg])

  useEffect(() => {
    if (tab === TAB_IMPRESORA) { cargarImpresoras(); cargarTickets() }
    if (tab === TAB_CAJON)     { cargarRegistros() }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const cambiar = (campo, valor) => setCfg(c => ({ ...c, [campo]: valor }))

  // Validación local antes de pedir PIN. Si pasa, abre el modal de PIN admin.
  const guardar = () => {
    if (cfg.impresionHabilitada && cfg.tipoConexion === 'USB' && !cfg.nombreImpresoraUsb) {
      toast('Selecciona una impresora antes de habilitar la impresión', 'error')
      return
    }
    if (cfg.impresionHabilitada && cfg.tipoConexion === 'Red' && !cfg.ipImpresora) {
      toast('Ingresa la IP de la impresora antes de habilitar la impresión', 'error')
      return
    }
    setPinModalGuardar(true)
  }

  // Acción real después de validar el PIN admin
  const guardarConPin = async (pin) => {
    setGuardando(true)
    try {
      await api.adminUpdateConfiguracion(auth.token, {
        nombreNegocio:      cfg.nombreNegocio.trim(),
        direccion:          cfg.direccion.trim()        || null,
        telefono:           cfg.telefono.trim()         || null,
        rfc:                cfg.rfc.trim()              || null,
        razonSocial:        cfg.razonSocial.trim()      || null,
        mensajePie:         cfg.mensajePie.trim()       || null,
        tipoConexion:       cfg.tipoConexion,
        nombreImpresoraUsb: cfg.nombreImpresoraUsb.trim() || null,
        ipImpresora:        cfg.ipImpresora.trim()      || null,
        puertoImpresora:    Number(cfg.puertoImpresora),
        abrirCajonAlCobrar: cfg.abrirCajonAlCobrar,
        impresionHabilitada:cfg.impresionHabilitada,
        anchoTicket:        Number(cfg.anchoTicket),
      }, pin)
      toast('Configuración guardada')
      setPinModalGuardar(false)
    } catch (e) {
      // Si es error de PIN, lo mostramos inline en el modal
      throw e
    } finally {
      setGuardando(false)
    }
  }

  const imprimirPrueba = async () => {
    setImprimiendo(true)
    try {
      const d = await api.adminImprimirPrueba(auth.token)
      toast(d?.message ?? 'Ticket de prueba enviado')
      if (!cfg.impresionHabilitada) cargarTickets()
    } catch (e) {
      toast('Error: ' + e.message, 'error')
    } finally {
      setImprimiendo(false)
    }
  }

  const abrirCajonManual = async () => {
    setAbriendo(true)
    try {
      await api.adminAbrirCajon(auth.token, { motivo: motivoCajon.trim() || 'Manual', pin: pinCajon })
      toast('Cajón abierto')
      setModalCajon(false)
      setMotivoCajon('')
      setPinCajon('')
      cargarRegistros()
    } catch (e) {
      toast('Error: ' + e.message, 'error')
    } finally {
      setAbriendo(false)
    }
  }

  const abrirCarpeta = () => {
    if (window.electronAPI) window.electronAPI.abrirCarpetaTickets()
    else toast('Solo disponible en la app de escritorio', 'info')
  }

  const abrirTicket = async (baseName) => {
    try {
      const url  = `${API_URL}/api/admin/tickets-simulados/preview/${baseName}`
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${auth.token}` } })
      if (!resp.ok) throw new Error('No encontrado')
      const html    = await resp.text()
      const blob    = new Blob([html], { type: 'text/html' })
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, '_blank')
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
    } catch (e) {
      toast('Error al abrir ticket: ' + e.message, 'error')
    }
  }

  if (cargando) return <div className="cfg-loading">Cargando configuración...</div>

  return (
    <div className="cfg-screen">
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(ts => ts.filter(t => t.id !== id))} />

      <div className="cfg-header">
        <h2 className="cfg-titulo">Configuración general</h2>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button className="cfg-btn-guardar" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {onVolver && (
            <button onClick={onVolver} title="Volver al dashboard"
              style={{ background:'none', border:'none', color:'#666', fontSize:'1.1rem', cursor:'pointer', padding:'4px 8px', borderRadius:4 }}>✕</button>
          )}
        </div>
      </div>

      <div className="cfg-tabs">
        {[
          [TAB_NEGOCIO,   'Datos del negocio'],
          [TAB_IMPRESORA, 'Impresora'],
          [TAB_CAJON,     'Cajón de dinero'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`cfg-tab${tab === key ? ' activa' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="cfg-panel">
        {tab === TAB_NEGOCIO && (
          <TabNegocio cfg={cfg} cambiar={cambiar} />
        )}
        {tab === TAB_IMPRESORA && (
          <TabImpresora
            cfg={cfg}
            cambiar={cambiar}
            impresoras={impresoras}
            tickets={tickets}
            onImprimir={imprimirPrueba}
            imprimiendo={imprimiendo}
            onAbrirCarpeta={abrirCarpeta}
            onAbrirTicket={abrirTicket}
          />
        )}
        {tab === TAB_CAJON && (
          <TabCajon
            cfg={cfg}
            cambiar={cambiar}
            registros={registros}
            onAbrirModal={() => setModalCajon(true)}
          />
        )}
      </div>

      {pinModalGuardar && (
        <PinAdminModal
          titulo="Guardar configuración"
          mensaje="Estás por modificar la configuración global del POS. Confirma con tu PIN admin."
          confirmLabel={guardando ? 'Guardando…' : 'Guardar'}
          peligro
          onConfirm={guardarConPin}
          onCancel={() => { if (!guardando) setPinModalGuardar(false) }}
        />
      )}

      {modalCajon && (
        <Modal
          titulo="Abrir cajón manualmente"
          onClose={() => { setModalCajon(false); setMotivoCajon(''); setPinCajon('') }}
          accionLabel={abriendo ? 'Abriendo...' : 'Abrir cajón'}
          onAccion={abriendo ? undefined : abrirCajonManual}
        >
          <div className="modal-field">
            <label>Motivo (opcional)</label>
            <input
              className="cfg-input"
              value={motivoCajon}
              onChange={e => setMotivoCajon(e.target.value)}
              placeholder="Ej: Cambio de turno"
              autoFocus
            />
          </div>
          <div className="modal-field">
            <label>PIN (opcional)</label>
            <input
              className="cfg-input"
              type="password"
              maxLength={8}
              value={pinCajon}
              onChange={e => setPinCajon(e.target.value)}
              placeholder="••••"
              onKeyDown={e => { if (e.key === 'Enter' && !abriendo) abrirCajonManual() }}
            />
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Tab: Datos del negocio ────────────────────────────────────────────────────

function TabNegocio({ cfg, cambiar }) {
  return (
    <div className="cfg-form">
      <div className="cfg-row">
        <label>Nombre del negocio *</label>
        <input className="cfg-input" value={cfg.nombreNegocio}
          onChange={e => cambiar('nombreNegocio', e.target.value)} maxLength={100} />
      </div>
      <div className="cfg-row">
        <label>RFC</label>
        <input className="cfg-input" value={cfg.rfc}
          onChange={e => cambiar('rfc', e.target.value)} maxLength={20} />
      </div>
      <div className="cfg-row">
        <label>Razón social</label>
        <input className="cfg-input" value={cfg.razonSocial}
          onChange={e => cambiar('razonSocial', e.target.value)} maxLength={200}
          placeholder="VICTOR ALEJANDRO CORONADO SOLIS" />
      </div>
      <div className="cfg-row">
        <label>Dirección</label>
        <input className="cfg-input" value={cfg.direccion}
          onChange={e => cambiar('direccion', e.target.value)} maxLength={200} />
      </div>
      <div className="cfg-row">
        <label>Teléfono</label>
        <input className="cfg-input" value={cfg.telefono}
          onChange={e => cambiar('telefono', e.target.value)} maxLength={20} />
      </div>
      <div className="cfg-row">
        <label>Mensaje al pie del ticket</label>
        <textarea className="cfg-input cfg-textarea" value={cfg.mensajePie}
          onChange={e => cambiar('mensajePie', e.target.value)} maxLength={500} rows={3} />
      </div>
    </div>
  )
}

// ── Tab: Impresora ────────────────────────────────────────────────────────────

function TabImpresora({ cfg, cambiar, impresoras, tickets, onImprimir, imprimiendo, onAbrirCarpeta, onAbrirTicket }) {
  return (
    <div className="cfg-form">
      <div className="cfg-row cfg-row-toggle">
        <span className="cfg-label-toggle">Impresión habilitada</span>
        <ToggleSwitch
          checked={cfg.impresionHabilitada}
          onChange={v => cambiar('impresionHabilitada', v)}
        />
        <span className="cfg-hint">
          {cfg.impresionHabilitada
            ? 'Envía bytes a la impresora real'
            : 'Modo simulado — genera archivos en disco'}
        </span>
      </div>

      <div className="cfg-row">
        <label>Tipo de conexión</label>
        <div className="cfg-radio-group">
          {['USB', 'Red'].map(t => (
            <label key={t} className="cfg-radio">
              <input type="radio" name="tipoConexion" value={t}
                checked={cfg.tipoConexion === t}
                onChange={() => cambiar('tipoConexion', t)} />
              {t}
            </label>
          ))}
        </div>
      </div>

      {cfg.tipoConexion === 'USB' ? (
        <div className="cfg-row">
          <label>Impresora instalada</label>
          {impresoras.length > 0 ? (
            <select className="cfg-input cfg-select"
              value={cfg.nombreImpresoraUsb}
              onChange={e => cambiar('nombreImpresoraUsb', e.target.value)}
            >
              <option value="">— Seleccionar —</option>
              {impresoras.map(imp => (
                <option key={imp} value={imp}>{imp}</option>
              ))}
            </select>
          ) : (
            <input className="cfg-input" value={cfg.nombreImpresoraUsb}
              onChange={e => cambiar('nombreImpresoraUsb', e.target.value)}
              placeholder="Nombre exacto de la impresora" />
          )}
        </div>
      ) : (
        <>
          <div className="cfg-row">
            <label>IP de la impresora</label>
            <input className="cfg-input" value={cfg.ipImpresora}
              onChange={e => cambiar('ipImpresora', e.target.value)}
              placeholder="192.168.1.100" />
          </div>
          <div className="cfg-row">
            <label>Puerto</label>
            <input className="cfg-input cfg-input-sm" type="number" value={cfg.puertoImpresora}
              onChange={e => cambiar('puertoImpresora', e.target.value)} min={1} max={65535} />
          </div>
        </>
      )}

      <div className="cfg-row">
        <label>Ancho del ticket</label>
        <div className="cfg-radio-group">
          <label className="cfg-radio">
            <input type="radio" name="anchoTicket" value={32}
              checked={cfg.anchoTicket === 32}
              onChange={() => cambiar('anchoTicket', 32)} />
            58 mm (32 chars)
          </label>
          <label className="cfg-radio">
            <input type="radio" name="anchoTicket" value={48}
              checked={cfg.anchoTicket === 48}
              onChange={() => cambiar('anchoTicket', 48)} />
            80 mm (48 chars)
          </label>
        </div>
      </div>

      <div className="cfg-row cfg-row-accion">
        <button className="cfg-btn-prueba" onClick={onImprimir} disabled={imprimiendo}>
          {imprimiendo ? 'Imprimiendo...' : 'Imprimir ticket de prueba'}
        </button>
      </div>

      {!cfg.impresionHabilitada && (
        <div className="cfg-tickets-simulados">
          <div className="cfg-tickets-header">
            <span className="cfg-tickets-titulo">Últimos tickets simulados</span>
            <button className="cfg-btn-link" onClick={onAbrirCarpeta}>Abrir carpeta</button>
          </div>
          {tickets.length === 0 ? (
            <p className="cfg-vacio">No hay tickets simulados todavía.</p>
          ) : (
            <ul className="cfg-tickets-lista">
              {tickets.map(t => (
                <li key={t.baseName} className="cfg-ticket-item">
                  <span className="cfg-ticket-folio">#{t.folio}</span>
                  <span className="cfg-ticket-fecha">
                    {t.fecha ? new Date(t.fecha).toLocaleString('es-MX') : '—'}
                  </span>
                  <button className="cfg-btn-link" onClick={() => onAbrirTicket(t.baseName)}>
                    Ver
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab: Cajón ────────────────────────────────────────────────────────────────

function TabCajon({ cfg, cambiar, registros, onAbrirModal }) {
  return (
    <div className="cfg-form">
      <div className="cfg-row cfg-row-toggle">
        <span className="cfg-label-toggle">Abrir cajón al cobrar</span>
        <ToggleSwitch
          checked={cfg.abrirCajonAlCobrar}
          onChange={v => cambiar('abrirCajonAlCobrar', v)}
        />
        <span className="cfg-hint">No abre en pagos con tarjeta</span>
      </div>

      <div className="cfg-row cfg-row-accion">
        <button className="cfg-btn-prueba" onClick={onAbrirModal}>
          Abrir cajón manualmente
        </button>
      </div>

      <div className="cfg-registros">
        <span className="cfg-tickets-titulo">Registros del día</span>
        {registros.length === 0 ? (
          <p className="cfg-vacio">No hay aperturas registradas hoy.</p>
        ) : (
          <table className="cfg-tabla">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Usuario</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {registros.map(r => (
                <tr key={r.id}>
                  <td>{new Date(r.fecha).toLocaleTimeString('es-MX')}</td>
                  <td>{r.usuarioNombre}</td>
                  <td>{r.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
