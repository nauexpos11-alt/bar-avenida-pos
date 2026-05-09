import { useState, useCallback, useEffect, useMemo } from 'react'
import { api } from '../api'
import ToastContainer from '../components/Toast'
import CancelarCobradaModal from '../components/CancelarCobradaModal'
import ReabrirCuentaModal from '../components/ReabrirCuentaModal'
import './ConsultaCuentasScreen.css'

const fmt = n => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function fmtFecha(d) {
  if (!d) return '—'
  const dt = new Date(d)
  const h = String(dt.getHours()).padStart(2, '0')
  const m = String(dt.getMinutes()).padStart(2, '0')
  return `${dt.getDate()}/${MESES[dt.getMonth()]} ${h}:${m}`
}

function fmtDuracion(apertura, cierre) {
  if (!apertura || !cierre) return ''
  const mins = Math.round((new Date(cierre) - new Date(apertura)) / 60000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60), m = mins % 60
  return `${h}h${m > 0 ? ` ${m}m` : ''}`
}

function rangoFecha(tipo) {
  const hoy = new Date()
  if (tipo === 'hoy') return {
    desde: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0),
    hasta:  new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59),
  }
  if (tipo === 'ayer') {
    const d = new Date(hoy); d.setDate(d.getDate() - 1)
    return {
      desde: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0),
      hasta:  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59),
    }
  }
  if (tipo === 'semana') {
    const d = new Date(hoy); d.setDate(d.getDate() - 7)
    return {
      desde: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0),
      hasta:  new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59),
    }
  }
  return { desde: null, hasta: null }
}

const LS_KEY  = 'ba_historico_filtros'
const PAGE    = 50

const FILTROS_DEFAULT = { tipofecha: 'hoy', estado: 'Cobrada', meseraId: '', folio: '', desdeCustom: '', hastaCustom: '' }

function cargarFiltros() {
  try { const s = localStorage.getItem(LS_KEY); if (s) return { ...FILTROS_DEFAULT, ...JSON.parse(s) } } catch {}
  return FILTROS_DEFAULT
}
function guardarFiltros(f) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(f)) } catch {}
}

const BADGE = {
  Cobrada:   { cls: 'hc-badge-cobrada',   label: '✓ Cobrada' },
  Cancelada: { cls: 'hc-badge-cancelada', label: '✕ Cancelada' },
  Abierta:   { cls: 'hc-badge-abierta',   label: '● Abierta' },
  PorCobrar: { cls: 'hc-badge-porcobrar', label: '💵 Por cobrar' },
}

