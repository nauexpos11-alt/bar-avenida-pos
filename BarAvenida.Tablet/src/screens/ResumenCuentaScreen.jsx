import { useState, useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { api, API_URL } from '../api'
import CancelarProductoModal from '../components/CancelarProductoModal'
import './ResumenCuentaScreen.css'

// ── SVG Icons ──────────────────────────────────────────
function IcoMesa() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="rc-ico">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  )
}
function IcoCaptura() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="rc-ico">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}
function IcoCerrar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className="rc-ico">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}
function IcoCancelar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="rc-ico">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  )
}

// ── Helper: aplanar detalles de todas las órdenes ─────
function aplanarDetalles(cuenta) {
  const filas = []
  let mov = 1
  ;(cuenta?.ordenes ?? []).forEach((orden, oi) => {
    const detalles = orden.detalles ?? orden.ordenDetalles ?? []
    detalles.forEach(d => {
      const precio = d.precioUnitario ?? d.precio ?? 0
      filas.push({
        mov:          mov++,
        comanda:      orden.numeroOrden ?? (oi + 1),
        ordenFecha:   orden.fechaEnvio,
        esAgregado:   orden.esAgregado,
        cantidad:     d.cantidad,
        clave:        String(d.productoId ?? '—'),
        descripcion:  d.productoNombre ?? d.nombreProducto ?? d.producto?.nombre ?? '—',
        precio,
        importe:      d.cantidad * precio,
      })
    })
  })
  return filas
}

