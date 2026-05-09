import { useState, useEffect, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import { api, API_URL } from '../api'
import CobrarCuentaModal from '../components/CobrarCuentaModal'
import './BarraRapidaAdminScreen.css'

function tiempoAbierta(fechaApertura) {
  const min = Math.floor((Date.now() - new Date(fechaApertura).getTime()) / 60000)
  if (min < 1) return 'menos de 1 min'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function fmt(n) {
  return `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function consolidarLineas(ordenes) {
  const map = {}
  for (const o of ordenes ?? []) {
    for (const d of o.detalles ?? []) {
      if (map[d.productoId]) {
        map[d.productoId].cantidad += d.cantidad
        map[d.productoId].subtotal += d.subtotal
      } else {
        map[d.productoId] = {
          productoId: d.productoId,
          nombre: d.productoNombre,
          precio: d.precioUnitario,
          cantidad: d.cantidad,
          subtotal: d.subtotal,
        }
      }
    }
  }
  return Object.values(map)
}

function calcProductosCount(cuenta) {
  return (cuenta?.ordenes ?? [])
    .flatMap(o => o.detalles ?? [])
    .reduce((s, d) => s + d.cantidad, 0)
}

export default function BarraRapidaAdminScreen({ auth }) {
  const [cuentas, setCuentas]           = useState([])
  const [cuentaSelId, setCuentaSelId]   = useState(null)
  const [cuentaDetalle, setCuentaDet]   = useState(null)
  const [categorias, setCategorias]     = useState([])
  const [catActiva, setCatActiva]       = useState(null)
  const [productos, setProductos]       = useState([])
  const [carrito, setCarrito]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [toastMsg, setToastMsg]         = useState(null)
  const [abriendo, setAbriendo]         = useState(false)
  const [enviando, setEnviando]         = useState(false)
  const [cobrarModal, setCobrarModal]   = useState(false)
  const [cancelModal, setCancelModal]   = useState(false)
  const [cancelPin, setCancelPin]       = useState('')
  const [cancelMotivo, setCancelMotivo] = useState('')
  const [cancelando, setCancelando]     = useState(false)
  const [, setTick]                     = useState(0)
  const connRef                         = useRef(null)

  // Tick para actualizar tiempos cada 30s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const cargarCuentas = useCallback(async () => {
    try {
      const data = await api.adminGetCuentasRapidasAbiertas(auth.token)
      setCuentas(Array.isArray(data) ? data : [])
      setError(null)
    } catch (e) {
      setError(e.message || 'Error al cargar cuentas')
    } finally {
      setLoading(false)
    }
  }, [auth.token])

  const cargarDetalle = useCallback(async (id) => {
    if (!id) { setCuentaDet(null); return }
    try {
      const data = await api.getCuenta(id, auth.token)
      setCuentaDet(data)
    } catch (e) {
      setError(e.message || 'Error al cargar detalle')
    }
  }, [auth.token])

  // Carga inicial
  useEffect(() => {
    cargarCuentas()
    api.adminGetCategorias(auth.token)
      .then(data => {
        const cats = Array.isArray(data) ? data : []
        setCategorias(cats)
        if (cats.length > 0) setCatActiva(cats[0].id)
      })
      .catch(() => {})
  }, [auth.token, cargarCuentas])

  // Cargar productos cuando cambia la categoría
  useEffect(() => {
    if (!catActiva) return
    api.adminGetProductos(auth.token, { categoriaId: catActiva, activo: true })
      .then(data => setProductos(Array.isArray(data) ? data : []))
      .catch(() => setProductos([]))
  }, [catActiva, auth.token])

  // Recargar detalle cuando cambia la cuenta seleccionada
  useEffect(() => { cargarDetalle(cuentaSelId) }, [cuentaSelId, cargarDetalle])

  // Poll al detalle cada 15s cuando hay cuenta seleccionada (para ver cambios de meseras)
  useEffect(() => {
    if (!cuentaSelId) return
    const id = setInterval(() => cargarDetalle(cuentaSelId), 15000)
    return () => clearInterval(id)
  }, [cuentaSelId, cargarDetalle])

  // SignalR
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/barhub`, { accessTokenFactory: () => auth.token })
      .withAutomaticReconnect([0, 2000, 5000, 15000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('CuentaAbierta', (payload) => {
      if (payload?.mesaId == null) cargarCuentas()
    })
    conn.on('CuentaCobrada', () => {
      cargarCuentas()
    })
    conn.on('CuentaCancelada', () => {
      cargarCuentas()
    })

    conn.start()
      .then(() => conn.invoke('UnirseAGrupo', 'Admin').catch(() => {}))
      .catch(e => console.warn('SignalR BarraRapidaAdmin:', e.message))

    connRef.current = conn
    return () => conn.stop()
  }, [auth.token, cargarCuentas])

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3500)
  }

  const handleNuevaBarra = async () => {
    setAbriendo(true)
    setError(null)
    try {
      const nueva = await api.adminAbrirCuentaRapida(auth.token, { meseraId: auth.id })
      await cargarCuentas()
      setCuentaSelId(nueva.id)
      setCarrito([])
    } catch (e) {
      setError(e.message || 'Error al abrir cuenta de barra')
    } finally {
      setAbriendo(false)
    }
  }

  const seleccionarCuenta = (id) => {
    setCuentaSelId(id)
    setCarrito([])
    setCancelModal(false)
  }

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => {
      const idx = prev.findIndex(x => x.productoId === producto.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + 1 }
        return next
      }
      return [...prev, { productoId: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1 }]
    })
  }

  const cambiarCantidad = (productoId, delta) => {
    setCarrito(prev =>
      prev.map(x => x.productoId === productoId ? { ...x, cantidad: x.cantidad + delta } : x)
        .filter(x => x.cantidad > 0)
    )
  }

  const handleEnviarOrden = async () => {
    if (carrito.length === 0 || enviando || !cuentaSelId) return
    setEnviando(true)
    try {
      await api.adminEnviarOrden(auth.token, {
        cuentaId: cuentaSelId,
        detalles: carrito.map(x => ({ productoId: x.productoId, cantidad: x.cantidad })),
      })
      setCarrito([])
      await cargarDetalle(cuentaSelId)
      cargarCuentas()
    } catch (e) {
      setError(e.message || 'Error al enviar orden')
    } finally {
      setEnviando(false)
    }
  }

  const handleCobrado = () => {
    setCobrarModal(false)
    setCuentaSelId(null)
    setCuentaDet(null)
    setCarrito([])
    showToast('Cuenta cobrada correctamente')
    cargarCuentas()
  }

  const handleCancelarCuenta = async () => {
    if (!cancelPin || !cancelMotivo || cancelando) return
    setCancelando(true)
    try {
      await api.adminCancelarCuenta(auth.token, cuentaSelId, { pin: cancelPin, motivo: cancelMotivo })
      setCancelModal(false)
      setCuentaSelId(null)
      setCuentaDet(null)
      setCarrito([])
      showToast('Cuenta cancelada')
      cargarCuentas()
    } catch (e) {
      setError(e.message || 'Error al cancelar cuenta')
    } finally {
      setCancelando(false)
    }
  }

  const lineas   = consolidarLineas(cuentaDetalle?.ordenes)
  const subtotal = cuentaDetalle?.subtotal ?? 0

  const cuentaParaCobrar = cuentaDetalle ? {
    ...cuentaDetalle,
    mesaNumero:    cuentaDetalle.nombreCliente ?? cuentaDetalle.mesaNumero ?? 'BARRA',
    productosCount: calcProductosCount(cuentaDetalle),
  } : null

  const totalCarrito = carrito.reduce((s, x) => s + x.precio * x.cantidad, 0)
  const itemsCarrito = carrito.reduce((s, x) => s + x.cantidad, 0)

  return (
    <div className="bra-root">

      {/* ── PANEL IZQUIERDO ── */}
      <div className="bra-left">
        <div className="bra-left-header">
          <span className="bra-left-titulo">🍺 BARRA</span>
          {cuentas.length > 0 && (
            <span className="bra-left-badge">{cuentas.length}</span>
          )}
        </div>

        <button
          className="bra-btn-nueva"
          onClick={handleNuevaBarra}
          disabled={abriendo}
        >
          {abriendo ? 'Abriendo...' : '+ NUEVA BARRA'}
        </button>

        {error && (
          <div className="bra-error">
            <span>⚠ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {loading ? (
          <div className="bra-loading">Cargando...</div>
        ) : cuentas.length === 0 ? (
          <div className="bra-vacio">Sin cuentas de barra abiertas</div>
        ) : (
          <div className="bra-cards">
            {cuentas.map(c => (
              <div
                key={c.id}
                className={`bra-card${cuentaSelId === c.id ? ' bra-card-sel' : ''}`}
                onClick={() => seleccionarCuenta(c.id)}
              >
                <div className="bra-card-nombre">{c.nombre}</div>
                <div className="bra-card-mesera">{c.mesera}</div>
                <div className="bra-card-footer">
                  <span>{fmt(c.total)}</span>
                  <span className="bra-card-tiempo">{tiempoAbierta(c.fechaApertura)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── PANEL DERECHO ── */}
      <div className="bra-right">
        {!cuentaDetalle ? (
          <div className="bra-sin-sel">
            <div className="bra-sin-sel-ico">🍺</div>
            <div className="bra-sin-sel-txt">Selecciona una cuenta de barra o abre una nueva</div>
          </div>
        ) : (
          <>
            <div className="bra-right-header">
              <span className="bra-right-titulo">
                {cuentaDetalle.nombreCliente ?? cuentaDetalle.mesaNumero}
              </span>
              <span className="bra-right-meta">
                {cuentaDetalle.meseraNombre} · {tiempoAbierta(cuentaDetalle.fechaApertura)}
              </span>
              {subtotal > 0 && (
                <span className="bra-right-total">{fmt(subtotal)}</span>
              )}
            </div>

            <div className="bra-right-body">

              {/* Selector de productos */}
              <div className="bra-picker">
                <div className="bra-cats">
                  {categorias.map(cat => (
                    <button
                      key={cat.id}
                      className={`bra-cat-btn${catActiva === cat.id ? ' bra-cat-activa' : ''}`}
                      onClick={() => setCatActiva(cat.id)}
                    >
                      {cat.nombre}
                    </button>
                  ))}
                </div>
                <div className="bra-prod-grid">
                  {productos.length === 0 ? (
                    <div className="bra-prod-vacio">Sin productos en esta categoría</div>
                  ) : productos.map(p => (
                    <button
                      key={p.id}
                      className="bra-prod-btn"
                      onClick={() => agregarAlCarrito(p)}
                    >
                      <span className="bra-prod-nombre">{p.nombre}</span>
                      <span className="bra-prod-precio">{fmt(p.precio)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Carrito pendiente */}
              {carrito.length > 0 && (
                <div className="bra-carrito">
                  <div className="bra-carrito-header">
                    NUEVA ORDEN — {itemsCarrito} ítem{itemsCarrito !== 1 ? 's' : ''} · {fmt(totalCarrito)}
                  </div>
                  {carrito.map(x => (
                    <div key={x.productoId} className="bra-carrito-line">
                      <span className="bra-cl-nombre">{x.nombre}</span>
                      <span className="bra-cl-precio">{fmt(x.precio * x.cantidad)}</span>
                      <div className="bra-cl-controles">
                        <button className="bra-cl-btn" onClick={() => cambiarCantidad(x.productoId, -1)}>−</button>
                        <span className="bra-cl-qty">{x.cantidad}</span>
                        <button className="bra-cl-btn" onClick={() => cambiarCantidad(x.productoId, +1)}>+</button>
                        <button className="bra-cl-btn bra-cl-del" onClick={() =>
                          setCarrito(prev => prev.filter(c => c.productoId !== x.productoId))
                        }>🗑</button>
                      </div>
                    </div>
                  ))}
                  <button
                    className="bra-btn-enviar"
                    onClick={handleEnviarOrden}
                    disabled={enviando}
                  >
                    {enviando ? 'Enviando...' : '▶ ENVIAR ORDEN AL BAR'}
                  </button>
                </div>
              )}

              {/* Productos en cuenta */}
              {lineas.length > 0 ? (
                <div className="bra-lineas">
                  <div className="bra-lineas-header">EN CUENTA</div>
                  {lineas.map(l => (
                    <div key={l.productoId} className="bra-linea">
                      <span className="bra-linea-qty">{l.cantidad}x</span>
                      <span className="bra-linea-nombre">{l.nombre}</span>
                      <span className="bra-linea-precio">{fmt(l.subtotal)}</span>
                    </div>
                  ))}
                  <div className="bra-subtotal">
                    <span>Subtotal</span>
                    <span>{fmt(subtotal)}</span>
                  </div>
                </div>
              ) : carrito.length === 0 && (
                <div className="bra-lineas-vacio">Agrega productos para comenzar</div>
              )}

            </div>

            {/* Footer */}
            <div className="bra-right-footer">
              <button
                className="bra-btn-cancelar-cuenta"
                onClick={() => { setCancelModal(true); setCancelPin(''); setCancelMotivo('') }}
              >
                ✗ CANCELAR CUENTA
              </button>
              <button
                className="bra-btn-cobrar"
                onClick={() => setCobrarModal(true)}
                disabled={lineas.length === 0}
              >
                💵 COBRAR
              </button>
            </div>
          </>
        )}
      </div>

      {/* Toast */}
      {toastMsg && <div className="bra-toast">✅ {toastMsg}</div>}

      {/* Modal cancelar */}
      {cancelModal && (
        <div className="bra-overlay">
          <div className="bra-modal-cancel">
            <div className="bra-mc-header">✗ CANCELAR CUENTA DE BARRA</div>
            <div className="bra-mc-body">
              <div className="bra-mc-lbl">PIN Admin</div>
              <input
                className="bra-mc-inp"
                type="password"
                placeholder="PIN de 4 dígitos"
                maxLength={6}
                value={cancelPin}
                onChange={e => setCancelPin(e.target.value)}
                autoFocus
              />
              <div className="bra-mc-lbl">Motivo de cancelación</div>
              <textarea
                className="bra-mc-textarea"
                placeholder="Motivo..."
                rows={3}
                value={cancelMotivo}
                onChange={e => setCancelMotivo(e.target.value)}
              />
            </div>
            <div className="bra-mc-footer">
              <button
                className="bra-mc-btn-no"
                onClick={() => setCancelModal(false)}
                disabled={cancelando}
              >
                VOLVER
              </button>
              <button
                className="bra-mc-btn-si"
                onClick={handleCancelarCuenta}
                disabled={!cancelPin || !cancelMotivo || cancelando}
              >
                {cancelando ? 'Cancelando...' : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cobrar */}
      {cobrarModal && cuentaParaCobrar && (
        <CobrarCuentaModal
          cuenta={cuentaParaCobrar}
          auth={auth}
          onClose={() => setCobrarModal(false)}
          onCobrado={handleCobrado}
        />
      )}

    </div>
  )
}
