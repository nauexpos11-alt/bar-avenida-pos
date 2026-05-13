import { useState, useEffect, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import { api, API_URL } from '../api'
import CobrarCuentaModal from '../components/CobrarCuentaModal'
import EditarInfoCuentaModal from '../components/EditarInfoCuentaModal'
import Icon from '../components/Icon'
import './MesaOperableScreen.css'

// ── Helpers ──────────────────────────────────────────────
function fmt(n) {
  return `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function consolidarLineas(ordenes) {
  const map = {}
  for (const o of ordenes ?? []) {
    for (const d of o.detalles ?? o.ordenDetalles ?? []) {
      const pid = d.productoId
      const nombre = d.productoNombre ?? d.producto?.nombre ?? '?'
      const precio = d.precioUnitario ?? d.precio ?? 0
      const subtotal = d.subtotal ?? (precio * d.cantidad)
      if (map[pid]) {
        map[pid].cantidad += d.cantidad
        map[pid].subtotal += subtotal
      } else {
        map[pid] = { productoId: pid, nombre, precio, cantidad: d.cantidad, subtotal }
      }
    }
  }
  return Object.values(map)
}

function calcProductosCount(cuenta) {
  return (cuenta?.ordenes ?? [])
    .flatMap(o => o.detalles ?? o.ordenDetalles ?? [])
    .reduce((s, d) => s + d.cantidad, 0)
}

// ── Componente principal ─────────────────────────────────
export default function MesaOperableScreen({ auth, mesaId, mesaNumero, onVolver }) {
  // Mesa + cuenta
  const [mesa, setMesa]                   = useState(null)
  const [cuenta, setCuenta]               = useState(null)
  const [loadingCuenta, setLoadingCuenta] = useState(true)
  const [error, setError]                 = useState(null)

  // Catálogo
  const [categorias, setCategorias] = useState([])
  const [catActiva, setCatActiva]   = useState(null)
  const [productos, setProductos]   = useState([])

  // Carrito
  const [carrito, setCarrito]   = useState([])
  const [enviando, setEnviando] = useState(false)
  const [abriendo, setAbriendo] = useState(false)
  // Modal de "personalizar cuenta nueva" — Coronado: admin puede personalizar como mesera
  const [modalAbrir, setModalAbrir] = useState(false)
  const [nuevaCuentaAlias,    setNuevaCuentaAlias]    = useState('')
  const [nuevaCuentaPersonas, setNuevaCuentaPersonas] = useState(1)
  const [nuevaCuentaArea,     setNuevaCuentaArea]     = useState('')

  // Solicitudes de cancelación pendientes (banner)
  const [solicitudes, setSolicitudes] = useState([])
  const [pinSol, setPinSol]           = useState('')
  const [solSeleccionada, setSolSel]  = useState(null)
  const [accionSol, setAccionSol]     = useState(null) // 'aprobar' | 'rechazar'
  const [procesandoSol, setProcSol]   = useState(false)

  // Modales
  const [cobrarModal, setCobrarModal]   = useState(false)
  const [editarModal, setEditarModal]   = useState(false)
  const [cancelModal, setCancelModal]   = useState(false)
  const [cancelPin, setCancelPin]       = useState('')
  const [cancelMotivo, setCancelMotivo] = useState('')
  const [cancelando, setCancelando]     = useState(false)

  // Toast
  const [toastMsg, setToastMsg] = useState(null)

  const connRef = useRef(null)
  const cuentaIdRef = useRef(null)

  useEffect(() => { cuentaIdRef.current = cuenta?.id ?? null }, [cuenta])

  const showToast = useCallback((msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }, [])

  // ── Cargar mesa y cuenta ────────────────────────────────
  const cargarMesa = useCallback(async () => {
    try {
      const todas = await api.getMesas(auth.token)
      const found = (Array.isArray(todas) ? todas : []).find(m => m.id === mesaId)
      if (found) setMesa(found)
      return found ?? null
    } catch (e) {
      setError(e.message)
      return null
    }
  }, [auth.token, mesaId])

  const cargarCuenta = useCallback(async (m) => {
    setLoadingCuenta(true)
    try {
      const mm = m || mesa
      const cuentaIdActual = mm?.cuentaId ?? mm?.cuentaActualId
      if (!cuentaIdActual) {
        setCuenta(null)
        return
      }
      const c = await api.getCuenta(cuentaIdActual, auth.token)
      setCuenta(c)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingCuenta(false)
    }
  }, [auth.token, mesa])

  const cargarSolicitudes = useCallback(async () => {
    try {
      const data = await api.getSolicitudesPendientes(auth.token)
      const cuentaIdAct = cuentaIdRef.current
      if (!cuentaIdAct) { setSolicitudes([]); return }
      setSolicitudes((Array.isArray(data) ? data : []).filter(s => s.cuentaId === cuentaIdAct))
    } catch {
      // silencio
    }
  }, [auth.token])

  // Carga inicial
  useEffect(() => {
    (async () => {
      const m = await cargarMesa()
      await cargarCuenta(m)
    })()
    api.adminGetCategorias(auth.token)
      .then(data => {
        const cats = Array.isArray(data) ? data : []
        setCategorias(cats)
        if (cats.length > 0) setCatActiva(cats[0].id)
      })
      .catch(() => {})
    // eslint-disable-next-line
  }, [mesaId, auth.token])

  // Cargar solicitudes cuando cambia la cuenta
  useEffect(() => {
    if (cuenta?.id) cargarSolicitudes()
    else setSolicitudes([])
  }, [cuenta?.id, cargarSolicitudes])

  // Productos al cambiar categoría
  useEffect(() => {
    if (!catActiva) return
    api.adminGetProductos(auth.token, { categoriaId: catActiva, activo: true })
      .then(d => setProductos(Array.isArray(d) ? d : []))
      .catch(() => setProductos([]))
  }, [catActiva, auth.token])

  // ── SignalR ─────────────────────────────────────────────
  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/barhub`, { accessTokenFactory: () => auth.token })
      .withAutomaticReconnect([0, 2000, 5000, 15000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    const refrescarCuenta = async () => {
      const cid = cuentaIdRef.current
      if (!cid) return
      try {
        const c = await api.getCuenta(cid, auth.token)
        setCuenta(c)
      } catch {}
    }

    conn.on('OrdenAgregada',      refrescarCuenta)
    conn.on('CuentaActualizada',  (data) => {
      const id = typeof data === 'object' ? data?.id : data
      if (id === cuentaIdRef.current) refrescarCuenta()
    })
    conn.on('CuentaCobrada', (data) => {
      const id = typeof data === 'object' ? data?.id : data
      if (id === cuentaIdRef.current) {
        showToast('Cuenta cobrada')
        setCuenta(null)
        cargarMesa()
      }
    })
    conn.on('SolicitudCancelacion', () => cargarSolicitudes())
    conn.on('SolicitudResuelta',    () => cargarSolicitudes())

    conn.start()
      .then(() => conn.invoke('UnirseAGrupo', 'Admin').catch(() => {}))
      .catch(e => console.warn('SignalR MesaOperable:', e.message))

    connRef.current = conn
    return () => conn.stop()
  }, [auth.token, cargarMesa, cargarSolicitudes, showToast])

  // ── Acciones ────────────────────────────────────────────
  // Click "ABRIR CUENTA" abre modal de personalización (igual que mesera)
  const handleAbrirCuenta = () => {
    setNuevaCuentaAlias('')
    setNuevaCuentaPersonas(1)
    setNuevaCuentaArea('')
    setError(null)
    setModalAbrir(true)
  }

  const confirmarAbrirCuenta = async () => {
    if (abriendo) return
    setAbriendo(true)
    setError(null)
    try {
      await api.abrirCuenta(auth.token, {
        mesaId:         mesa.id,
        meseraId:       auth.id,
        numeroPersonas: Math.max(1, parseInt(nuevaCuentaPersonas, 10) || 1),
        nombreCliente:  nuevaCuentaAlias?.trim() || null,
        area:           nuevaCuentaArea?.trim() || null,
      })
      const m = await cargarMesa()
      await cargarCuenta(m)
      setModalAbrir(false)
      showToast(nuevaCuentaAlias ? `Cuenta "${nuevaCuentaAlias}" abierta` : 'Cuenta abierta')
    } catch (e) {
      setError(e.message || 'Error al abrir cuenta')
    } finally {
      setAbriendo(false)
    }
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
      prev
        .map(x => x.productoId === productoId ? { ...x, cantidad: x.cantidad + delta } : x)
        .filter(x => x.cantidad > 0)
    )
  }

  const handleEnviarOrden = async () => {
    if (carrito.length === 0 || enviando || !cuenta?.id) return
    setEnviando(true)
    try {
      await api.adminEnviarOrden(auth.token, {
        cuentaId: cuenta.id,
        detalles: carrito.map(x => ({ productoId: x.productoId, cantidad: x.cantidad })),
      })
      setCarrito([])
      // Recarga inmediata
      const c = await api.getCuenta(cuenta.id, auth.token)
      setCuenta(c)
      showToast('Orden enviada')
    } catch (e) {
      setError(e.message || 'Error al enviar orden')
    } finally {
      setEnviando(false)
    }
  }

  const handleCobrado = () => {
    setCobrarModal(false)
    showToast('Cuenta cobrada ✓')
    setCuenta(null)
    cargarMesa()
  }

  const handleGuardarInfo = async (dto) => {
    try {
      await api.adminEditarInfoCuenta(auth.token, cuenta.id, dto)
      const c = await api.getCuenta(cuenta.id, auth.token)
      setCuenta(c)
      setEditarModal(false)
      showToast('Info actualizada')
    } catch (e) {
      setError(e.message || 'Error al editar info')
    }
  }

  const handleCancelarCuenta = async () => {
    if (!cancelPin || !cancelMotivo || cancelando) return
    setCancelando(true)
    try {
      await api.adminCancelarCuenta(auth.token, cuenta.id, { pin: cancelPin, motivo: cancelMotivo })
      setCancelModal(false)
      setCancelPin('')
      setCancelMotivo('')
      setCuenta(null)
      cargarMesa()
      showToast('Cuenta cancelada')
    } catch (e) {
      setError(e.message || 'Error al cancelar cuenta')
    } finally {
      setCancelando(false)
    }
  }

  const ejecutarSolicitud = async () => {
    if (!solSeleccionada || !accionSol) return
    if (!pinSol) { setError('Ingresa el PIN admin'); return }
    setProcSol(true)
    try {
      if (accionSol === 'aprobar') {
        await api.adminAprobarSolicitud(auth.token, solSeleccionada.id, pinSol)
        showToast('Solicitud APROBADA')
      } else {
        await api.adminRechazarSolicitud(auth.token, solSeleccionada.id, pinSol)
        showToast('🚫 Solicitud RECHAZADA')
      }
      setSolSel(null)
      setAccionSol(null)
      setPinSol('')
      cargarSolicitudes()
      // Refrescar cuenta porque puede haber cambiado total
      if (cuenta?.id) {
        try {
          const c = await api.getCuenta(cuenta.id, auth.token)
          setCuenta(c)
        } catch {}
      }
    } catch (e) {
      setError(e.message || 'Error al procesar solicitud')
    } finally {
      setProcSol(false)
    }
  }

  // ── Derivados ───────────────────────────────────────────
  const lineas        = consolidarLineas(cuenta?.ordenes)
  const totalCarrito  = carrito.reduce((s, x) => s + x.precio * x.cantidad, 0)
  const itemsCarrito  = carrito.reduce((s, x) => s + x.cantidad, 0)
  const total         = cuenta?.total ?? 0
  const numeroMesa    = mesaNumero ?? mesa?.numero ?? '?'
  const esPorCobrar   = cuenta?.estado === 'PorCobrar'

  const cuentaParaCobrar = cuenta ? {
    ...cuenta,
    mesaNumero:     cuenta.mesaNumero ?? numeroMesa,
    productosCount: calcProductosCount(cuenta),
  } : null

  // ── Render: sin cuenta abierta ──────────────────────────
  if (!loadingCuenta && !cuenta) {
    return (
      <div className="mop-root">
        <div className="mop-header">
          <button className="mop-btn-volver" onClick={onVolver}><Icon name="back" size={16} /> VOLVER</button>
          <h1 className="mop-titulo">Mesa #{numeroMesa}</h1>
          <div style={{ width: 100 }} />
        </div>

        {error && (
          <div className="mop-error">
            <Icon name="warning" size={14} /> {error}
            <button onClick={() => setError(null)} aria-label="Cerrar"><Icon name="close" size={14} /></button>
          </div>
        )}

        <div className="mop-empty">
          <div className="mop-empty-icon"><Icon name="mesas" size={56} strokeWidth={1.2} /></div>
          <div className="mop-empty-txt">Esta mesa no tiene cuenta abierta</div>
          <button
            className="mop-btn-abrir"
            onClick={handleAbrirCuenta}
            disabled={abriendo || !mesa}
          >
            <Icon name="add" size={16} /> ABRIR CUENTA
          </button>
        </div>

        {/* Modal de personalizar cuenta nueva — admin como mesera */}
        {modalAbrir && (
          <div className="mop-modal-overlay" onClick={() => !abriendo && setModalAbrir(false)}>
            <div className="mop-modal" onClick={e => e.stopPropagation()}>
              <div className="mop-modal-head">
                <h3>Abrir cuenta en Mesa {mesa?.numero}</h3>
                <button className="mop-modal-close" onClick={() => !abriendo && setModalAbrir(false)} aria-label="Cerrar"><Icon name="close" size={18} /></button>
              </div>
              <div className="mop-modal-body">
                <label className="mop-field">
                  <span className="mop-field-lbl">Nombre / Alias del cliente <span className="mop-field-hint">(opcional — ej. "NAU", "Mesa Juan")</span></span>
                  <input
                    type="text"
                    autoFocus
                    maxLength={40}
                    value={nuevaCuentaAlias}
                    onChange={e => setNuevaCuentaAlias(e.target.value)}
                    placeholder="Sin alias"
                  />
                </label>
                <label className="mop-field">
                  <span className="mop-field-lbl">Número de personas</span>
                  <div className="mop-pers-row">
                    <button type="button" onClick={() => setNuevaCuentaPersonas(n => Math.max(1, (parseInt(n,10)||1) - 1))}>−</button>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={nuevaCuentaPersonas}
                      onChange={e => setNuevaCuentaPersonas(e.target.value)}
                    />
                    <button type="button" onClick={() => setNuevaCuentaPersonas(n => Math.min(20, (parseInt(n,10)||1) + 1))}>+</button>
                  </div>
                </label>
                <label className="mop-field">
                  <span className="mop-field-lbl">Área <span className="mop-field-hint">(opcional)</span></span>
                  <input
                    type="text"
                    maxLength={30}
                    value={nuevaCuentaArea}
                    onChange={e => setNuevaCuentaArea(e.target.value)}
                    placeholder="Salón, Terraza, VIP…"
                  />
                </label>
              </div>
              <div className="mop-modal-footer">
                <button className="mop-btn-cancel" onClick={() => setModalAbrir(false)} disabled={abriendo}>Cancelar</button>
                <button className="mop-btn-confirm" onClick={confirmarAbrirCuenta} disabled={abriendo}>
                  {abriendo ? 'Abriendo…' : (<><Icon name="check" size={16} /> ABRIR CUENTA</>)}
                </button>
              </div>
            </div>
          </div>
        )}

        {toastMsg && <div className="mop-toast">{toastMsg}</div>}
      </div>
    )
  }

  // ── Render principal: cuenta abierta ────────────────────
  return (
    <div className="mop-root">

      {/* ── Header ── */}
      <div className="mop-header">
        <button className="mop-btn-volver" onClick={onVolver}>◀ VOLVER</button>
        <h1 className="mop-titulo">
          Mesa #{numeroMesa}
          {cuenta && (
            <span className="mop-titulo-meta">
              · Folio #{cuenta.folio} · {cuenta.meseraNombre ?? cuenta.nombreMesera ?? '—'}
            </span>
          )}
        </h1>
        <div className="mop-header-total">{fmt(total)}</div>
      </div>

      {/* ── Banner solicitudes pendientes ── */}
      {solicitudes.length > 0 && (
        <div className="mop-banner-sol">
          <div className="mop-banner-sol-icon"><Icon name="bell" size={24} /></div>
          <div className="mop-banner-sol-info">
            <div className="mop-banner-sol-titulo">
              {solicitudes.length} solicitud{solicitudes.length !== 1 ? 'es' : ''} de cancelación pendiente{solicitudes.length !== 1 ? 's' : ''}
            </div>
            {solicitudes.map(s => (
              <div key={s.id} className="mop-sol-row">
                <span className="mop-sol-tipo">
                  {s.tipo === 'Cuenta' ? 'CUENTA COMPLETA' : `${s.productos?.length ?? 0} producto(s)`}
                </span>
                <span className="mop-sol-motivo">"{s.motivo || 'sin motivo'}"</span>
                <span className="mop-sol-monto">{fmt(s.montoTotal)}</span>
                <div className="mop-sol-acciones">
                  <button
                    className="mop-sol-btn mop-sol-btn-aprobar"
                    onClick={() => { setSolSel(s); setAccionSol('aprobar') }}
                  >
                    <Icon name="check" size={14} /> APROBAR
                  </button>
                  <button
                    className="mop-sol-btn mop-sol-btn-rechazar"
                    onClick={() => { setSolSel(s); setAccionSol('rechazar') }}
                  >
                    <Icon name="close" size={14} /> RECHAZAR
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Banner por cobrar ── */}
      {esPorCobrar && (
        <div className="mop-banner-cobrar">
          <span className="mop-banner-cobrar-txt">Esta cuenta está EN ESPERA DE COBRO</span>
          <button
            className="mop-banner-cobrar-btn pulse"
            onClick={() => setCobrarModal(true)}
            disabled={total <= 0}
          >
            <Icon name="cobrar" size={16} /> COBRAR {fmt(total)}
          </button>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="mop-error">
          <Icon name="warning" size={14} /> {error}
          <button onClick={() => setError(null)} aria-label="Cerrar"><Icon name="close" size={14} /></button>
        </div>
      )}

      {/* ── Cuerpo: 3 columnas ── */}
      <div className="mop-body">

        {/* IZQ: categorías */}
        <aside className="mop-cats">
          <div className="mop-cats-titulo">CATEGORÍAS</div>
          {categorias.length === 0 ? (
            <div className="mop-cats-empty">Sin categorías</div>
          ) : (
            categorias.map(cat => (
              <button
                key={cat.id}
                className={`mop-cat-tab${catActiva === cat.id ? ' mop-cat-activa' : ''}`}
                onClick={() => setCatActiva(cat.id)}
              >
                {cat.nombre}
              </button>
            ))
          )}
        </aside>

        {/* CENTRO: productos */}
        <section className="mop-prods">
          {productos.length === 0 ? (
            <div className="mop-prods-empty">Selecciona una categoría</div>
          ) : (
            <div className="mop-prods-grid">
              {productos.map(p => (
                <button
                  key={p.id}
                  className="mop-prod-card"
                  onClick={() => agregarAlCarrito(p)}
                  disabled={esPorCobrar}
                  title={esPorCobrar ? 'Cuenta en espera de cobro' : ''}
                >
                  <span className="mop-prod-nombre">{p.nombre}</span>
                  <span className="mop-prod-precio">{fmt(p.precio)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* DER: cuenta + acciones */}
        <aside className="mop-cuenta">

          <div className="mop-cuenta-header">
            <span>CUENTA ACTUAL</span>
            <span className="mop-cuenta-personas">
              {cuenta?.numeroPersonas ?? 1} pers.
              {cuenta?.nombreCliente && ` · ${cuenta.nombreCliente}`}
            </span>
          </div>

          {/* Carrito (no enviado todavía) */}
          {carrito.length > 0 && (
            <div className="mop-carrito">
              <div className="mop-carrito-header">
                NUEVA ORDEN — {itemsCarrito} ítem{itemsCarrito !== 1 ? 's' : ''}
              </div>
              {carrito.map(x => (
                <div key={x.productoId} className="mop-carrito-line">
                  <span className="mop-cl-nombre">{x.nombre}</span>
                  <div className="mop-cl-controles">
                    <button className="mop-cl-btn" onClick={() => cambiarCantidad(x.productoId, -1)}>−</button>
                    <span className="mop-cl-qty">{x.cantidad}</span>
                    <button className="mop-cl-btn" onClick={() => cambiarCantidad(x.productoId, +1)}>+</button>
                  </div>
                  <span className="mop-cl-precio">{fmt(x.precio * x.cantidad)}</span>
                </div>
              ))}
              <div className="mop-carrito-total">
                <span>Total nueva orden:</span>
                <span>{fmt(totalCarrito)}</span>
              </div>
              <button
                className="mop-btn-enviar"
                onClick={handleEnviarOrden}
                disabled={enviando}
              >
                {enviando ? 'Enviando…' : '▶ ENVIAR ORDEN'}
              </button>
            </div>
          )}

          {/* Líneas en cuenta */}
          <div className="mop-lineas">
            {lineas.length === 0 ? (
              <div className="mop-lineas-empty">Sin productos en cuenta</div>
            ) : (
              lineas.map(l => (
                <div key={l.productoId} className="mop-linea">
                  <span className="mop-linea-qty">{l.cantidad}×</span>
                  <span className="mop-linea-nombre">{l.nombre}</span>
                  <span className="mop-linea-precio">{fmt(l.subtotal)}</span>
                </div>
              ))
            )}
          </div>

          {/* Totales */}
          <div className="mop-totales">
            <div className="mop-total-row mop-total-grande">
              <span>TOTAL</span>
              <span>{fmt(total)}</span>
            </div>
          </div>

          {/* Acciones */}
          <div className="mop-acciones">
            <button
              className="mop-btn-cobrar"
              onClick={() => setCobrarModal(true)}
              disabled={total <= 0}
            >
              <Icon name="cobrar" size={16} /> COBRAR
            </button>
            <button
              className="mop-btn-editar"
              onClick={() => setEditarModal(true)}
            >
              <Icon name="edit" size={14} /> Editar info
            </button>
            <button
              className="mop-btn-cancelar"
              onClick={() => { setCancelModal(true); setCancelPin(''); setCancelMotivo('') }}
            >
              <Icon name="cancel" size={14} /> Cancelar cuenta
            </button>
          </div>

        </aside>
      </div>

      {/* ── Modal: confirmar solicitud ── */}
      {solSeleccionada && (
        <div className="mop-overlay" onClick={() => { if (!procesandoSol) { setSolSel(null); setAccionSol(null); setPinSol('') } }}>
          <div className="mop-modal" onClick={e => e.stopPropagation()}>
            <div className="mop-modal-header">
              {accionSol === 'aprobar' ? 'APROBAR SOLICITUD' : 'RECHAZAR SOLICITUD'}
            </div>
            <div className="mop-modal-body">
              <div className="mop-modal-msg">
                {accionSol === 'aprobar'
                  ? (solSeleccionada.tipo === 'Cuenta'
                      ? <>Se cancelará la <b>cuenta completa</b> de la Mesa {numeroMesa}.</>
                      : <>Se cancelarán <b>{solSeleccionada.productos?.length ?? 0} producto(s)</b> de la cuenta.</>)
                  : <>La solicitud será rechazada y los productos quedarán intactos.</>
                }
              </div>
              <label className="mop-modal-lbl">PIN admin</label>
              <input
                className="mop-modal-inp"
                type="password"
                placeholder="PIN"
                maxLength={6}
                value={pinSol}
                onChange={e => setPinSol(e.target.value)}
                autoFocus
              />
            </div>
            <div className="mop-modal-footer">
              <button
                className="mop-modal-btn-cancel"
                onClick={() => { setSolSel(null); setAccionSol(null); setPinSol('') }}
                disabled={procesandoSol}
              >
                Cancelar
              </button>
              <button
                className={accionSol === 'aprobar' ? 'mop-modal-btn-aprobar' : 'mop-modal-btn-rechazar'}
                onClick={ejecutarSolicitud}
                disabled={procesandoSol || !pinSol}
              >
                {procesandoSol ? '...' : (accionSol === 'aprobar' ? 'CONFIRMAR APROBAR' : 'CONFIRMAR RECHAZAR')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: editar info ── */}
      {editarModal && cuenta && (
        <EditarInfoCuentaModal
          cuenta={{ ...cuenta, mesaNumero: numeroMesa }}
          onClose={() => setEditarModal(false)}
          onGuardar={handleGuardarInfo}
        />
      )}

      {/* ── Modal: cancelar cuenta ── */}
      {cancelModal && (
        <div className="mop-overlay" onClick={() => !cancelando && setCancelModal(false)}>
          <div className="mop-modal" onClick={e => e.stopPropagation()}>
            <div className="mop-modal-header">🚫 CANCELAR CUENTA — Mesa {numeroMesa}</div>
            <div className="mop-modal-body">
              <label className="mop-modal-lbl">PIN Admin</label>
              <input
                className="mop-modal-inp"
                type="password"
                placeholder="PIN"
                maxLength={6}
                value={cancelPin}
                onChange={e => setCancelPin(e.target.value)}
                autoFocus
              />
              <label className="mop-modal-lbl">Motivo de cancelación</label>
              <textarea
                className="mop-modal-textarea"
                placeholder="Motivo..."
                rows={3}
                value={cancelMotivo}
                onChange={e => setCancelMotivo(e.target.value)}
              />
            </div>
            <div className="mop-modal-footer">
              <button
                className="mop-modal-btn-cancel"
                onClick={() => setCancelModal(false)}
                disabled={cancelando}
              >
                Volver
              </button>
              <button
                className="mop-modal-btn-rechazar"
                onClick={handleCancelarCuenta}
                disabled={!cancelPin || !cancelMotivo || cancelando}
              >
                {cancelando ? 'Cancelando…' : 'CONFIRMAR CANCELACIÓN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal cobrar ── */}
      {cobrarModal && cuentaParaCobrar && (
        <CobrarCuentaModal
          cuenta={cuentaParaCobrar}
          auth={auth}
          onClose={() => setCobrarModal(false)}
          onCobrado={handleCobrado}
        />
      )}

      {/* Toast */}
      {toastMsg && <div className="mop-toast">{toastMsg}</div>}

    </div>
  )
}