// ─── Panel de detalle (componente interno) ──────────────────────────────────
function DetallePanel({ detalle, onReimprimir, onCancelar, onReabrir, onFacturar }) {
  const badge = BADGE[detalle.estado] || { cls: '', label: detalle.estado }
  const duracion = fmtDuracion(detalle.fechaApertura, detalle.fechaCierre)
  const esCobrada = detalle.estado === 'Cobrada'

  return (
    <div className="hc-det-wrap">
      {/* Título del detalle */}
      <div className="hc-det-titulo">
        <span>FOLIO #{String(detalle.folio).padStart(4, '0')} — {detalle.mesaNumero}</span>
        <span className={`hc-badge ${badge.cls}`}>{badge.label}</span>
      </div>

      {/* Meta */}
      <div className="hc-det-meta">
        <div className="hc-meta-row">
          <span className="hc-meta-lbl">Mesera</span>
          <span>{detalle.meseraNombre}</span>
        </div>
        <div className="hc-meta-row">
          <span className="hc-meta-lbl">Apertura</span>
          <span>{fmtFecha(detalle.fechaApertura)}</span>
        </div>
        <div className="hc-meta-row">
          <span className="hc-meta-lbl">Cierre</span>
          <span>{fmtFecha(detalle.fechaCierre)}{duracion ? ` (${duracion})` : ''}</span>
        </div>
        {detalle.metodoPago && (
          <div className="hc-meta-row">
            <span className="hc-meta-lbl">Forma de pago</span>
            <span>
              {detalle.metodoPago}
              {detalle.comisionTarjeta > 0 && ' + 5% comisión'}
            </span>
          </div>
        )}
        {detalle.motivoCancelacion && (
          <div className="hc-meta-row">
            <span className="hc-meta-lbl">Motivo cancelación</span>
            <span className="hc-meta-motivo">{detalle.motivoCancelacion}</span>
          </div>
        )}
        {detalle.fechaCancelacion && (
          <div className="hc-meta-row">
            <span className="hc-meta-lbl">Fecha cancelación</span>
            <span>{fmtFecha(detalle.fechaCancelacion)}</span>
          </div>
        )}
      </div>

      {/* Órdenes agrupadas */}
      {detalle.ordenes?.length > 0 && (
        <>
          <div className="hc-det-sec">PRODUCTOS POR ORDEN</div>
          <div className="hc-ordenes">
            {detalle.ordenes.map(o => (
              <div key={o.id} className="hc-orden">
                <div className="hc-orden-head">
                  Orden #{o.numeroOrden} · {fmtFecha(o.fechaEnvio)}
                  {o.esAgregado && <span className="hc-orden-agr">Agregado</span>}
                </div>
                {o.detalles?.map(d => (
                  <div key={d.id} className="hc-orden-det">
                    <span className="hc-od-cant">{d.cantidad}×</span>
                    <span className="hc-od-prod">{d.productoNombre}</span>
                    <span className="hc-od-sub">{fmt(d.subtotal)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Totales */}
      <div className="hc-det-totales">
        <div className="hc-dt-row">
          <span>Subtotal</span><span>{fmt(detalle.subtotal)}</span>
        </div>
        {detalle.descuento > 0 && (
          <div className="hc-dt-row">
            <span>Descuento</span><span className="hc-dt-neg">−{fmt(detalle.descuento)}</span>
          </div>
        )}
        {detalle.comisionTarjeta > 0 && (
          <div className="hc-dt-row">
            <span>Comisión 5%</span><span>{fmt(detalle.comisionTarjeta)}</span>
          </div>
        )}
        <div className="hc-dt-row hc-dt-total">
          <span>TOTAL</span><span>{fmt(detalle.total)}</span>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="hc-acciones">
        <button className="hc-acc-btn hc-acc-reimp" onClick={onReimprimir}>
          🖨<br />REIMP.<br />TICKET
        </button>
        <button
          className="hc-acc-btn hc-acc-cancelar"
          onClick={onCancelar}
          disabled={!esCobrada}
          title={!esCobrada ? 'Solo disponible para cuentas cobradas' : ''}
        >
          ✕<br />CANCELAR<br />FOLIO
        </button>
        <button
          className="hc-acc-btn hc-acc-factura"
          onClick={onFacturar}
          disabled={!esCobrada}
          title={!esCobrada ? 'Solo disponible para cuentas cobradas' : ''}
        >
          📄<br />FACTURAR
        </button>
        <button
          className="hc-acc-btn hc-acc-reabrir"
          onClick={onReabrir}
          disabled={!esCobrada}
          title={!esCobrada ? 'Solo disponible para cuentas cobradas' : ''}
        >
          🔓<br />REABRIR
        </button>
      </div>
    </div>
  )
}

// ─── Pantalla principal ─────────────────────────────────────────────────────
export default function ConsultaCuentasScreen({ auth, onVolver }) {
  const [filtros, setFiltros]         = useState(cargarFiltros)
  const [cuentas, setCuentas]         = useState([])
  const [cargando, setCargando]       = useState(false)
  const [selId, setSelId]             = useState(null)
  const [detalle, setDetalle]         = useState(null)
  const [cargandoDet, setCargandoDet] = useState(false)
  const [meseras, setMeseras]         = useState([])
  const [pagina, setPagina]           = useState(PAGE)
  const [toasts, setToasts]           = useState([])
  const [modalCancelar, setModalCancelar] = useState(false)
  const [modalReabrir, setModalReabrir]   = useState(false)

  const toast = useCallback((msg, tipo = 'ok') => {
    const id = Date.now()
    setToasts(ts => [...ts, { id, mensaje: msg, tipo }])
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4500)
  }, [])

  useEffect(() => {
    api.adminGetMeseros(auth.token)
      .then(data => setMeseras(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [auth.token])

  const buscar = useCallback(async (f) => {
    const filtrosActuales = f ?? filtros
    guardarFiltros(filtrosActuales)
    setCargando(true)
    try {
      const params = {}
      if (filtrosActuales.tipofecha === 'custom') {
        if (filtrosActuales.desdeCustom) params.desde = new Date(filtrosActuales.desdeCustom).toISOString()
        if (filtrosActuales.hastaCustom) {
          const h = new Date(filtrosActuales.hastaCustom)
          h.setHours(23, 59, 59)
          params.hasta = h.toISOString()
        }
      } else {
        const rango = rangoFecha(filtrosActuales.tipofecha)
        if (rango.desde) params.desde = rango.desde.toISOString()
        if (rango.hasta) params.hasta = rango.hasta.toISOString()
      }
      if (filtrosActuales.estado)    params.estado   = filtrosActuales.estado
      if (filtrosActuales.folio)     params.folio    = parseInt(filtrosActuales.folio)
      if (filtrosActuales.meseraId)  params.meseraId = parseInt(filtrosActuales.meseraId)

      const data = await api.getCuentasFiltradas(auth.token, params)
      setCuentas(Array.isArray(data) ? data : [])
      setPagina(PAGE)
    } catch (e) {
      toast('Error al buscar cuentas: ' + e.message, 'error')
    } finally {
      setCargando(false)
    }
  }, [auth.token, filtros, toast])

  useEffect(() => { buscar(filtros) }, []) // eslint-disable-line

  const setFiltro = (key, val) => setFiltros(f => ({ ...f, [key]: val }))

  const aplicarFiltro = (key, val) => {
    const nuevo = { ...filtros, [key]: val }
    setFiltros(nuevo)
    buscar(nuevo)
  }

  const limpiar = () => {
    setFiltros(FILTROS_DEFAULT)
    buscar(FILTROS_DEFAULT)
  }

  const cargarDetalle = useCallback(async (id) => {
    if (selId === id) return
    setSelId(id)
    setDetalle(null)
    setCargandoDet(true)
    try {
      const data = await api.adminGetCuentaDetalle(auth.token, id)
      setDetalle(data)
    } catch (e) {
      toast('Error al cargar detalle: ' + e.message, 'error')
    } finally {
      setCargandoDet(false)
    }
  }, [auth.token, selId, toast])

  const cuentasVisibles = useMemo(() => cuentas.slice(0, pagina), [cuentas, pagina])

  const totales = useMemo(() => ({
    bruto:     cuentas.reduce((s, c) => s + (c.total || 0), 0),
    pagado:    cuentas.filter(c => c.estado === 'Cobrada').reduce((s, c) => s + (c.total || 0), 0),
    cancelado: cuentas.filter(c => c.estado === 'Cancelada').reduce((s, c) => s + (c.total || 0), 0),
  }), [cuentas])

  const handleReimprimir = async () => {
    try {
      await api.adminReimprimirCuenta(auth.token, detalle.id)
      toast('Ticket reimpreso', 'ok')
    } catch (e) {
      toast('Error al reimprimir: ' + e.message, 'error')
    }
  }

  const handleCancelarOk = async (motivo) => {
    try {
      await api.cancelarCobrada(auth.token, detalle.id, motivo)
      toast(`Folio #${String(detalle.folio).padStart(4,'0')} cancelado`, 'ok')
      setModalCancelar(false)
      setDetalle(d => d ? { ...d, estado: 'Cancelada', motivoCancelacion: motivo, fechaCancelacion: new Date().toISOString() } : d)
      buscar()
    } catch (e) {
      toast('Error: ' + e.message, 'error')
    }
  }

  const handleReabrirOk = async () => {
    try {
      await api.reabrirCuenta(auth.token, detalle.id)
      toast(`Folio #${String(detalle.folio).padStart(4,'0')} reabierto`, 'ok')
      setModalReabrir(false)
      setSelId(null)
      setDetalle(null)
      buscar()
    } catch (e) {
      toast('Error: ' + e.message, 'error')
    }
  }

  const FECHAS = [
    { key: 'hoy',    label: 'Hoy' },
    { key: 'ayer',   label: 'Ayer' },
    { key: 'semana', label: 'Semana' },
    { key: 'custom', label: 'Rango' },
  ]

  return (
    <div className="hc-screen">
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(ts => ts.filter(t => t.id !== id))} />

      {/* Header */}
      <div className="hc-header">
        <div>
          <h2 className="hc-titulo">HISTÓRICO DE CUENTAS</h2>
          <div className="hc-breadcrumb">ADMINISTRACIÓN › REPORTES › Histórico de cuentas</div>
        </div>
        {onVolver && <button className="hc-btn-x" onClick={onVolver}>✕</button>}
      </div>

      {/* Filtros */}
      <div className="hc-filtros">
        <div className="hc-filtros-row">
          {/* Selector de fecha */}
          <div className="hc-campo">
            <label className="hc-lbl">Fecha</label>
            <div className="hc-tabs-f">
              {FECHAS.map(f => (
                <button
                  key={f.key}
                  className={`hc-tab-f${filtros.tipofecha === f.key ? ' hc-tab-f-act' : ''}`}
                  onClick={() => filtros.tipofecha === f.key ? null : aplicarFiltro('tipofecha', f.key)}
                  disabled={cargando}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rango custom */}
          {filtros.tipofecha === 'custom' && (
            <>
              <div className="hc-campo">
                <label className="hc-lbl">Desde</label>
                <input type="date" className="hc-input" value={filtros.desdeCustom}
                  onChange={e => setFiltro('desdeCustom', e.target.value)} />
              </div>
              <div className="hc-campo">
                <label className="hc-lbl">Hasta</label>
                <input type="date" className="hc-input" value={filtros.hastaCustom}
                  onChange={e => setFiltro('hastaCustom', e.target.value)} />
              </div>
            </>
          )}

          {/* Estado */}
          <div className="hc-campo">
            <label className="hc-lbl">Estado</label>
            <select className="hc-input" value={filtros.estado}
              onChange={e => aplicarFiltro('estado', e.target.value)}>
              <option value="">Todos</option>
              <option value="Cobrada">Cobradas</option>
              <option value="Cancelada">Canceladas</option>
              <option value="Abierta">Abiertas</option>
            </select>
          </div>

          {/* Mesera */}
          <div className="hc-campo">
            <label className="hc-lbl">Mesera</label>
            <select className="hc-input" value={filtros.meseraId}
              onChange={e => aplicarFiltro('meseraId', e.target.value)}>
              <option value="">Todas</option>
              {meseras.map(m => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>

          {/* Folio */}
          <div className="hc-campo hc-campo-sm">
            <label className="hc-lbl">Folio #</label>
            <input
              type="number"
              className="hc-input"
              placeholder="Ej: 42"
              value={filtros.folio}
              onChange={e => setFiltro('folio', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscar()}
            />
          </div>

          <button className="hc-btn-buscar" onClick={() => buscar()} disabled={cargando}>
            {cargando ? '↻' : '🔍'} Buscar
          </button>
          <button className="hc-btn-clear" onClick={limpiar} disabled={cargando}>
            ✕ Limpiar
          </button>
        </div>
      </div>

      {/* Body: split panel */}
      <div className="hc-body">

        {/* Panel izquierdo: lista */}
        <div className="hc-lista">
          <div className="hc-lista-head">
            <span className="hc-lh-folio">Folio</span>
            <span className="hc-lh-mesa">Mesa</span>
            <span className="hc-lh-mesera">Mesera</span>
            <span className="hc-lh-total">Total</span>
          </div>

          <div className="hc-lista-scroll">
            {cargando ? (
              <div className="hc-vacio">Buscando...</div>
            ) : cuentas.length === 0 ? (
              <div className="hc-vacio">Sin cuentas en el filtro seleccionado</div>
            ) : cuentasVisibles.map(c => (
              <div
                key={c.id}
                className={`hc-fila hc-fila-${(c.estado || '').toLowerCase()}${selId === c.id ? ' hc-fila-sel' : ''}`}
                onClick={() => cargarDetalle(c.id)}
              >
                <span className="hc-f-arrow">{selId === c.id ? '▶' : ''}</span>
                <span className="hc-f-folio">#{String(c.folio).padStart(4, '0')}</span>
                <span className="hc-f-mesa">{c.mesaNumero || c.nombreCliente || '—'}</span>
                <span className="hc-f-mesera">{c.meseraNombre}</span>
                <span className="hc-f-total">{fmt(c.total)}</span>
                {c.estado === 'Cancelada' && <span className="hc-f-icon-canc" title="Cancelada">✕</span>}
              </div>
            ))}
          </div>

          {cuentas.length > pagina && (
            <button className="hc-ver-mas" onClick={() => setPagina(p => p + PAGE)}>
              Ver más ({cuentas.length - pagina} restantes) ▼
            </button>
          )}

          {/* Totales y contador */}
          <div className="hc-totales">
            <div className="hc-tot-count">
              Mostrando {Math.min(pagina, cuentas.length)} de {cuentas.length}
            </div>
            <div className="hc-tot-row">
              <span className="hc-tot-lbl">Bruto</span>
              <span className="hc-tot-val">{fmt(totales.bruto)}</span>
            </div>
            <div className="hc-tot-row hc-tot-cobrado">
              <span className="hc-tot-lbl">Pagado</span>
              <span className="hc-tot-val">{fmt(totales.pagado)}</span>
            </div>
            {totales.cancelado > 0 && (
              <div className="hc-tot-row hc-tot-cancelado">
                <span className="hc-tot-lbl">Cancelado</span>
                <span className="hc-tot-val">{fmt(totales.cancelado)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho: detalle */}
        <div className="hc-detalle">
          {!selId ? (
            <div className="hc-det-placeholder">
              <div className="hc-ph-icon">📋</div>
              <div>Selecciona una cuenta de la lista para ver el detalle</div>
            </div>
          ) : cargandoDet ? (
            <div className="hc-det-placeholder">Cargando detalle...</div>
          ) : detalle ? (
            <DetallePanel
              detalle={detalle}
              onReimprimir={handleReimprimir}
              onCancelar={() => setModalCancelar(true)}
              onReabrir={() => setModalReabrir(true)}
              onFacturar={() => toast('Facturación próximamente', 'info')}
            />
          ) : null}
        </div>
      </div>

      {modalCancelar && detalle && (
        <CancelarCobradaModal
          folio={detalle.folio}
          onConfirmar={handleCancelarOk}
          onCerrar={() => setModalCancelar(false)}
        />
      )}
      {modalReabrir && detalle && (
        <ReabrirCuentaModal
          folio={detalle.folio}
          mesaNumero={detalle.mesaNumero}
          onConfirmar={handleReabrirOk}
          onCerrar={() => setModalReabrir(false)}
        />
      )}
    </div>
  )
}
