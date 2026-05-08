import { useState, useEffect, useMemo } from 'react'
import { api } from '../api'
import './VerPreciosScreen.css'

function IcoCerrar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}
function IcoBuscar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

export default function VerPreciosScreen({ auth, onVolver }) {
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos]   = useState([])   // array plano de todos los productos
  const [loading, setLoading]       = useState(true)
  const [busqueda, setBusqueda]     = useState('')
  const [catFiltro, setCatFiltro]   = useState('')   // '' = todos

  // Cargar todas las categorías y sus productos al montar
  useEffect(() => {
    let cancelado = false

    async function cargar() {
      setLoading(true)
      try {
        const cats = await api.getCategorias(auth.token)
        const listaC = Array.isArray(cats) ? cats : []
        if (!cancelado) setCategorias(listaC)

        // Cargar productos de cada categoría en paralelo
        const resultados = await Promise.allSettled(
          listaC.map(c => api.getProductosPorCategoria(c.id, auth.token)
            .then(prods => (Array.isArray(prods) ? prods : []).map(p => ({
              ...p,
              categoriaNombre: c.nombre,
              categoriaId:     c.id,
            })))
          )
        )

        if (!cancelado) {
          const todos = resultados
            .filter(r => r.status === 'fulfilled')
            .flatMap(r => r.value)
          setProductos(todos)
        }
      } catch (e) {
        console.warn('VerPrecios:', e)
      } finally {
        if (!cancelado) setLoading(false)
      }
    }

    cargar()
    return () => { cancelado = true }
  }, [auth.token])

  // Filtro en tiempo real
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return productos.filter(p => {
      const matchCat = !catFiltro || String(p.categoriaId) === catFiltro
      const matchQ   = !q ||
        (p.nombre ?? '').toLowerCase().includes(q) ||
        String(p.id).includes(q)
      return matchCat && matchQ
    })
  }, [productos, busqueda, catFiltro])

  return (
    <div className="vp-root">

      {/* ── Header ── */}
      <div className="vp-header">
        <button className="vp-btn-cerrar" onClick={onVolver}>
          <IcoCerrar />
          <span>CERRAR</span>
        </button>
        <div className="vp-title">CONSULTA DE PRECIOS</div>
        <div className="vp-contador">
          {loading ? '...' : `${filtrados.length} productos`}
        </div>
      </div>

      {/* ── Barra de búsqueda + filtro ── */}
      <div className="vp-buscar-bar">
        <div className="vp-buscar-wrap">
          <IcoBuscar />
          <input
            className="vp-buscar-input"
            type="text"
            placeholder="Buscar por nombre o clave..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            autoComplete="off"
          />
          {busqueda && (
            <button className="vp-buscar-clear" onClick={() => setBusqueda('')}>✕</button>
          )}
        </div>

        <select
          className="vp-cat-select"
          value={catFiltro}
          onChange={e => setCatFiltro(e.target.value)}
        >
          <option value="">TODAS LAS CATEGORÍAS</option>
          {categorias.map(c => (
            <option key={c.id} value={String(c.id)}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {/* ── Tabla principal ── */}
      <div className="vp-tabla-wrapper">
        {loading ? (
          <div className="vp-loading">Cargando precios...</div>
        ) : (
          <table className="vp-tabla">
            <thead>
              <tr>
                <th className="vp-th vp-th-clave">CLAVE</th>
                <th className="vp-th vp-th-plu">PLU</th>
                <th className="vp-th vp-th-desc">DESCRIPCIÓN</th>
                <th className="vp-th vp-th-grupo">GRUPO</th>
                <th className="vp-th vp-th-precio">PRECIO</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="vp-vacio">
                    {busqueda || catFiltro
                      ? 'Sin resultados para la búsqueda'
                      : 'Sin productos cargados'}
                  </td>
                </tr>
              ) : (
                filtrados.map((p, i) => (
                  <tr key={`${p.id}-${i}`} className={i % 2 === 0 ? 'vp-tr-par' : 'vp-tr-impar'}>
                    <td className="vp-td vp-td-clave">{p.id}</td>
                    <td className="vp-td vp-td-plu">{p.plu ?? p.codigo ?? '—'}</td>
                    <td className="vp-td vp-td-desc">{p.nombre}</td>
                    <td className="vp-td vp-td-grupo">{p.categoriaNombre}</td>
                    <td className="vp-td vp-td-precio">${(p.precio ?? 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div className="vp-bottom">
        <button className="vp-bottom-cerrar" onClick={onVolver}>
          CERRAR
        </button>
      </div>

    </div>
  )
}
