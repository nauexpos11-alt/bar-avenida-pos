import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import NumPad from '../components/NumPad'
import './CuentaScreen.css'

// ── Helpers ────────────────────────────────────────────
function getResumen(cuenta) {
  const mapa = {}
  ;(cuenta?.ordenes ?? []).forEach(orden => {
    ;(orden.detalles ?? orden.ordenDetalles ?? []).forEach(d => {
      const nombre = d.nombreProducto ?? d.producto?.nombre ?? '?'
      const precio = d.precioUnitario ?? d.precio ?? 0
      const key    = String(d.productoId ?? nombre)
      if (mapa[key]) { mapa[key].cantidad += d.cantidad; mapa[key].subtotal += d.cantidad * precio }
      else            { mapa[key] = { nombre, cantidad: d.cantidad, precio, subtotal: d.cantidad * precio } }
    })
  })
  return Object.values(mapa)
}

function totalCarrito(carrito) {
  return carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)
}


// ── SVG Icons ──────────────────────────────────────────
function IcoResumen() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="accion-ico">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}
function IcoAceptar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className="accion-ico">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
function IcoCancela() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className="accion-ico">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}
function IcoTeclado() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M6 16h12"/>
    </svg>
  )
}
function IcoAgregar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  )
}
function IcoEliminar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  )
}
function IcoRetroceder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}

