import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../api'
import ToastContainer from '../components/Toast'
import './AuditoriaScreen.css'

const PAGE_SIZE = 50

function toIsoDate(d) { return d.toISOString().slice(0, 10) }

function fmtFechaCorta(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return iso }
}

function escapeCsv(v) {
  if (v == null) return ''
  const s = typeof v === 'string' ? v : (typeof v === 'object' ? JSON.stringify(v) : String(v))
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function rangoRapido(tipo) {
  const hoy = new Date()
  switch (tipo) {
    case 'hoy':   return { desde: toIsoDate(hoy), hasta: toIsoDate(hoy) }
    case 'ayer': {
      const d = new Date(hoy); d.setDate(d.getDate() - 1)
      return { desde: toIsoDate(d), hasta: toIsoDate(d) }
    }
    case 'semana': {
      const d = new Date(hoy); d.setDate(d.getDate() - 6)
      return { desde: toIsoDate(d), hasta: toIsoDate(hoy) }
    }
    case 'mes': {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      return { desde: toIsoDate(d), hasta: toIsoDate(hoy) }
    }
    default: return { desde: toIsoDate(hoy), hasta: toIsoDate(hoy) }
  }
}

export default function AuditoriaScreen({ auth, onVolver }) {
  const [desde, setDesde]           = useState(toIsoDate(new Date()))
  const [hasta, setHasta]           = useState(toIsoDate(new Date()))
  const [categoria, setCategoria]   = useState('')
  const [tipo, setTipo]             = useState('')
  const [usuarioId, setUsuarioId]   = useState('')
  const [page, setPage]             = useState(1)

  const [items, setItems]           = useState([])
  const [total, setTotal]           = useState(0)
  const [tipos, setTipos]           = useState([])      // [{ categoria, tipo }, …]
  const [usuarios, setUsuarios]     = useState([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [expandido, setExpandido]   = useState(null)    // id de fila expandida
  const [toasts, setToasts]         = useState([])

  const toast = useCallback((msg, t = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(ts => [...ts, { id, mensaje: msg, tipo: t }])
  }, [])
  const dismissToast = (id) => setToasts(ts => ts.filter(t => t.id !== id))

  // ── Carga inicial: tipos + usuarios ──
  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([
          api.adminGetAuditoriaTipos(auth.token).catch(() => []),
          api.getUsuarios(auth.token).catch(() => []),
        ])
        setTipos(Array.isArray(t) ? t : [])
        setUsuarios(Array.isArray(u) ? u : [])
      } catch {}
    })()
  }, [auth.token])

  // ── Buscar ──
  const buscar = useCallback(async (overridePage = null) => {
    setLoading(true); setError('')
    try {
      const p = overridePage ?? page
      const res = await api.adminGetAuditoria(auth.token, {
        desde, hasta, categoria, tipo, usuarioId,
        page: p, pageSize: PAGE_SIZE,
      })
      setItems(res?.items ?? [])
      setTotal(res?.total ?? 0)
      if (overridePage != null) setPage(overridePage)
    } catch (e) {
      setError(e.message || 'Error al cargar auditoría')
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [auth.token, desde, hasta, categoria, tipo, usuarioId, page])

  // Búsqueda inicial
  useEffect(() => { buscar(1) /* eslint-disable-next-line */ }, [])

  // ── Filtros derivados ──
  const categoriasDisponibles = useMemo(() => {
    const set = new Set(tipos.map(x => x.categoria).filter(Boolean))
    return Array.from(set).sort()
  }, [tipos])

  const tiposDisponibles = useMemo(() => {
    const filtrados = categoria
      ? tipos.filter(x => x.categoria === categoria)
      : tipos
    const set = new Set(filtrados.map(x => x.tipo).filter(Boolean))
    return Array.from(set).sort()
  }, [tipos, categoria])

  const handleCategoriaChange = (v) => {
    setCategoria(v)
    setTipo('')  // reset tipo si cambia categoría
  }

  const handleRango = (k) => {
    const r = rangoRapido(k)
    setDesde(r.desde); setHasta(r.hasta); setPage(1)
    setTimeout(() => buscar(1), 0)
  }

  const handleBuscar = () => { setPage(1); buscar(1) }

  const totalPaginas = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE))

  const irPagina = (p) => {
    const next = Math.max(1, Math.min(totalPaginas, p))
    if (next === page) return
    buscar(next)
  }

  const exportarCsv = () => {
    if (!items?.length) {
      toast('No hay registros para exportar', 'error')
      return
    }
    const headers = ['Fecha','Categoria','Tipo','Usuario','Descripcion','IP','Detalles']
    const rows = items.map(x => [
      x.fecha ?? x.timestamp ?? '',
      x.categoria ?? '',
      x.tipo ?? '',
      x.usuarioNombre ?? x.usuario ?? '',
      x.descripcion ?? x.mensaje ?? '',
      x.ip ?? x.direccionIp ?? '',
      x.detalles != null ? (typeof x.detalles === 'string' ? x.detalles : JSON.stringify(x.detalles)) : '',
    ])
    const csv = [headers, ...rows].map(r => r.map(escapeCsv).join(',')).join('\n')
    // BOM para Excel
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `auditoria-${desde}_a_${hasta}-p${page}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast(`Exportados ${items.length} registros`, 'success')
  }

  const renderPaginacion = () => {
    if (totalPaginas <= 1) return null
    // Hasta 5 botones de página alrededor del actual
    const pages = []
    const start = Math.max(1, page - 2)
    const end   = Math.min(totalPaginas, start + 4)
    for (let i = start; i <= end; i++) pages.push(i)

    return (
      <div className="aud-pagin">
        <button
          className="aud-pagin-btn"
          onClick={() => irPagina(page - 1)}
          disabled={page <= 1 || loading}
        >←</button>
        {start > 1 && (
          <>
            <button className="aud-pagin-btn" onClick={() => irPagina(1)}>1</button>
            {start > 2 && <span className="aud-pagin-sep">…</span>}
          </>
        )}
        {pages.map(p => (
          <button
            key={p}
            className={`aud-pagin-btn${p === page ? ' aud-pagin-act' : ''}`}
            onClick={() => irPagina(p)}
            disabled={loading}
          >{p}</button>
        ))}
        {end < totalPaginas && (
          <>
            {end < totalPaginas - 1 && <span className="aud-pagin-sep">…</span>}
            <button className="aud-pagin-btn" onClick={() => irPagina(totalPaginas)}>{totalPaginas}</button>
          </>
        )}
        <button
          className="aud-pagin-btn"
          onClick={() => irPagina(page + 1)}
          disabled={page >= totalPaginas || loading}
        >→</button>
      </div>
    )
  }

  return (
    <div className="aud-screen">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <div className="aud-header">
        <button className="aud-back" onClick={onVolver}>← Volver</button>
        <h2 className="aud-title">🔍 Auditoría del sistema</h2>
      </div>

      {/* Filtros */}
      <div className="aud-filter-bar">
        <div className="aud-filter-group">
          <label>Desde</label>
          <input
            type="date"
            className="aud-input"
            value={desde}
            onChange={e => setDesde(e.target.value)}
          />
          <label>Hasta</label>
          <input
            type="date"
            className="aud-input"
            value={hasta}
            onChange={e => setHasta(e.target.value)}
          />
        </div>

        <div className="aud-filter-group">
          <label>Categoría</label>
          <select
            className="aud-input aud-select"
            value={categoria}
            onChange={e => handleCategoriaChange(e.target.value)}
          >
            <option value="">Todas</option>
            {categoriasDisponibles.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label>Tipo</label>
          <select
            className="aud-input aud-select"
            value={tipo}
            onChange={e => setTipo(e.target.value)}
          >
            <option value="">Todos</option>
            {tiposDisponibles.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <label>Usuario</label>
          <select
            className="aud-input aud-select"
            value={usuarioId}
            onChange={e => setUsuarioId(e.target.value)}
          >
            <option value="">Todos</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>
                {u.nombre || u.codigo || `#${u.id}`}
              </option>
            ))}
          </select>

          <button className="aud-btn-buscar" onClick={handleBuscar} disabled={loading}>
            {loading ? '…' : 'Buscar'}
          </button>
        </div>

        <div className="aud-quick-btns">
          {[
            { k: 'hoy',    l: 'Hoy'    },
            { k: 'ayer',   l: 'Ayer'   },
            { k: 'semana', l: 'Semana' },
            { k: 'mes',    l: 'Mes'    },
          ].map(({ k, l }) => (
            <button key={k} className="aud-qbtn" onClick={() => handleRango(k)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="aud-body">
        {error && <div className="aud-error">{error}</div>}

        <div className="aud-table-wrap">
          <table className="aud-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Fecha</th>
                <th>Categoría</th>
                <th>Tipo</th>
                <th>Usuario</th>
                <th>Descripción</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="aud-vacio">Cargando…</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={7} className="aud-vacio">No hay eventos que coincidan con los filtros</td></tr>
              )}
              {!loading && items.map(it => {
                const id   = it.id ?? `${it.fecha}-${it.tipo}-${it.usuarioId}`
                const open = expandido === id
                return (
                  <RowAuditoria
                    key={id}
                    id={id}
                    item={it}
                    abierto={open}
                    onToggle={() => setExpandido(open ? null : id)}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="aud-footer">
        <div className="aud-footer-info">
          <span className="aud-total-num">{total.toLocaleString('es-MX')}</span> resultados
          {totalPaginas > 1 && (
            <span className="aud-pag-info"> · página {page} de {totalPaginas}</span>
          )}
        </div>
        {renderPaginacion()}
        <button
          className="aud-csv-btn"
          onClick={exportarCsv}
          disabled={loading || !items.length}
          title="Exportar resultados visibles como CSV"
        >
          ⬇ Exportar CSV
        </button>
      </div>
    </div>
  )
}

function RowAuditoria({ id, item, abierto, onToggle }) {
  const fecha       = item.fecha ?? item.timestamp
  const usuario     = item.usuarioNombre ?? item.usuario ?? (item.usuarioId != null ? `#${item.usuarioId}` : '—')
  const descripcion = item.descripcion ?? item.mensaje ?? ''
  const ip          = item.ip ?? item.direccionIp ?? '—'
  const detalles    = item.detalles
  let detallesStr   = ''
  if (detalles != null) {
    try {
      detallesStr = typeof detalles === 'string'
        ? JSON.stringify(JSON.parse(detalles), null, 2)
        : JSON.stringify(detalles, null, 2)
    } catch {
      detallesStr = String(detalles)
    }
  }
  const tieneDetalles = detallesStr.length > 0

  return (
    <>
      <tr
        className={`aud-tr${abierto ? ' aud-tr-open' : ''}${tieneDetalles ? ' aud-tr-clickable' : ''}`}
        onClick={tieneDetalles ? onToggle : undefined}
      >
        <td className="aud-td-arrow">
          {tieneDetalles ? (abierto ? '▾' : '▸') : ''}
        </td>
        <td className="aud-td-fecha">{fmtFechaCorta(fecha)}</td>
        <td>
          <span className="aud-chip aud-chip-cat">{item.categoria ?? '—'}</span>
        </td>
        <td>
          <span className="aud-chip aud-chip-tipo">{item.tipo ?? '—'}</span>
        </td>
        <td>{usuario}</td>
        <td className="aud-td-desc">{descripcion}</td>
        <td className="aud-td-ip">{ip}</td>
      </tr>
      {abierto && tieneDetalles && (
        <tr className="aud-tr-detail">
          <td></td>
          <td colSpan={6}>
            <div className="aud-detail-box">
              <div className="aud-detail-label">Detalles</div>
              <pre className="aud-detail-pre">{detallesStr}</pre>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
