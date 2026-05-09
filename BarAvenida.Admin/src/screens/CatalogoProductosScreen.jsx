import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import CategoriaModal from '../components/CategoriaModal'
import ToastContainer from '../components/Toast'
import './CatalogoProductosScreen.css'

// ── Helpers ───────────────────────────────────────────────────
function contrastColor(hex) {
  if (!hex || hex.length < 7) return '#fff'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 145 ? '#000' : '#fff'
}

function BadgeCat({ nombre, colorHex }) {
  const bg  = colorHex || '#555'
  const col = contrastColor(bg)
  return (
    <span className="cat-badge-cat" style={{ background: bg, color: col }}>
      {nombre}
    </span>
  )
}

function BadgeEstado({ activo }) {
  return (
    <span className={`cat-badge-estado${activo ? ' est-activo' : ' est-inactivo'}`}>
      {activo ? 'ACTIVO' : 'INACTIVO'}
    </span>
  )
}

function BtnAccion({ onClick, titulo, children, variante = 'default' }) {
  return (
    <button className={`cat-btn-accion bta-${variante}`} onClick={onClick} title={titulo}>
      {children}
    </button>
  )
}

function ShimmerRows({ cols, n = 10 }) {
  return Array.from({ length: n }, (_, i) => (
    <tr key={i} className="cat-shimmer-row">
      {Array.from({ length: cols }, (_, j) => (
        <td key={j}><span className="shimmer cat-shimmer-cell" /></td>
      ))}
    </tr>
  ))
}

function EmptyState({ mensaje }) {
  return (
    <tr>
      <td colSpan={20} className="cat-empty-cell">
        <div className="cat-empty">
          <span className="cat-empty-icon">📦</span>
          <p className="cat-empty-msg">{mensaje}</p>
        </div>
      </td>
    </tr>
  )
}