// ── Componente principal ────────────────────────────────
export default function CuentaScreen({ auth, mesa, cuenta: cuentaInit, onVolver, onCobrada, onIrResumen }) {
  const [cuenta, setCuenta]           = useState(cuentaInit)
  const [categorias, setCategorias]   = useState([])
  const [catActual, setCatActual]     = useState(null)
  const [productos, setProductos]     = useState([])
  const [prodCache, setProdCache]     = useState({})
  const [carrito, setCarrito]         = useState([])

  const [loadingCats, setLoadingCats]   = useState(true)
  const [loadingProds, setLoadingProds] = useState(false)
  const [enviando, setEnviando]         = useState(false)
  const [envError, setEnvError]         = useState(null)

  const [cantidadActual, setCantidadActual]     = useState(1)
  const [filaSeleccionada, setFilaSeleccionada] = useState(null)
  const [showNumPad, setShowNumPad]             = useState(false)
  const [confirmLimpiar, setConfirmLimpiar]     = useState(false)
  const [sugerencias, setSugerencias]           = useState([])

  const mesaNum    = mesa?.numero ?? cuenta?.mesaNumero ?? cuenta?.mesa?.numero ?? '?'
  // Alias viene del backend (cuenta.nombreCliente o mesa.aliasCuenta)
  const aliasMesa  = cuenta?.nombreCliente || mesa?.aliasCuenta || null
  const tituloMesa = aliasMesa || `MESA ${mesaNum}`
  const resumen    = getResumen(cuenta)
  const totalCuenta = cuenta?.total ?? 0
  const totalCarr  = totalCarrito(carrito)

  // PROMPT G — sugerencias filtradas: excluir productos ya en carrito
  const sugerenciasVisibles = sugerencias.filter(
    s => !carrito.some(item => item.productoId === s.productoId)
  )

  // ── Cargar categorías ──────────────────────────────
  useEffect(() => {
    api.getCategorias(auth.token)
      .then(data => {
        const cats = Array.isArray(data) ? data : []
        setCategorias(cats)
        if (cats.length > 0) seleccionarCategoria(cats[0])
      })
      .catch(e => console.warn('Error cats:', e))
      .finally(() => setLoadingCats(false))
  }, [])

  // ── Seleccionar categoría ──────────────────────────
  const seleccionarCategoria = useCallback(async (cat) => {
    setCatActual(cat)
    const id = cat.id
    if (prodCache[id]) { setProductos(prodCache[id]); return }
    setLoadingProds(true)
    try {
      const prods = await api.getProductosPorCategoria(id, auth.token)
      const arr = Array.isArray(prods) ? prods : []
      setProdCache(prev => ({ ...prev, [id]: arr }))
      setProductos(arr)
    } catch (e) {
      console.warn('Error prods:', e)
      setProductos([])
    } finally {
      setLoadingProds(false)
    }
  }, [prodCache, auth.token])

  // ── Agregar producto al carrito ────────────────────
  const agregarProducto = (prod) => {
    const cant = cantidadActual
    setCarrito(prev => {
      const idx = prev.findIndex(x => x.productoId === prod.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + cant }
        return next
      }
      return [...prev, {
        productoId: prod.id,
        nombre:     prod.nombre,
        precio:     prod.precio ?? 0,
        cantidad:   cant,
      }]
    })
    setCantidadActual(1)
    setFilaSeleccionada(null)

    // PROMPT G — pedir sugerencias para este producto
    api.getSugerencias(auth.token, prod.id)
      .then(s => setSugerencias(Array.isArray(s) ? s : []))
      .catch(() => setSugerencias([]))
  }

  // ── Eliminar fila seleccionada ─────────────────────
  const eliminarSeleccionado = () => {
    if (filaSeleccionada === null) return
    setCarrito(prev => prev.filter((_, i) => i !== filaSeleccionada))
    setFilaSeleccionada(null)
  }

  // ── Enviar orden ───────────────────────────────────
  const enviarOrden = async () => {
    if (carrito.length === 0 || enviando) return
    setEnviando(true)
    setEnvError(null)
    try {
      await api.enviarOrden(auth.token, {
        cuentaId: cuenta.id,
        detalles: carrito.map(x => ({ productoId: x.productoId, cantidad: x.cantidad })),
      })
      const updated = await api.getCuenta(cuenta.id, auth.token)
      setCuenta(updated)
      setCarrito([])
      setFilaSeleccionada(null)
      setSugerencias([])
    } catch (e) {
      setEnvError(e.message || 'Error al enviar la orden')
    } finally {
      setEnviando(false)
    }
  }

  // ── Cantidad total de producto en carrito ──────────
  const cantEnCarrito = (prodId) =>
    carrito.filter(x => x.productoId === prodId).reduce((s, x) => s + x.cantidad, 0)

  // ── Render ─────────────────────────────────────────
  return (
    <div className="cuenta-root">

      {/* Loading overlay */}
      {enviando && <div className="cs-loading-overlay">Enviando orden...</div>}

      {/* ══════════════ PANEL IZQUIERDO ══════════════ */}
      <div className="panel-izq">

        {/* Row 1: Botones de acción */}
        <div className="accion-bar">
          <button className="accion-btn"
            onClick={() => onIrResumen && onIrResumen(mesa, cuenta)}>
            <IcoResumen />
            <span>RESUMEN</span>
          </button>
          <button
            className="accion-btn accion-aceptar"
            onClick={enviarOrden}
            disabled={carrito.length === 0 || enviando}
          >
            <IcoAceptar />
            <span>ACEPTAR</span>
          </button>
          <button className="accion-btn accion-cancela" onClick={() => { setSugerencias([]); onVolver() }}>
            <IcoCancela />
            <span>CANCELA</span>
          </button>
        </div>

        {/* Row 2: Captura de cantidad */}
        <div className="captura-bar">
          <button className="captura-ico-btn" title="Teclado" onClick={() => setShowNumPad(true)}>
            <IcoTeclado />
          </button>
          <div
            className="captura-display"
            onClick={() => setShowNumPad(true)}
            title="Cantidad actual — toca para cambiar"
          >
            {cantidadActual}
          </div>
          <button
            className="captura-agregar-btn"
            title="Agregar cantidad a seleccionado"
            disabled={filaSeleccionada === null}
            onClick={() => {
              if (filaSeleccionada === null) return
              setCarrito(prev => prev.map((x, i) =>
                i === filaSeleccionada ? { ...x, cantidad: x.cantidad + cantidadActual } : x
              ))
              setCantidadActual(1)
            }}
          >
            <IcoAgregar />
            <span>AGREGAR</span>
          </button>
          <div className="captura-mesa-info">
            <span className="cs-mesa">{tituloMesa}</span>
            <span className="cs-mesera">{auth.nombre}</span>
          </div>
        </div>

        {/* Row 3: Acciones de edición */}
        <div className="edit-bar">
          <button
            className="edit-btn"
            disabled={filaSeleccionada === null}
            onClick={eliminarSeleccionado}
          >
            <IcoEliminar />
            ELIMINAR PROD
          </button>
          <button
            className="edit-btn edit-todo"
            disabled={carrito.length === 0}
            onClick={() => setConfirmLimpiar(true)}
          >
            ELIMINAR TODO
          </button>
        </div>

        {/* Comanda: header */}
        <div className="comanda-hdr">
          <span className="cmd-h-cant">CANT</span>
          <span className="cmd-h-desc">DESCRIPCIÓN</span>
          <span className="cmd-h-imp">IMPORTE</span>
        </div>

        {/* Comanda: lista scrollable */}
        <div className="comanda-list">
          {carrito.length === 0 ? (
            <div className="comanda-vacio">
              Toca un producto del panel derecho
            </div>
          ) : (
            carrito.map((item, idx) => (
              <button
                key={`${item.productoId}-${item.tiempo}-${idx}`}
                className={`cmd-row ${filaSeleccionada === idx ? 'cmd-row-sel' : ''}`}
                onClick={() => setFilaSeleccionada(filaSeleccionada === idx ? null : idx)}
              >
                <span className="cmd-cant">{item.cantidad}</span>
                <span className="cmd-desc">{item.nombre}</span>
                <span className="cmd-imp">${(item.precio * item.cantidad).toFixed(0)}</span>
              </button>
            ))
          )}
        </div>

        {/* PROMPT G — Banner de sugerencias inline */}
        {sugerenciasVisibles.length > 0 && (
          <div className="cs-sugerencias">
            <span className="cs-sug-label">💡 También sugerimos:</span>
            <div className="cs-sug-chips">
              {sugerenciasVisibles.map(s => (
                <button
                  key={s.productoId}
                  className="cs-sug-chip"
                  onClick={() => agregarProducto({
                    id:     s.productoId,
                    nombre: s.nombre,
                    precio: s.precio,
                  })}
                >
                  <span className="cs-sug-nombre">{s.nombre}</span>
                  <span className="cs-sug-precio">+${s.precio.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error envío */}
        {envError && (
          <div className="env-error-bar">
            ⚠ {envError}
            <button onClick={() => setEnvError(null)}>✕</button>
          </div>
        )}

        {/* Total bar */}
        <div className="comanda-total-bar">
          <div className="cs-subtotal">
            <span className="cs-total-label">CUENTA</span>
            <span className="cs-total-val">${totalCuenta.toFixed(2)}</span>
          </div>
          <div className="cs-orden-total">
            <span className="cs-total-label">ORDEN</span>
            <span className="cs-orden-val">${totalCarr.toFixed(2)}</span>
          </div>
          <button
            className="btn-cobrar-cs"
            onClick={() => onIrResumen && onIrResumen(mesa, cuenta)}
            disabled={totalCuenta === 0}
          >
            VER RESUMEN
          </button>
        </div>
      </div>

      {/* ══════════════ PANEL DERECHO ══════════════ */}
      <div className="panel-der">

        {/* Categorías grid */}
        <div className="cats-grid">
          {loadingCats
            ? <span className="cats-loading">Cargando...</span>
            : categorias.map(cat => (
                <button
                  key={cat.id}
                  className={`cat-card ${catActual?.id === cat.id ? 'cat-card-activa' : ''}`}
                  onClick={() => seleccionarCategoria(cat)}
                >
                  {cat.nombre}
                </button>
              ))
          }
        </div>

        <div className="panel-sep" />

        {/* Productos */}
        <div className="productos-area">
          {loadingProds ? (
            <div className="prods-loading">Cargando...</div>
          ) : (
            <div className="productos-grid">
              {productos.map(prod => {
                const enCarro = cantEnCarrito(prod.id)
                return (
                  <button
                    key={prod.id}
                    className={`prod-card ${enCarro > 0 ? 'prod-en-carrito' : ''}`}
                    onClick={() => agregarProducto(prod)}
                  >
                    {enCarro > 0 && <span className="prod-badge">{enCarro}</span>}
                    <span className="prod-nombre">{prod.nombre}</span>
                    <span className="prod-precio">${(prod.precio ?? 0).toFixed(0)}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom derecho */}
        <div className="der-bottom">
          <button
            className="der-bot-btn"
            onClick={() => categorias.length > 0 && seleccionarCategoria(categorias[0])}
          >
            <IcoRetroceder />
            <span>RETROCEDER</span>
          </button>
        </div>
      </div>

      {/* ── NumPad cantidad ── */}
      {showNumPad && (
        <NumPad
          titulo="CANTIDAD"
          valorInicial={cantidadActual}
          valorMinimo={1}
          valorMaximo={99}
          onAceptar={v => { setCantidadActual(v); setShowNumPad(false) }}
          onCancelar={() => setShowNumPad(false)}
        />
      )}

      {/* ── Confirmar eliminar todo ── */}
      {confirmLimpiar && (
        <div className="modal-overlay"
          onClick={e => e.target === e.currentTarget && setConfirmLimpiar(false)}>
          <div className="modal-box" style={{ maxWidth: 360 }}>
            <div className="modal-title" style={{ color: '#ef4444' }}>¿ELIMINAR TODO?</div>
            <div className="modal-sub">Se borrará toda la orden pendiente actual.</div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setConfirmLimpiar(false)}>
                CANCELAR
              </button>
              <button className="cs-btn-danger" onClick={() => {
                setCarrito([]); setFilaSeleccionada(null); setConfirmLimpiar(false)
              }}>
                SÍ, ELIMINAR
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
