import { useState, useEffect, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import { api, API_URL } from '../api'
import CobrarCuentaModal from '../components/CobrarCuentaModal'
import NumPad from '../components/NumPad'
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

export default function BarraRapidaAdminScreen({ auth }) {
  // Catálogo
  const [categorias, setCategorias] = useState([])
  const [catActiva,  setCatActiva]  = useState(null)
  const [productos,  setProductos]  = useState([])

  // Carrito de cobro directo
  const [carrito, setCarrito] = useState([])

  // NumPad para capturar cantidad de un producto recién pulsado
  const [pendiente, setPendiente] = useState(null) // { producto, cantidad }

  // Cuentas barra viejas (panel lateral - historial)
  const [cuentasViejas, setCuentasViejas] = useState([])

  // Estado UI
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [toastMsg,  setToastMsg]  = useState(null)
  const [cobrarModal, setCobrarModal] = useState(false)

  const [, setTick] = useState(0)
  const connRef    = useRef(null)

  // Tick para refrescar tiempos del panel lateral
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  // Cargar cuentas barra abiertas (historial reciente) -- no es el flujo principal
  const cargarCuentasViejas = useCallback(async () => {
    try {
      const data = await api.adminGetCuentasRapidasAbiertas(auth.token)
      setCuentasViejas(Array.isArray(data) ? data : [])
    } catch {
      // silencioso: el panel lateral es secundario
    }
  }, [auth.token])

  // Carga inicial
  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.adminGetCategorias(auth.token).catch(() => []),
      cargarCuentasViejas(),
    ]).then(([cats]) => {
      const arr = Array.isArray(cats) ? cats : []
      setCategorias(arr)
      if (arr.length > 0) setCatActiva(arr[0].id)
      setLoading(false)
    })
  }, [auth.token, cargarCuentasViejas])

  // Cargar productos cuando cambia la categoría
  useEffect(() => {
    if (!catActiva) return
    api.adminGetProductos(auth.token, { categoriaId: catActiva, activo: true })
      .then(data => setProductos(Array.isArray(data) ? data : []))
      .catch(() => setProductos([]))
  }, [catActiva, auth.token])

  // SignalR — sólo para refrescar el panel de historial
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/barhub`, { accessTokenFactory: () => auth.token })
      .withAutomaticReconnect([0, 2000, 5000, 15000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    conn.on('CuentaAbierta',  (p) => { if (p?.mesaId == null) cargarCuentasViejas() })
    conn.on('CuentaCobrada',  () => cargarCuentasViejas())
    conn.on('CuentaCancelada',() => cargarCuentasViejas())

    conn.start()
      .then(() => conn.invoke('UnirseAGrupo', 'Admin').catch(() => {}))
      .catch(e => console.warn('SignalR BarraRapidaAdmin:', e.message))

    connRef.current = conn
    return () => conn.stop()
  }, [auth.token, cargarCuentasViejas])

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3500)
  }

  // ── Carrito ───────────────────────────────────────────────
  // Click producto = suma +1 al carrito (rapido para cobros de barra)
  const seleccionarProducto = (producto) => {
    setCarrito(prev => {
      const idx = prev.findIndex(x => x.productoId === producto.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = {
          ...next[idx],
          cantidad: next[idx].cantidad + 1,
          subtotal: (next[idx].cantidad + 1) * next[idx].precio,
        }
        return next
      }
      return [...prev, {
        productoId: producto.id,
        nombre:     producto.nombre,
        precio:     producto.precio,
        cantidad:   1,
        subtotal:   producto.precio,
      }]
    })
  }

  // Cambiar cantidad de un item del carrito (+1, -1, o numero directo)
  const cambiarCantidad = (productoId, delta) => {
    setCarrito(prev => {
      return prev.map(x => {
        if (x.productoId !== productoId) return x
        const nuevaCant = x.cantidad + delta
        if (nuevaCant <= 0) return null
        return { ...x, cantidad: nuevaCant, subtotal: nuevaCant * x.precio }
      }).filter(Boolean)
    })
  }

  // Click sobre el numero de cantidad: abre NumPad para meter cantidad grande
  const abrirNumPadCantidad = (item) => {
    setPendiente({ producto: { id: item.productoId, nombre: item.nombre, precio: item.precio }, cantidad: '' })
  }

  const confirmarCantidad = (cantStr) => {
    if (!pendiente) return
    const cant = parseInt(cantStr || '0', 10)
    if (!cant || cant <= 0) {
      setPendiente(null)
      return
    }
    const { producto } = pendiente
    setCarrito(prev => {
      const idx = prev.findIndex(x => x.productoId === producto.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = {
          ...next[idx],
          cantidad: cant,                    // REEMPLAZA cantidad (no suma)
          subtotal: cant * next[idx].precio,
        }
        return next
      }
      return [...prev, {
        productoId: producto.id,
        nombre:     producto.nombre,
        precio:     producto.precio,
        cantidad:   cant,
        subtotal:   producto.precio * cant,
      }]
    })
    setPendiente(null)
  }

  const cancelarCantidad = () => setPendiente(null)

  const quitarItem = (productoId) => {
    setCarrito(prev => prev.filter(x => x.productoId !== productoId))
  }

  const limpiarCarrito = () => setCarrito([])

  // ── Cobro directo ────────────────────────────────────────
  const subtotal = carrito.reduce((s, x) => s + x.subtotal, 0)
  const totalItems = carrito.reduce((s, x) => s + x.cantidad, 0)

  const cuentaParaCobrar = carrito.length > 0 ? {
    id:             null,                  // todavía no existe
    folio:          '—',
    mesaNumero:     'BARRA',
    meseraNombre:   auth?.nombre ?? 'Admin',
    total:          subtotal,              // CobrarCuentaModal trata "subtotal" = cuenta.total
    productosCount: totalItems,
  } : null

  const enviarCobroDirecto = async (cobroDto) => {
    // cobroDto viene del CobrarCuentaModal con: metodoPago, montoEfectivo,
    // montoTarjeta, efectivoRecibido, rfcCliente, razonSocialCliente, descuento
    const dto = {
      productos: carrito.map(x => ({ productoId: x.productoId, cantidad: x.cantidad })),
      metodoPago:    cobroDto.metodoPago,
      montoEfectivo: cobroDto.metodoPago === 'Mixto'
        ? Number(cobroDto.montoEfectivo || 0)
        : cobroDto.metodoPago === 'Efectivo'
          ? Number(cobroDto.efectivoRecibido || 0)
          : 0,
      montoTarjeta: cobroDto.metodoPago === 'Mixto'
        ? Number(cobroDto.montoTarjeta || 0)
        : 0,    // en "Tarjeta" puro el back calcula sobre baseTotal
      descuento:      Number(cobroDto.descuento || 0),
      imprimirTicket: true,
      rfc:            cobroDto.rfcCliente ?? null,
      razonSocial:    cobroDto.razonSocialCliente ?? null,
      meseraId:       auth.id,
    }

    const res = await api.adminCobroRapidoBarra(auth.token, dto)

    // Adaptar al shape que CobrarCuentaModal espera mostrar en su pantalla "ok"
    return {
      id:             res.cuentaId,
      folio:          res.folio,
      total:          res.total,
      cambio:         res.cambio,
      subtotal:       res.subtotal,
      comisionTarjeta:res.comision,
      metodoPago:     res.metodoPago,
      ticketImpreso:  res.ticketImpreso,
      modoSimulado:   res.modoSimulado,
    }
  }

  const handleCobrado = (res) => {
    setCobrarModal(false)
    setCarrito([])
    setPendiente(null)
    if (res?.folio != null) {
      showToast(`Cobrado #${res.folio} - ${fmt(res.total)}`)
    } else {
      showToast('Cobrado correctamente')
    }
    cargarCuentasViejas()
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="bra-root">

      {/* ── COL 1: Categorías ── */}
      <div className="bra-col-cats">
        <div className="bra-col-header">
          <span className="bra-col-titulo">CATEGORÍAS</span>
        </div>
        {loading ? (
          <div className="bra-loading">Cargando...</div>
        ) : categorias.length === 0 ? (
          <div className="bra-vacio">Sin categorías</div>
        ) : (
          <div className="bra-cats-list">
            {categorias.map(cat => (
              <button
                key={cat.id}
                className={`bra-cat-item${catActiva === cat.id ? ' bra-cat-item-sel' : ''}`}
                onClick={() => setCatActiva(cat.id)}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        )}

        {/* Historial reciente: cuentas barra viejas (abiertas) */}
        {cuentasViejas.length > 0 && (
          <div className="bra-historial">
            <div className="bra-hist-titulo">CUENTAS BARRA ABIERTAS</div>
            {cuentasViejas.map(c => (
              <div key={c.id} className="bra-hist-card">
                <div className="bra-hist-nombre">{c.nombre}</div>
                <div className="bra-hist-meta">
                  <span>{fmt(c.total)}</span>
                  <span className="bra-hist-tiempo">{tiempoAbierta(c.fechaApertura)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── COL 2: Productos ── */}
      <div className="bra-col-prods">
        <div className="bra-col-header">
          <span className="bra-col-titulo">PRODUCTOS</span>
          {error && (
            <button className="bra-error-pill" onClick={() => setError(null)}>
              ⚠ {error} ✕
            </button>
          )}
        </div>
        <div className="bra-prods-grid">
          {productos.length === 0 ? (
            <div className="bra-prod-vacio">Sin productos en esta categoría</div>
          ) : productos.map(p => (
            <button
              key={p.id}
              className="bra-prod-btn"
              onClick={() => seleccionarProducto(p)}
            >
              <span className="bra-prod-nombre">{p.nombre}</span>
              <span className="bra-prod-precio">{fmt(p.precio)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── COL 3: Carrito + total + cobrar ── */}
      <div className="bra-col-carrito">
        <div className="bra-col-header">
          <span className="bra-col-titulo">🍺 COBRO BARRA</span>
          {carrito.length > 0 && (
            <button className="bra-clear-btn" onClick={limpiarCarrito} title="Vaciar carrito">
              🗑 Vaciar
            </button>
          )}
        </div>

        <div className="bra-carrito-body">
          {carrito.length === 0 ? (
            <div className="bra-carrito-vacio">
              <div className="bra-cv-ico">🍺</div>
              <div className="bra-cv-txt">Toca un producto para empezar</div>
            </div>
          ) : (
            <div className="bra-carrito-lista">
              {carrito.map(item => (
                <div key={item.productoId} className="bra-cart-item">
                  <div className="bra-cart-info">
                    <span className="bra-cart-nombre">{item.nombre}</span>
                    <span className="bra-cart-precio-unit">{fmt(item.precio)} c/u</span>
                  </div>
                  <div className="bra-cart-qty-controls">
                    <button
                      className="bra-qty-btn bra-qty-minus"
                      onClick={() => cambiarCantidad(item.productoId, -1)}
                      title="Quitar 1"
                    >−</button>
                    <button
                      className="bra-qty-num"
                      onClick={() => abrirNumPadCantidad(item)}
                      title="Click para escribir cantidad exacta"
                    >{item.cantidad}</button>
                    <button
                      className="bra-qty-btn bra-qty-plus"
                      onClick={() => cambiarCantidad(item.productoId, 1)}
                      title="Sumar 1"
                    >+</button>
                  </div>
                  <div className="bra-cart-precio">{fmt(item.subtotal)}</div>
                  <button
                    className="bra-cart-quitar"
                    onClick={() => quitarItem(item.productoId)}
                    title="Quitar item"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bra-total-box">
          <div className="bra-total-lbl">TOTAL</div>
          <div className="bra-total-val">{fmt(subtotal)}</div>
        </div>

        <button
          className="bra-btn-cobrar-directo"
          disabled={carrito.length === 0}
          onClick={() => setCobrarModal(true)}
        >
          💵 COBRAR DIRECTO
        </button>
      </div>

      {/* ── Toast ── */}
      {toastMsg && <div className="bra-toast">✅ {toastMsg}</div>}

      {/* ── Modal NumPad cantidad ── */}
      {pendiente && (
        <div className="bra-overlay" onClick={cancelarCantidad}>
          <div className="bra-numpad-modal" onClick={e => e.stopPropagation()}>
            <div className="bra-np-header">
              <span className="bra-np-prod">{pendiente.producto.nombre}</span>
              <span className="bra-np-precio">{fmt(pendiente.producto.precio)}</span>
            </div>
            <NumPad
              title="¿Cuántos?"
              value={pendiente.cantidad}
              onChange={(v) => setPendiente(p => p ? { ...p, cantidad: v } : null)}
              onConfirm={confirmarCantidad}
              maxLength={3}
              allowDecimal={false}
            />
            <button className="bra-np-cancel" onClick={cancelarCantidad}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Modal cobrar (reusa CobrarCuentaModal con onSubmit custom) ── */}
      {cobrarModal && cuentaParaCobrar && (
        <CobrarCuentaModal
          cuenta={cuentaParaCobrar}
          auth={auth}
          onClose={() => setCobrarModal(false)}
          onCobrado={handleCobrado}
          onSubmit={enviarCobroDirecto}
          btnLabel="💵 COBRAR DIRECTO"
        />
      )}

    </div>
  )
}