// ── Tabla simplificada de productos (layout Soft Restaurant) ──
function TablaProductosLista({ productos, loading, selectedId, onSeleccionar }) {
  return (
    <table className="cat-table">
      <thead>
        <tr>
          <th className="cat-th cat-th-num">CLAVE</th>
          <th className="cat-th">GRUPO</th>
          <th className="cat-th">DESCRIPCIÓN</th>
          <th className="cat-th cat-th-num">PRECIO</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <ShimmerRows cols={4} n={12} />
        ) : productos.length === 0 ? (
          <EmptyState mensaje="No hay productos que coincidan con los filtros." />
        ) : (
          productos.map((p, i) => (
            <tr
              key={p.id}
              className={`cat-tr cat-tr-clickable${selectedId === p.id ? ' cat-tr-selected' : ''}${!p.activo ? ' cat-tr-inactivo' : ''}`}
              style={{ animationDelay: `${Math.min(i, 30) * 20}ms` }}
              onClick={() => onSeleccionar(p)}
            >
              <td className="cat-td cat-td-num">{p.id}</td>
              <td className="cat-td">
                <BadgeCat nombre={p.categoriaNombre} colorHex={p.categoriaColor} />
              </td>
              <td className="cat-td cat-td-nombre">{p.nombre}</td>
              <td className="cat-td cat-td-precio">
                ${Number(p.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

// ── Tabla de categorías (sin cambios) ──────────────────────────
function TablaCategorias({ categorias, loading, onEditar, onEliminar }) {
  return (
    <table className="cat-table">
      <thead>
        <tr>
          <th className="cat-th cat-th-num">#</th>
          <th className="cat-th">NOMBRE</th>
          <th className="cat-th cat-th-num">ORDEN</th>
          <th className="cat-th cat-th-centro">PRODUCTOS</th>
          <th className="cat-th cat-th-centro">ESTADO</th>
          <th className="cat-th cat-th-acciones">ACCIONES</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <ShimmerRows cols={6} n={8} />
        ) : categorias.length === 0 ? (
          <EmptyState mensaje="No hay categorías que coincidan." />
        ) : (
          categorias.map((c, i) => (
            <tr
              key={c.id}
              className={`cat-tr${!c.activa ? ' cat-tr-inactivo' : ''}`}
              style={{ animationDelay: `${Math.min(i, 30) * 20}ms` }}
            >
              <td className="cat-td cat-td-num">{c.id}</td>
              <td className="cat-td cat-td-nombre">
                <BadgeCat nombre={c.nombre} colorHex={c.colorHex} />
              </td>
              <td className="cat-td cat-td-num">{c.orden}</td>
              <td className="cat-td cat-td-centro">
                <span className="cat-prods-counter">
                  <span className="cp-activos">{c.cantidadProductosActivos}</span>
                  <span className="cp-sep">/</span>
                  <span className="cp-total">{c.cantidadProductosTotales}</span>
                </span>
              </td>
              <td className="cat-td cat-td-centro">
                <BadgeEstado activo={c.activa} />
              </td>
              <td className="cat-td cat-td-acciones">
                <BtnAccion onClick={() => onEditar(c)} titulo="Editar" variante="edit">✏</BtnAccion>
                <BtnAccion
                  onClick={() => onEliminar(c)}
                  titulo={c.cantidadProductosTotales > 0 ? `Tiene ${c.cantidadProductosTotales} productos — reasígnalos antes` : 'Eliminar categoría'}
                  variante={c.cantidadProductosTotales > 0 ? 'warn' : 'danger'}
                >🗑</BtnAccion>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

// ── Editor inline de producto (estilo Soft Restaurant) ────────
const TIPOS = ['Pieza', 'Shot', 'Botella']

function EditorProducto({ producto, categorias, auth, onGuardado, onCancelar, onError }) {
  const esNuevo = !producto?.id
  const [form, setForm] = useState({
    nombre:            producto?.nombre            ?? '',
    categoriaId:       producto?.categoriaId       ?? (categorias[0]?.id ?? ''),
    precio:            producto?.precio            ?? '',
    tipoVenta:         producto?.tipoVenta         ?? 'Pieza',
    cantidadDescuento: producto?.cantidadDescuento ?? 1,
    orden:             producto?.orden             ?? 0,
    activo:            producto?.activo            ?? true,
  })
  const [guardando, setGuardando] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const mostrarCantidad = form.tipoVenta === 'Shot' || form.tipoVenta === 'Botella'

  const handleGuardar = async () => {
    if (!form.nombre.trim()) return
    setGuardando(true)
    try {
      const dto = {
        nombre:            form.nombre.trim(),
        categoriaId:       Number(form.categoriaId),
        precio:            Number(form.precio) || 0,
        tipoVenta:         form.tipoVenta,
        cantidadDescuento: Number(form.cantidadDescuento) || 1,
        orden:             Number(form.orden) || 0,
        ...(!esNuevo && { activo: form.activo }),
      }
      const result = esNuevo
        ? await api.adminCrearProducto(auth.token, dto)
        : await api.adminActualizarProducto(auth.token, producto.id, dto)
      onGuardado(result, esNuevo)
    } catch (e) {
      onError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="ep-root">
      <div className="ep-header">
        <span className="ep-titulo">{esNuevo ? 'NUEVO PRODUCTO' : 'EDITAR PRODUCTO'}</span>
        <button className="ep-close" onClick={onCancelar} title="Cerrar editor">✕</button>
      </div>

      <div className="ep-fields">
        <label className="ep-label">NOMBRE</label>
        <input
          className="ep-input"
          value={form.nombre}
          onChange={e => set('nombre', e.target.value)}
          maxLength={100}
          placeholder="Nombre del producto"
          autoFocus
        />

        <label className="ep-label">CATEGORÍA</label>
        <select
          className="ep-select"
          value={form.categoriaId}
          onChange={e => set('categoriaId', e.target.value)}
        >
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>

        <label className="ep-label">PRECIO</label>
        <div className="ep-prefix-wrap">
          <span className="ep-prefix">$</span>
          <input
            className="ep-input ep-input-pfx"
            type="number"
            min="0"
            step="0.01"
            value={form.precio}
            onChange={e => set('precio', e.target.value)}
            placeholder="0.00"
          />
        </div>

        <label className="ep-label">TIPO DE VENTA</label>
        <div className="ep-tipo-grid">
          {TIPOS.map(t => (
            <button
              key={t}
              type="button"
              className={`ep-tipo-btn${form.tipoVenta === t ? ' ep-tipo-act' : ''}`}
              onClick={() => set('tipoVenta', t)}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {mostrarCantidad && (
          <>
            <label className="ep-label">
              CANTIDAD DESCUENTO
              <span className="ep-hint"> (shots por servicio o unidades por botella)</span>
            </label>
            <input
              className="ep-input"
              type="number"
              min="1"
              step="0.5"
              value={form.cantidadDescuento}
              onChange={e => set('cantidadDescuento', e.target.value)}
            />
          </>
        )}

        <label className="ep-label">ORDEN</label>
        <input
          className="ep-input"
          type="number"
          value={form.orden}
          onChange={e => set('orden', e.target.value)}
        />

        {!esNuevo && (
          <>
            <label className="ep-label">ESTADO</label>
            <button
              type="button"
              className={`ep-toggle${form.activo ? ' ep-toggle-on' : ' ep-toggle-off'}`}
              onClick={() => set('activo', !form.activo)}
            >
              {form.activo ? 'ACTIVO' : 'INACTIVO'}
            </button>
          </>
        )}
      </div>

      <div className="ep-actions">
        <button className="ep-btn-cancel" onClick={onCancelar}>CANCELAR</button>
        <button
          className="ep-btn-save"
          onClick={handleGuardar}
          disabled={!form.nombre.trim() || guardando}
        >
          {guardando ? '...' : 'GUARDAR'}
        </button>
      </div>
    </div>
  )
}

// ── Screen Principal ──────────────────────────────────────────
export default function CatalogoProductosScreen({ auth }) {
  const [tab, setTab]               = useState('productos')
  const [productos, setProductos]   = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading]       = useState(true)
  const [busqueda, setBusqueda]     = useState('')
  const [filtroCat, setFiltroCat]   = useState('')
  const [filtroAct, setFiltroAct]   = useState('all')
  const [productoEdicion, setProductoEdicion] = useState(null)
  const [modalCat, setModalCat]     = useState(null)
  const [toasts, setToasts]         = useState([])
  const [confirmarElimCat, setConfirmarElimCat] = useState(null)

  const addToast = useCallback((mensaje, tipo = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, mensaje, tipo }])
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [prods, cats] = await Promise.all([
        api.adminGetProductos(auth.token, {}),
        api.adminGetCategorias(auth.token),
      ])
      setProductos(Array.isArray(prods) ? prods : [])
      setCategorias(Array.isArray(cats) ? cats : [])
    } catch (e) {
      addToast('Error al cargar datos: ' + e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [auth.token, addToast])

  useEffect(() => { cargar() }, [cargar])

  // ── Filtros ────────────────────────────────────────────────
  const prodsFiltrados = productos.filter(p => {
    if (busqueda) {
      const q = busqueda.toLowerCase()
      const enNombre = p.nombre.toLowerCase().includes(q)
      const enCat    = (p.categoriaNombre ?? '').toLowerCase().includes(q)
      const enPrecio = String(p.precio).includes(q)
      if (!enNombre && !enCat && !enPrecio) return false
    }
    if (filtroCat && p.categoriaId !== Number(filtroCat)) return false
    if (filtroAct === 'true'  && !p.activo) return false
    if (filtroAct === 'false' &&  p.activo) return false
    return true
  })

  const catsFiltradas = categorias.filter(c =>
    !busqueda || c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  // ── Handlers productos ─────────────────────────────────────
  const handleDesactivar = async (p) => {
    try {
      await api.adminDesactivarProducto(auth.token, p.id)
      setProductos(prev => prev.map(x => x.id === p.id ? { ...x, activo: false } : x))
      addToast(`"${p.nombre}" desactivado`, 'success')
    } catch (e) {
      addToast('Error: ' + e.message, 'error')
    }
  }

  const handleActivar = async (p) => {
    try {
      const updated = await api.adminActivarProducto(auth.token, p.id)
      setProductos(prev => prev.map(x => x.id === p.id ? updated : x))
      addToast(`"${p.nombre}" activado`, 'success')
    } catch (e) {
      addToast('Error: ' + e.message, 'error')
    }
  }

  const onProductoGuardado = (prod, esNuevo) => {
    if (esNuevo) {
      setProductos(prev => [...prev, prod])
    } else {
      setProductos(prev => prev.map(p => p.id === prod.id ? prod : p))
    }
    setProductoEdicion(null)
    addToast(esNuevo ? `Producto "${prod.nombre}" creado` : `"${prod.nombre}" actualizado`, 'success')
  }

  // ── Handlers categorías ────────────────────────────────────
  const handleEliminarCat = (c) => {
    if (c.cantidadProductosTotales > 0) {
      addToast(`"${c.nombre}" tiene ${c.cantidadProductosTotales} producto${c.cantidadProductosTotales !== 1 ? 's' : ''}. Reasígnalos antes de eliminar.`, 'error')
      return
    }
    setConfirmarElimCat(c)
  }

  const confirmarYEliminarCat = async () => {
    const c = confirmarElimCat
    setConfirmarElimCat(null)
    try {
      await api.adminEliminarCategoria(auth.token, c.id)
      setCategorias(prev => prev.filter(x => x.id !== c.id))
      addToast(`Categoría "${c.nombre}" eliminada`, 'success')
    } catch (e) {
      addToast('Error: ' + e.message, 'error')
    }
  }

  const onCategoriaGuardada = (cat, esNuevo) => {
    if (esNuevo) {
      setCategorias(prev => [...prev, cat])
    } else {
      setCategorias(prev => prev.map(c => c.id === cat.id ? cat : c))
    }
    setModalCat(null)
    addToast(esNuevo ? `Categoría "${cat.nombre}" creada` : `"${cat.nombre}" actualizada`, 'success')
  }

  const cambiarTab = (t) => {
    setTab(t)
    setBusqueda('')
    setFiltroCat('')
    setFiltroAct('all')
    setProductoEdicion(null)
  }

  const totalActivos = productos.filter(p => p.activo).length

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="cat-root">

      {/* ── Header con tabs internos ── */}
      <div className="cat-header">
        <div className="cat-header-left">
          <h1 className="cat-titulo">
            <svg className="cat-titulo-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4zm0 6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2zm0 6a1 1 0 0 1 1-1h6a1 1 0 0 1 0 2H4a1 1 0 0 1-1-1z" />
            </svg>
            CATÁLOGO DE PRODUCTOS
          </h1>
          {!loading && (
            <span className="cat-stats">
              {totalActivos} activos · {productos.length} total · {categorias.length} categorías
            </span>
          )}
        </div>
        <div className="cat-tabs">
          <button
            className={`cat-tab${tab === 'productos' ? ' cat-tab-act' : ''}`}
            onClick={() => cambiarTab('productos')}
          >
            PRODUCTOS
          </button>
          <button
            className={`cat-tab${tab === 'categorias' ? ' cat-tab-act' : ''}`}
            onClick={() => cambiarTab('categorias')}
          >
            CATEGORÍAS
          </button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="cat-toolbar">
        {tab === 'productos' && (
          <select
            className="cat-filtro-select"
            value={filtroCat}
            onChange={e => setFiltroCat(e.target.value)}
          >
            <option value="">Todos los grupos</option>
            {categorias.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        )}

        <input
          className="cat-busqueda"
          placeholder={`Buscar ${tab === 'productos' ? 'por nombre, grupo o precio' : 'categorías'}…`}
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />

        {tab === 'productos' && (
          <select
            className="cat-filtro-select"
            value={filtroAct}
            onChange={e => setFiltroAct(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        )}

        <button
          className="cat-btn-nuevo ripple"
          onClick={() => {
            if (tab === 'productos') {
              setProductoEdicion({})
            } else {
              setModalCat({ categoria: null })
            }
          }}
        >
          + {tab === 'productos' ? 'NUEVO PRODUCTO' : 'NUEVA CATEGORÍA'}
        </button>
      </div>

      {/* ── Body ── */}
      {tab === 'productos' ? (
        <div className="cat-split">
          {/* Lista izquierda */}
          <div className="cat-lista">
            <TablaProductosLista
              productos={prodsFiltrados}
              loading={loading}
              selectedId={productoEdicion?.id ?? null}
              onSeleccionar={(p) => setProductoEdicion(p)}
            />
          </div>

          {/* Editor derecho */}
          <div className="cat-editor-panel">
            {productoEdicion !== null ? (
              <EditorProducto
                key={productoEdicion?.id ?? 'nuevo'}
                producto={productoEdicion?.id ? productoEdicion : null}
                categorias={categorias.filter(c => c.activa)}
                auth={auth}
                onGuardado={onProductoGuardado}
                onCancelar={() => setProductoEdicion(null)}
                onError={msg => addToast(msg, 'error')}
              />
            ) : (
              <div className="cat-editor-vacio">
                <span className="cat-editor-vacio-ico">📦</span>
                <p className="cat-editor-vacio-msg">
                  Haz clic en un producto<br />para editar, o presiona<br />
                  <strong>+ Nuevo Producto</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="cat-body">
          <TablaCategorias
            categorias={catsFiltradas}
            loading={loading}
            onEditar={c => setModalCat({ categoria: c })}
            onEliminar={handleEliminarCat}
          />
        </div>
      )}

      {/* ── Modal categoría ── */}
      {modalCat && (
        <CategoriaModal
          auth={auth}
          categoria={modalCat.categoria}
          onGuardado={onCategoriaGuardada}
          onCerrar={() => setModalCat(null)}
          onError={msg => addToast(msg, 'error')}
        />
      )}

      {/* ── Modal confirmar eliminar categoría ── */}
      {confirmarElimCat && (
        <div className="cat-confirm-overlay">
          <div className="cat-confirm-box">
            <p className="cat-confirm-title">¿Eliminar categoría?</p>
            <p className="cat-confirm-msg">
              Se eliminará <strong>"{confirmarElimCat.nombre}"</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="cat-confirm-btns">
              <button className="cat-confirm-no" onClick={() => setConfirmarElimCat(null)}>Cancelar</button>
              <button className="cat-confirm-si" onClick={confirmarYEliminarCat}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
