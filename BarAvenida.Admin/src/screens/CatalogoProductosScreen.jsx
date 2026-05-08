import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api'
import ProductoModal  from '../components/ProductoModal'
import CategoriaModal from '../components/CategoriaModal'
import ToastContainer from '../components/Toast'
import './CatalogoProductosScreen.css'

// ── Helpers ───────────────────────────────────────────────
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
    <button
      className={`cat-btn-accion bta-${variante}`}
      onClick={onClick}
      title={titulo}
    >
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

function EmptyState({ mensaje, onCrear, labelCrear }) {
  return (
    <tr>
      <td colSpan={20} className="cat-empty-cell">
        <div className="cat-empty">
          <span className="cat-empty-icon">📦</span>
          <p className="cat-empty-msg">{mensaje}</p>
          {onCrear && (
            <button className="cat-btn-nuevo" onClick={onCrear}>{labelCrear}</button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Tabla Productos ───────────────────────────────────────
function TablaProductos({ productos, loading, onEditar, onDesactivar, onActivar }) {
  return (
    <table className="cat-table">
      <thead>
        <tr>
          <th className="cat-th cat-th-num">#</th>
          <th className="cat-th">NOMBRE</th>
          <th className="cat-th">CATEGORÍA</th>
          <th className="cat-th cat-th-centro">TIPO</th>
          <th className="cat-th cat-th-num">PRECIO</th>
          <th className="cat-th cat-th-centro">ESTADO</th>
          <th className="cat-th cat-th-acciones">ACCIONES</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <ShimmerRows cols={7} n={12} />
        ) : productos.length === 0 ? (
          <EmptyState mensaje="No hay productos que coincidan con los filtros." />
        ) : (
          productos.map((p, i) => (
            <tr
              key={p.id}
              className={`cat-tr${!p.activo ? ' cat-tr-inactivo' : ''}`}
              style={{ animationDelay: `${Math.min(i, 30) * 20}ms` }}
            >
              <td className="cat-td cat-td-num">{p.id}</td>
              <td className="cat-td cat-td-nombre">{p.nombre}</td>
              <td className="cat-td">
                <BadgeCat nombre={p.categoriaNombre} colorHex={p.categoriaColor} />
              </td>
              <td className="cat-td cat-td-centro">
                <span className="cat-tipo">{p.tipoVenta}</span>
              </td>
              <td className="cat-td cat-td-precio">
                ${Number(p.precio).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </td>
              <td className="cat-td cat-td-centro">
                <BadgeEstado activo={p.activo} />
              </td>
              <td className="cat-td cat-td-acciones">
                <BtnAccion onClick={() => onEditar(p)} titulo="Editar" variante="edit">✏</BtnAccion>
                {p.activo
                  ? <BtnAccion onClick={() => onDesactivar(p)} titulo="Desactivar" variante="warn">⏸</BtnAccion>
                  : <BtnAccion onClick={() => onActivar(p)}   titulo="Activar"    variante="ok">▶</BtnAccion>
                }
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

// ── Tabla Categorías ──────────────────────────────────────
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
                  titulo={c.cantidadProductosTotales > 0 ? 'No se puede eliminar: tiene productos' : 'Eliminar'}
                  variante={c.cantidadProductosTotales > 0 ? 'disabled' : 'danger'}
                >🗑</BtnAccion>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

// ── Screen Principal ──────────────────────────────────────
export default function CatalogoProductosScreen({ auth, onVolver }) {
  const [tab, setTab]             = useState('productos')
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading]     = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [filtroCat, setFiltroCat] = useState('')
  const [filtroAct, setFiltroAct] = useState('all')
  const [modalProd, setModalProd] = useState(null)
  const [modalCat, setModalCat]   = useState(null)
  const [toasts, setToasts]       = useState([])

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

  // ── Filtros ────────────────────────────────────────────
  const prodsFiltrados = productos.filter(p => {
    if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
    if (filtroCat && p.categoriaId !== Number(filtroCat)) return false
    if (filtroAct === 'true'  && !p.activo) return false
    if (filtroAct === 'false' &&  p.activo) return false
    return true
  })

  const catsFiltradas = categorias.filter(c =>
    !busqueda || c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  // ── Acciones productos ─────────────────────────────────
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

  // ── Acciones categorías ────────────────────────────────
  const handleEliminarCat = async (c) => {
    if (c.cantidadProductosTotales > 0) {
      addToast(`No se puede eliminar: "${c.nombre}" tiene productos asociados`, 'error')
      return
    }
    if (!window.confirm(`¿Eliminar la categoría "${c.nombre}"? Esta acción no se puede deshacer.`)) return
    try {
      await api.adminEliminarCategoria(auth.token, c.id)
      setCategorias(prev => prev.filter(x => x.id !== c.id))
      addToast(`Categoría "${c.nombre}" eliminada`, 'success')
    } catch (e) {
      addToast('Error: ' + e.message, 'error')
    }
  }

  // ── Callbacks de modales ────────────────────────────────
  const onProductoGuardado = (prod, esNuevo) => {
    if (esNuevo) {
      setProductos(prev => [...prev, prod])
    } else {
      setProductos(prev => prev.map(p => p.id === prod.id ? prod : p))
    }
    setModalProd(null)
    addToast(esNuevo ? `Producto "${prod.nombre}" creado` : `"${prod.nombre}" actualizado`, 'success')
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

  const cambiarTab = (t) => { setTab(t); setBusqueda(''); setFiltroCat(''); setFiltroAct('all') }

  const totalActivos = productos.filter(p => p.activo).length

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="cat-root">

      {/* ── Header ── */}
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
        <div className="cat-tabs" style={{ display:'flex', alignItems:'center', gap:4 }}>
          {onVolver && (
            <button onClick={onVolver} title="Volver al dashboard"
              style={{ background:'none', border:'none', color:'#666', fontSize:'1.1rem', cursor:'pointer', padding:'4px 8px', borderRadius:4, marginRight:8 }}>✕</button>
          )}
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
        <input
          className="cat-busqueda"
          placeholder={`Buscar ${tab === 'productos' ? 'productos' : 'categorías'}…`}
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />

        {tab === 'productos' && (
          <>
            <select
              className="cat-filtro-select"
              value={filtroCat}
              onChange={e => setFiltroCat(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
            <select
              className="cat-filtro-select"
              value={filtroAct}
              onChange={e => setFiltroAct(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </>
        )}

        <button
          className="cat-btn-nuevo ripple"
          onClick={() => tab === 'productos' ? setModalProd({ producto: null }) : setModalCat({ categoria: null })}
        >
          + {tab === 'productos' ? 'NUEVO PRODUCTO' : 'NUEVA CATEGORÍA'}
        </button>
      </div>

      {/* ── Body ── */}
      <div className="cat-body">
        {tab === 'productos' ? (
          <TablaProductos
            productos={prodsFiltrados}
            loading={loading}
            onEditar={p => setModalProd({ producto: p })}
            onDesactivar={handleDesactivar}
            onActivar={handleActivar}
          />
        ) : (
          <TablaCategorias
            categorias={catsFiltradas}
            loading={loading}
            onEditar={c => setModalCat({ categoria: c })}
            onEliminar={handleEliminarCat}
          />
        )}
      </div>

      {/* ── Modales ── */}
      {modalProd && (
        <ProductoModal
          auth={auth}
          producto={modalProd.producto}
          categorias={categorias.filter(c => c.activa)}
          onGuardado={onProductoGuardado}
          onCerrar={() => setModalProd(null)}
          onError={msg => addToast(msg, 'error')}
        />
      )}

      {modalCat && (
        <CategoriaModal
          auth={auth}
          categoria={modalCat.categoria}
          onGuardado={onCategoriaGuardada}
          onCerrar={() => setModalCat(null)}
          onError={msg => addToast(msg, 'error')}
        />
      )}

      {/* ── Toasts ── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