// ── Componente principal ────────────────────────────────
export default function ResumenCuentaScreen({
  auth, mesa, cuenta: cuentaInit, onVolver, onIrMesas, onCobrada,
}) {
  const [cuenta, setCuenta]                     = useState(cuentaInit)
  const [confirmCancelar, setConfirmCancelar]   = useState(false)
  const [motivoCancelar, setMotivoCancelar]     = useState('')
  const [cancelando, setCancelando]             = useState(false)
  const [showCancelarProd, setShowCancelarProd] = useState(false)
  const [solicitando, setSolicitando]           = useState(false)
  const [confirmCobro, setConfirmCobro]         = useState(false)
  const [toastMsg, setToastMsg]                 = useState(null)
  const [error, setError]                       = useState(null)
  const connRef = useRef(null)

  const filas    = aplanarDetalles(cuenta)
  const subtotal = filas.reduce((s, r) => s + r.importe, 0)
  const total    = cuenta?.total ?? subtotal

  const mesaNum  = mesa?.numero  ?? cuenta?.mesaNumero ?? cuenta?.mesa?.numero ?? '?'
  // Alias viene del backend (cuenta.nombreCliente o mesa.aliasCuenta)
  const aliasMesa = cuenta?.nombreCliente || mesa?.aliasCuenta || null
  const tituloMesa = aliasMesa || `MESA ${mesaNum}`
  // El area de la cuenta (puede ser distinta a la de la mesa fisica) tiene prioridad
  const area     = cuenta?.area ?? mesa?.areaCuenta ?? mesa?.areaNombre ?? mesa?.area ?? mesa?.zona ?? cuenta?.mesa?.area ?? '—'
  const personas = cuenta?.numeroPersonas ?? cuenta?.personas ?? '—'
  const folio    = cuenta?.id ?? '—'
  const apertura = cuenta?.fechaApertura ?? cuenta?.createdAt ?? null

  const esMiCuenta = !cuenta?.meseraId ||
    String(cuenta.meseraId) === String(auth.id)

  // ── SignalR ───────────────────────────────────────────
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/barhub`, { accessTokenFactory: () => auth.token })
      .withAutomaticReconnect([0, 2000, 5000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('CuentaActualizada', async (data) => {
      if (!data?.id || data.id === cuenta.id) {
        try {
          const updated = await api.getCuenta(cuenta.id, auth.token)
          setCuenta(updated)
        } catch {}
      }
    })

    conn.on('MesaPorCobrar', (mesaId) => {
      const thisMesaId = mesa?.id ?? cuenta?.mesaId
      if (mesaId === thisMesaId) onIrMesas()
    })

    // ── PROMPT B3 — Reaccionar a aprobación/rechazo de solicitud ──
    conn.on('SolicitudResuelta', async (payload) => {
      const thisMesaId = mesa?.id ?? cuenta?.mesaId
      if (payload?.mesaId !== thisMesaId) return

      // Si aprobaron la cancelación de la cuenta entera, regresa al grid
      if (payload.estado === 'Aprobada' && payload.tipo === 'Cuenta') {
        setToastMsg('🚫 Cuenta cancelada por el admin')
        setTimeout(() => onIrMesas(), 1200)
        return
      }

      // Cualquier otro caso: recarga la cuenta para reflejar productos cancelados
      // o el regreso al estado normal tras un rechazo
      try {
        const updated = await api.getCuenta(cuenta.id, auth.token)
        setCuenta(updated)
        if (payload.estado === 'Aprobada' && payload.tipo === 'Producto') {
          setToastMsg('✓ Productos cancelados por el admin')
          setTimeout(() => setToastMsg(null), 2500)
        }
      } catch {}
    })

    conn.start()
      .then(() => conn.invoke('UnirseAGrupo', 'Meseras').catch(() => {}))
      .catch(e => console.warn('SignalR Resumen:', e.message))
    connRef.current = conn
    return () => conn.stop()
  }, [auth.token, cuenta.id])

  // ── Solicitar cobro: abre modal de confirmacion ────
  const handleSolicitarCobro = () => {
    if (solicitando || !esMiCuenta) return
    setConfirmCobro(true)
  }

  // Confirmacion del modal: aqui sí ejecuta la llamada
  const ejecutarSolicitarCobro = async () => {
    if (solicitando) return
    setSolicitando(true)
    try {
      await api.solicitarCobro(auth.token, cuenta.id)
      setConfirmCobro(false)
      setToastMsg('Solicitud enviada al administrador')
      setTimeout(() => onIrMesas(), 1500)
    } catch (e) {
      setError(e.message || 'Error al solicitar cobro')
      setSolicitando(false)
      setConfirmCobro(false)
    }
  }

  // ── Solicitar cancelación de cuenta (va al admin para aprobación) ──
  const handleSolicitarCancelacion = async () => {
    if (!motivoCancelar) return
    setCancelando(true)
    try {
      await api.solicitarCancelacionCuenta(auth.token, cuenta.id, { motivo: motivoCancelar })
      setConfirmCancelar(false)
      setMotivoCancelar('')
      setToastMsg('✅ Solicitud de cancelación enviada al admin')
      setTimeout(() => onIrMesas(), 2000)
    } catch (e) {
      setError(e.message || 'Error al enviar solicitud')
      setCancelando(false)
    }
  }

  const pending = () => alert('Función pendiente')

  // ── Botones del header ────────────────────────────
  const headerRow1 = [
    { label: 'VER LA MESA',   Icon: IcoMesa,     action: onIrMesas,                                              cls: '' },
    { label: 'CAPTURA',       Icon: IcoCaptura,  action: onVolver,                                               cls: '' },
    { label: 'CANCELAR PROD', Icon: IcoCancelar, action: esMiCuenta ? () => setShowCancelarProd(true) : pending, cls: 'hbtn-danger', disabled: !esMiCuenta },
    { label: 'CERRAR',        Icon: IcoCerrar,   action: onVolver,                                               cls: '' },
  ]

  const headerRow2 = [
    {
      label:    solicitando ? 'ENVIANDO...' : '💵 SOLICITAR COBRO',
      Icon:     null,
      action:   handleSolicitarCobro,
      cls:      'hbtn-pagar',
      disabled: !esMiCuenta || solicitando || total === 0,
    },
  ]

  const MOTIVOS_CANCEL = [
    'Error en la comanda',
    'Cliente se retiró',
    'Mesa duplicada',
    'Prueba del sistema',
    'Otro',
  ]

  const bottomButtons = [
    { label: 'CANCELAR CUENTA', Icon: IcoCancelar, action: esMiCuenta ? () => { setMotivoCancelar(''); setConfirmCancelar(true) } : pending, cls: 'bbtn-danger', disabled: !esMiCuenta },
  ]

  return (
    <div className="rc-root">

      {/* ── Header fila 1 ── */}
      <div className="rc-hdr-row">
        {headerRow1.map(({ label, Icon, action, cls, disabled }) => (
          <button key={label} className={`rc-hbtn ${cls}`} onClick={action} disabled={!!disabled}>
            {Icon && <Icon />}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Header fila 2 ── */}
      <div className="rc-hdr-row rc-hdr-row2">
        {headerRow2.map(({ label, Icon, action, cls, disabled }) => (
          <button key={label} className={`rc-hbtn ${cls}`} onClick={action} disabled={!!disabled}>
            {Icon && <Icon />}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Aviso mesa de otra mesera ── */}
      {!esMiCuenta && (
        <div style={{
          background: '#1a1500', border: '1px solid #a0820d', color: '#f0c842',
          padding: '4px 14px', fontSize: '0.8rem', fontWeight: 700,
          letterSpacing: '0.06em', flexShrink: 0,
        }}>
          Mesa de {cuenta?.meseraNombre ?? 'otra mesera'} — solo puedes ver y capturar productos
        </div>
      )}

      {/* ── Info de la cuenta ── */}
      <div className="rc-info-bar">
        <div className="rc-info-group">
          <span className="rc-info-label">CUENTA</span>
          <span className="rc-info-val">{tituloMesa}</span>
        </div>
        <div className="rc-info-group">
          <span className="rc-info-label">ÁREA</span>
          <span className="rc-info-val">{area}</span>
        </div>
        <div className="rc-info-group">
          <span className="rc-info-label">MESERO</span>
          <span className="rc-info-val">{cuenta?.meseraNombre ?? auth.nombre}</span>
        </div>
        <div className="rc-info-group">
          <span className="rc-info-label">PERSONAS</span>
          <span className="rc-info-val">{personas}</span>
        </div>
        <div className="rc-info-group rc-info-folio">
          <span className="rc-info-label">FOLIO</span>
          <span className="rc-info-val">#{folio}</span>
        </div>
        {apertura && (
          <div className="rc-info-group">
            <span className="rc-info-label">APERTURA</span>
            <span className="rc-info-val rc-info-ts">
              {new Date(apertura).toLocaleString('es-MX', {
                dateStyle: 'short', timeStyle: 'short',
              })}
            </span>
          </div>
        )}
        <div className="rc-info-group rc-info-cierre">
          <span className="rc-info-label">CIERRE</span>
          <span className="rc-info-val rc-info-abierta">ABIERTA</span>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="rc-error-bar">
          ⚠ {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ── Tabla principal ── */}
      <div className="rc-tabla-wrapper">
        <table className="rc-tabla">
          <thead>
            <tr>
              <th className="th-mov rc-col-sm">MOV</th>
              <th className="th-cant">CANT</th>
              <th className="th-clave rc-col-md">CLAVE</th>
              <th className="th-desc">DESCRIPCIÓN</th>
              <th className="th-precio rc-col-md">PRECIO</th>
              <th className="th-imp">IMPORTE</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={6} className="rc-tabla-vacio">
                  Sin productos en esta cuenta
                </td>
              </tr>
            ) : (
              filas.flatMap((f, i) => {
                const isNuevaComanda = i === 0 || f.comanda !== filas[i - 1].comanda
                const hora = f.ordenFecha
                  ? new Date(f.ordenFecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                  : ''
                const rows = []
                if (isNuevaComanda) {
                  rows.push(
                    <tr key={`hdr-${f.comanda}`} className="rc-tr-comanda-header">
                      <td colSpan={6}>
                        Orden {f.comanda}{hora ? ` · ${hora}` : ''}{f.esAgregado ? ' (Agregado)' : ''}
                      </td>
                    </tr>
                  )
                }
                rows.push(
                  <tr key={i} className={i % 2 === 0 ? 'rc-tr-par' : 'rc-tr-impar'}>
                    <td className="td-mov rc-col-sm">{f.mov}</td>
                    <td className="td-cant">{f.cantidad}</td>
                    <td className="td-clave rc-col-md">{f.clave}</td>
                    <td className="td-desc">{f.descripcion}</td>
                    <td className="td-precio rc-col-md">${f.precio.toFixed(2)}</td>
                    <td className="td-imp">${f.importe.toFixed(2)}</td>
                  </tr>
                )
                return rows
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Bottom ── */}
      <div className="rc-bottom">

        <div className="rc-btns-grid">
          {bottomButtons.map(({ label, Icon, action, cls, disabled }) => (
            <button key={label} className={`rc-bbtn ${cls}`} onClick={action} disabled={!!disabled}>
              {Icon && <Icon />}
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="rc-totales">
          <div className="rc-total-row">
            <span className="rc-tl">SUBTOTAL</span>
            <span className="rc-tv">${subtotal.toFixed(2)}</span>
          </div>
          <div className="rc-total-row rc-total-final">
            <span className="rc-tl-total">TOTAL</span>
            <span className="rc-tv-total">${total.toFixed(2)}</span>
          </div>
          <button
            className="rc-btn-pagar"
            onClick={handleSolicitarCobro}
            disabled={total === 0 || !esMiCuenta || solicitando}
          >
            {solicitando ? '⏳ ENVIANDO...' : '💵 SOLICITAR COBRO'}
          </button>
        </div>
      </div>

      {/* ── Modal: Solicitar cancelación de cuenta ── */}
      {confirmCancelar && (
        <div className="modal-overlay"
          onClick={e => e.target === e.currentTarget && !cancelando && setConfirmCancelar(false)}>
          <div className="modal-box" style={{ maxWidth: 400 }}>
            <div className="modal-title" style={{ color: '#ef4444' }}>SOLICITAR CANCELACIÓN</div>
            <div className="modal-sub">
              {tituloMesa} — La solicitud se enviará al admin para autorización.
            </div>
            <div style={{ padding: '0 0 12px' }}>
              <label style={{ display: 'block', fontSize: '0.62rem', fontWeight: 800,
                letterSpacing: '0.14em', color: '#a0820d', marginBottom: 6 }}>
                MOTIVO
              </label>
              <select
                value={motivoCancelar}
                onChange={e => setMotivoCancelar(e.target.value)}
                style={{ width: '100%', background: '#1a1400', border: '1px solid #3a2a00',
                  color: '#f0c842', padding: '10px 12px', borderRadius: 6,
                  fontSize: '0.85rem', fontWeight: 600 }}
              >
                <option value="">— seleccionar —</option>
                {MOTIVOS_CANCEL.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" disabled={cancelando}
                onClick={() => setConfirmCancelar(false)}>
                CANCELAR
              </button>
              <button className="cs-btn-danger"
                disabled={!motivoCancelar || cancelando}
                onClick={handleSolicitarCancelacion}>
                {cancelando ? 'ENVIANDO...' : '📤 SOLICITAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Cancelar producto ── */}
      {showCancelarProd && (
        <CancelarProductoModal
          cuenta={cuenta}
          token={auth.token}
          onConfirmar={() => setShowCancelarProd(false)}
          onCancelar={() => setShowCancelarProd(false)}
        />
      )}

      {/* ── Modal: Confirmar solicitud de cobro ── */}
      {confirmCobro && (
        <div className="modal-overlay"
          onClick={e => e.target === e.currentTarget && !solicitando && setConfirmCobro(false)}>
          <div className="modal-box" style={{ maxWidth: 420, textAlign: 'center' }}>
            <div className="modal-title" style={{ color: '#d18cff' }}>¿SOLICITAR COBRO?</div>
            <div className="modal-sub">
              {tituloMesa} — Se enviará al admin para procesar el pago.
            </div>
            <div style={{
              fontSize: '2.2rem', fontWeight: 800, color: '#f0c842',
              marginTop: 16, marginBottom: 6, letterSpacing: '0.04em'
            }}>
              ${Number(total).toFixed(0)}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: 18 }}>
              Total a cobrar al cliente
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" disabled={solicitando}
                onClick={() => setConfirmCobro(false)}>
                CANCELAR
              </button>
              <button className="rc-btn-pagar"
                disabled={solicitando}
                onClick={ejecutarSolicitarCobro}
                style={{ minHeight: 56 }}>
                {solicitando ? '⏳ ENVIANDO...' : 'SI, SOLICITAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          background: '#064e3b', border: '1px solid #059669', color: '#6ee7b7',
          padding: '12px 24px', borderRadius: 8, fontSize: '1rem', fontWeight: 700,
          zIndex: 500, letterSpacing: '0.04em', whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          ✅ {toastMsg}
        </div>
      )}

    </div>
  )
}
