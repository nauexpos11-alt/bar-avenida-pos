import { useState, useEffect } from 'react'
import { api } from '../api'
import './CobrarCuentaModal.css'

function computarSubtotal(cuenta) {
  if (cuenta?.subtotal > 0) return cuenta.subtotal
  const ordenes = cuenta?.ordenes ?? []
  return ordenes.reduce((sum, orden) => {
    const detalles = orden.detalles ?? []
    return sum + detalles.reduce((s, d) => s + d.cantidad * (d.precioUnitario ?? 0), 0)
  }, 0)
}

function contarItems(cuenta) {
  return (cuenta?.ordenes ?? []).reduce((sum, orden) =>
    sum + (orden.detalles ?? []).reduce((s, d) => s + d.cantidad, 0), 0)
}

const METODOS = [
  { id: 'Efectivo', label: 'EFECTIVO', icon: '💵' },
  { id: 'Tarjeta',  label: 'TARJETA',  icon: '💳' },
  { id: 'Mixto',    label: 'MIXTO',    icon: '🔀' },
]

const RAPIDOS = [50, 100, 200, 500, 1000]

export default function CobrarCuentaModal({ cuenta, auth, onClose, onCobrado }) {
  const mesaNum   = cuenta?.mesaNumero ?? cuenta?.mesa?.numero ?? '?'
  const subtotal  = computarSubtotal(cuenta)
  const numItems  = contarItems(cuenta)

  // ── Estado principal ─────────────────────────────────────
  const [metodo,   setMetodo]   = useState('Efectivo')
  const [efRec,    setEfRec]    = useState('')
  const [efMixto,  setEfMixto]  = useState('')
  const [tarMixto, setTarMixto] = useState('')
  const [activo,   setActivo]   = useState('efRec')

  const [rfcOn, setRfcOn] = useState(false)
  const [rfc,   setRfc]   = useState('')
  const [razon, setRazon] = useState('')

  const [fase,      setFase]      = useState('form')
  const [resultado, setResultado] = useState(null)
  const [toast,     setToast]     = useState(null)

  // ── Cálculos derivados ───────────────────────────────────
  const montoTarjetaCalc =
    metodo === 'Tarjeta' ? subtotal :
    metodo === 'Mixto'   ? Number(tarMixto || 0) :
    0

  const comision = Math.round(montoTarjetaCalc * 0.05 * 100) / 100
  const total    = subtotal + comision

  const montoEfectivoCalc =
    metodo === 'Mixto' ? Number(efMixto || 0) : total

  const efNum  = Number(efRec || 0)
  const cambio =
    metodo === 'Efectivo' ? Math.max(0, efNum - total) :
    metodo === 'Tarjeta'  ? 0 :
    Math.max(0, efNum - montoEfectivoCalc)

  // ── Validación COBRAR ────────────────────────────────────
  const puedeCobrarse =
    total > 0 && (
      metodo === 'Tarjeta'  ? true :
      metodo === 'Efectivo' ? efNum >= total :
      Math.abs(Number(efMixto || 0) + Number(tarMixto || 0) - subtotal) <= 0.01 &&
      efNum >= montoEfectivoCalc
    )

  // ── Reset al cambiar método ──────────────────────────────
  useEffect(() => {
    setEfRec('')
    setEfMixto('')
    setTarMixto('')
    setActivo(metodo === 'Mixto' ? 'efMixto' : 'efRec')
  }, [metodo])

  // ── NumPad ───────────────────────────────────────────────
  const getSetter = () => {
    if (activo === 'efRec')    return setEfRec
    if (activo === 'efMixto')  return setEfMixto
    if (activo === 'tarMixto') return setTarMixto
    return setEfRec
  }

  const getValor = () => {
    if (activo === 'efRec')    return efRec
    if (activo === 'efMixto')  return efMixto
    if (activo === 'tarMixto') return tarMixto
    return efRec
  }

  const pushDigit = (val) => {
    const setter = getSetter()
    if (val === '⌫') {
      setter(prev => prev.slice(0, -1))
    } else if (val === '.') {
      setter(prev => prev.includes('.') ? prev : prev + '.')
    } else {
      setter(prev => {
        const next = prev + val
        const parts = next.split('.')
        if (parts[1]?.length > 2) return prev
        return next
      })
    }
  }

  const handleExacto = () => {
    if (activo === 'efRec')    setEfRec(total.toFixed(2))
    if (activo === 'efMixto')  setEfMixto(subtotal.toFixed(2))
    if (activo === 'tarMixto') setTarMixto('0.00')
  }

  const handleRapido = (monto) => {
    const setter = getSetter()
    setter(prev => (Number(prev || 0) + monto).toFixed(2))
  }

  // ── Cobrar ───────────────────────────────────────────────
  const handleCobrar = async () => {
    setFase('printing')
    setToast(null)

    const dto = {
      metodoPago:      metodo,
      montoEfectivo:   metodo === 'Mixto'    ? Number(efMixto  || 0) :
                       metodo === 'Efectivo' ? null : 0,
      montoTarjeta:    metodo === 'Mixto'    ? Number(tarMixto || 0) :
                       metodo === 'Tarjeta'  ? null : 0,
      efectivoRecibido: efNum,
      rfcCliente:       rfcOn && rfc   ? rfc   : null,
      razonSocialCliente: rfcOn && razon ? razon : null,
      descuento:        0,
    }

    try {
      const res = await api.cobrarCuenta(auth.token, cuenta.id, dto)
      setResultado(res)
      setFase('ok')
      setTimeout(() => onCobrado(res), 2200)
    } catch (e) {
      if (e.status === 503) {
        setFase('errImp')
      } else {
        setToast(e.message || 'Error de red')
        setFase('form')
      }
    }
  }

  const fmt = (n) =>
    `$${Number(n || 0).toLocaleString('es-MX', {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    })}`

  const mixtoSumaOk =
    !efMixto && !tarMixto
      ? null
      : Math.abs(Number(efMixto || 0) + Number(tarMixto || 0) - subtotal) <= 0.01

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="ccm-overlay">
      <div className="ccm-modal">

        {/* ── Header ── */}
        <div className="ccm-header">
          <span className="ccm-header-title">
            COBRAR CUENTA — Mesa {mesaNum}
            {auth?.nombre ? ` — ${auth.nombre}` : ''}
          </span>
          {fase === 'form' && (
            <button className="ccm-header-close" onClick={onClose}>✕</button>
          )}
        </div>

        {/* ── Body ── */}
        <div className="ccm-body">

          {/* Panel izquierdo */}
          <div className="ccm-izq">

            {/* Resumen */}
            <div className="ccm-resumen">
              <div className="ccm-res-row">
                <span>Productos</span>
                <span>{numItems} ítem{numItems !== 1 ? 's' : ''}</span>
              </div>
              <div className="ccm-res-row">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {comision > 0 && (
                <div className="ccm-res-row ccm-comision">
                  <span>Comisión 5% tarjeta</span>
                  <span>{fmt(comision)}</span>
                </div>
              )}
              <div className="ccm-sep" />
              <div className="ccm-res-row ccm-total-row">
                <span>TOTAL</span>
                <span className="ccm-total-val">{fmt(total)}</span>
              </div>
            </div>

            {/* Método de pago */}
            <div className="ccm-section-lbl">MÉTODO DE PAGO</div>
            <div className="ccm-metodos">
              {METODOS.map(m => (
                <button
                  key={m.id}
                  className={`ccm-metodo-btn${metodo === m.id ? ' ccm-metodo-sel' : ''}`}
                  onClick={() => setMetodo(m.id)}
                  disabled={fase !== 'form'}
                >
                  <span className="ccm-metodo-icon">{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* Mixto: sub-campos */}
            {metodo === 'Mixto' && (
              <div className="ccm-mixto">
                <div className="ccm-mixto-row">
                  <span className="ccm-mixto-lbl">Efectivo:</span>
                  <button
                    className={`ccm-mixto-inp${activo === 'efMixto' ? ' ccm-mixto-act' : ''}`}
                    onClick={() => setActivo('efMixto')}
                  >
                    {efMixto || '0.00'}
                  </button>
                </div>
                <div className="ccm-mixto-row">
                  <span className="ccm-mixto-lbl">Tarjeta:</span>
                  <button
                    className={`ccm-mixto-inp${activo === 'tarMixto' ? ' ccm-mixto-act' : ''}`}
                    onClick={() => setActivo('tarMixto')}
                  >
                    {tarMixto || '0.00'}
                  </button>
                </div>
                {mixtoSumaOk === false && (
                  <div className="ccm-mixto-warn">
                    Efectivo + Tarjeta debe sumar {fmt(subtotal)}
                  </div>
                )}
              </div>
            )}

            {/* Efectivo recibido y cambio */}
            {metodo !== 'Tarjeta' && (
              <div className="ccm-recibido">
                <div className="ccm-rec-row">
                  <span className="ccm-rec-lbl">Recibido</span>
                  <button
                    className={`ccm-rec-val${activo === 'efRec' ? ' ccm-rec-act' : ''}${
                      efNum > 0 && efNum < (metodo === 'Efectivo' ? total : montoEfectivoCalc)
                        ? ' ccm-rec-insuf' : ''
                    }`}
                    onClick={() => setActivo('efRec')}
                  >
                    {efRec || '0.00'}
                  </button>
                </div>
                <div className="ccm-rec-row">
                  <span className="ccm-rec-lbl">CAMBIO</span>
                  <span className={`ccm-cambio${cambio > 0 ? ' ccm-cambio-pos' : ''}`}>
                    {fmt(cambio)}
                  </span>
                </div>
              </div>
            )}

            {/* RFC */}
            <div className="ccm-rfc">
              <label className="ccm-rfc-toggle">
                <input
                  type="checkbox"
                  checked={rfcOn}
                  onChange={e => setRfcOn(e.target.checked)}
                  disabled={fase !== 'form'}
                />
                <span>Cliente solicita RFC</span>
              </label>
              {rfcOn && (
                <div className="ccm-rfc-campos">
                  <input
                    className="ccm-rfc-inp"
                    placeholder="RFC (ej. XAXX010101000)"
                    value={rfc}
                    onChange={e => setRfc(e.target.value.toUpperCase())}
                    maxLength={13}
                  />
                  <input
                    className="ccm-rfc-inp"
                    placeholder="Razón social"
                    value={razon}
                    onChange={e => setRazon(e.target.value)}
                  />
                </div>
              )}
            </div>

          </div>

          {/* Panel derecho — NumPad */}
          <div className="ccm-der">
            {metodo === 'Tarjeta' ? (
              <div className="ccm-tarjeta-info">
                <div className="ccm-tarjeta-ico">💳</div>
                <div className="ccm-tarjeta-txt">Pago completo con tarjeta</div>
                <div className="ccm-tarjeta-com">Comisión 5%: {fmt(comision)}</div>
                <div className="ccm-tarjeta-total">
                  Total a cobrar:<br />
                  <strong>{fmt(total)}</strong>
                </div>
              </div>
            ) : (
              <>
                <div className="ccm-np-lbl">
                  {activo === 'efRec'    ? 'Efectivo recibido' :
                   activo === 'efMixto'  ? 'Monto efectivo' :
                   'Monto tarjeta'}
                </div>
                <div className="ccm-display">
                  ${getValor() || '0.00'}
                </div>
                <div className="ccm-numpad">
                  {['7','8','9','4','5','6','1','2','3','0','.','⌫'].map(k => (
                    <button
                      key={k}
                      className={`ccm-np-btn${k === '⌫' ? ' ccm-np-del' : ''}`}
                      onClick={() => pushDigit(k)}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <div className="ccm-rapidos">
                  {activo === 'efRec' && (
                    <button className="ccm-rap-btn" onClick={handleExacto}>
                      Exacto
                    </button>
                  )}
                  {RAPIDOS.map(r => (
                    <button key={r} className="ccm-rap-btn" onClick={() => handleRapido(r)}>
                      +${r}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="ccm-footer">
          <button
            className="ccm-btn-cancel"
            onClick={onClose}
            disabled={fase !== 'form'}
          >
            Cancelar
          </button>
          {toast && <div className="ccm-toast-err">{toast}</div>}
          <button
            className="ccm-btn-cobrar"
            onClick={handleCobrar}
            disabled={!puedeCobrarse || fase !== 'form'}
          >
            🖨️ COBRAR E IMPRIMIR
          </button>
        </div>

        {/* ── Overlay de fase ── */}
        {fase !== 'form' && (
          <div className="ccm-fase-overlay">

            {fase === 'printing' && (
              <div className="ccm-fase-card">
                <div className="ccm-spinner" />
                <div className="ccm-fase-txt">IMPRIMIENDO...</div>
              </div>
            )}

            {fase === 'ok' && (
              <div className="ccm-fase-card ccm-fase-ok">
                <div className="ccm-fase-ico">✅</div>
                <div className="ccm-fase-txt">COBRADO</div>
                <div className="ccm-fase-folio">Folio #{resultado?.folio}</div>
                {(resultado?.cambio ?? 0) > 0 && (
                  <div className="ccm-fase-cambio">Cambio: {fmt(resultado.cambio)}</div>
                )}
                {resultado?.modoSimulado && (
                  <div className="ccm-fase-sim">
                    📄 Ticket simulado generado — verlo en Admin
                  </div>
                )}
              </div>
            )}

            {fase === 'errImp' && (
              <div className="ccm-fase-card ccm-fase-err">
                <div className="ccm-fase-ico">❌</div>
                <div className="ccm-fase-txt">ERROR DE IMPRESORA</div>
                <div className="ccm-fase-sub">La cuenta NO se cobró</div>
                <div className="ccm-fase-sub">Verifica la impresora y reintenta</div>
                <div className="ccm-fase-btns">
                  <button className="ccm-btn-reintentar" onClick={handleCobrar}>
                    Reintentar
                  </button>
                  <button className="ccm-btn-cancel-fase" onClick={onClose}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}
