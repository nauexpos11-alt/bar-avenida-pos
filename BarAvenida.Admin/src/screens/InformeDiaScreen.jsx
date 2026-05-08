import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import './InformeDiaScreen.css'

const fmt = (n) => `$${Number(n ?? 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`

const ICONOS = {
  trofeo:     '\u{1F3C6}',
  medalla:    '\u{1F947}',
  reloj:      '⏰',
  inventario: '\u{1F4E6}',
  estrella:   '\u{1F31F}',
  tendencia:  '\u{1F4C9}',
  alerta:     '\u{1F6AB}',
  staff:      '\u{1F465}',
}
const ico = (key) => ICONOS[key] || '•'

function isoFecha(d) {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function SevBadge({ sev }) {
  return <span className={`id-sev id-sev-${sev.toLowerCase()}`}>{sev}</span>
}

function renderInline(t) {
  const partes = []
  let i = 0, key = 0
  while (i < t.length) {
    if (t.slice(i, i + 2) === '**') {
      const end = t.indexOf('**', i + 2)
      if (end > -1) { partes.push(<strong key={key++}>{t.slice(i + 2, end)}</strong>); i = end + 2; continue }
    }
    if (t[i] === '_' && (i === 0 || t[i - 1] === ' ')) {
      const end = t.indexOf('_', i + 1)
      if (end > -1) { partes.push(<em key={key++}>{t.slice(i + 1, end)}</em>); i = end + 1; continue }
    }
    const next = t.slice(i).search(/\*\*|\s_/)
    if (next === -1) { partes.push(t.slice(i)); break }
    partes.push(t.slice(i, i + next)); i += next
  }
  return partes
}

function MarkdownSimple({ texto }) {
  const lineas = texto.split('\n')
  const elementos = []
  let listaActual = null

  lineas.forEach((linea) => {
    const trim = linea.trim()
    const esLista = /^[-*]\s+/.test(trim)
    if (esLista) {
      if (!listaActual) { listaActual = []; elementos.push({ tipo: 'lista', items: listaActual }) }
      listaActual.push(trim.replace(/^[-*]\s+/, ''))
    } else {
      listaActual = null
      if (trim) elementos.push({ tipo: 'parrafo', texto: trim })
    }
  })

  return (
    <div className="id-md">
      {elementos.map((el, i) =>
        el.tipo === 'lista'
          ? <ul key={i}>{el.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}</ul>
          : <p key={i}>{renderInline(el.texto)}</p>
      )}
    </div>
  )
}

export default function InformeDiaScreen({ auth, onVolver }) {
  const [fecha,     setFecha]     = useState(() => isoFecha(new Date()))
  const [data,      setData]      = useState(null)
  const [error,     setError]     = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [analisis,  setAnalisis]  = useState(null)
  const [analizando, setAnalizando] = useState(false)

  const pedirAnalisisIa = useCallback(async () => {
    setAnalizando(true)
    try {
      const r = await api.adminAnalisisIa(auth.token, fecha)
      setAnalisis(r)
    } catch (e) {
      setAnalisis({ texto: 'Error: ' + e.message, esMock: true, provider: 'Error' })
    } finally {
      setAnalizando(false)
    }
  }, [auth.token, fecha])

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await api.adminGetInformeDia(auth.token, fecha)
      setData(d)
    } catch (e) {
      setError(e.message || 'Error al cargar informe')
    } finally {
      setLoading(false)
    }
  }, [auth.token, fecha])

  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="id-root">

      <header className="id-header">
        <button className="id-volver" onClick={onVolver}>&#9664; VOLVER</button>
        <div className="id-titulo-wrap">
          <h1 className="id-titulo">INFORME DEL DIA</h1>
          {data && <span className="id-fecha-texto">{data.fechaTexto}</span>}
        </div>
        <div className="id-fecha-picker">
          <label className="id-fecha-lbl">Fecha</label>
          <input
            type="date"
            className="id-fecha-input"
            value={fecha}
            max={isoFecha(new Date())}
            onChange={e => setFecha(e.target.value)}
          />
        </div>
      </header>

      {error && <div className="id-error">&#9888; {error}</div>}

      {loading && !data && (
        <div className="id-loading">Generando informe...</div>
      )}

      {data && (
        <div className="id-body">

          {/* RESUMEN */}
          <section className="id-section">
            <h2 className="id-sec-titulo">RESUMEN EJECUTIVO</h2>
            <p className="id-narrativa">{data.resumen.narrativa}</p>
            <div className="id-kpis">
              <div className="id-kpi id-kpi-gold">
                <span className="id-kpi-val">{fmt(data.resumen.ventasTotales)}</span>
                <span className="id-kpi-lbl">VENTAS</span>
              </div>
              <div className="id-kpi id-kpi-blue">
                <span className="id-kpi-val">{data.resumen.cuentasCobradas}</span>
                <span className="id-kpi-lbl">CUENTAS</span>
              </div>
              <div className="id-kpi id-kpi-green">
                <span className="id-kpi-val">{fmt(data.resumen.ticketPromedio)}</span>
                <span className="id-kpi-lbl">TICKET PROM.</span>
              </div>
              <div className="id-kpi id-kpi-gray">
                <span className="id-kpi-val">{data.resumen.productosVendidos}</span>
                <span className="id-kpi-lbl">PRODUCTOS</span>
              </div>
            </div>
          </section>

          {/* HIGHLIGHTS */}
          {data.highlights.length > 0 && (
            <section className="id-section">
              <h2 className="id-sec-titulo">HIGHLIGHTS</h2>
              <ul className="id-list">
                {data.highlights.map((h, i) => (
                  <li key={i} className="id-item">
                    <span className="id-item-ico">{ico(h.icono)}</span>
                    <div className="id-item-body">
                      <span className="id-item-titulo">{h.titulo}</span>
                      <span className="id-item-desc">{h.descripcion}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* COMPARATIVAS */}
          <section className="id-section">
            <h2 className="id-sec-titulo">COMPARATIVAS</h2>
            <div className="id-comparativas">
              <p className={`id-comp ${data.comparativas.ayer.startsWith('▲') ? 'id-comp-up' : data.comparativas.ayer.startsWith('▼') ? 'id-comp-down' : ''}`}>
                {data.comparativas.ayer}
              </p>
              <p className={`id-comp ${data.comparativas.semanaAnterior.startsWith('▲') ? 'id-comp-up' : data.comparativas.semanaAnterior.startsWith('▼') ? 'id-comp-down' : ''}`}>
                {data.comparativas.semanaAnterior}
              </p>
            </div>
          </section>

          {/* ANOMALIAS */}
          {data.anomalias.length > 0 && (
            <section className="id-section id-section-warn">
              <h2 className="id-sec-titulo">ANOMALIAS</h2>
              <ul className="id-list">
                {data.anomalias.map((a, i) => (
                  <li key={i} className={`id-anomalia id-sev-bg-${a.severidad.toLowerCase()}`}>
                    <SevBadge sev={a.severidad} />
                    <span className="id-anomalia-msg">{a.mensaje}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* RECOMENDACIONES */}
          {data.recomendaciones.length > 0 && (
            <section className="id-section">
              <h2 className="id-sec-titulo">RECOMENDACIONES</h2>
              <ul className="id-list">
                {data.recomendaciones.map((r, i) => (
                  <li key={i} className="id-reco">
                    <span className="id-item-ico">{ico(r.icono)}</span>
                    <div className="id-item-body">
                      <span className="id-item-titulo">{r.titulo}</span>
                      <span className="id-item-desc">{r.detalle}</span>
                      <span className="id-reco-cat">{r.categoria}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ANALISIS IA */}
          <section className="id-section id-ia-section">
            <div className="id-ia-header">
              <h2 className="id-sec-titulo">ANALISIS IA</h2>
              <button
                className="id-ia-btn"
                onClick={pedirAnalisisIa}
                disabled={analizando}
              >
                {analizando ? 'Analizando...' : 'Pedir analisis IA'}
              </button>
            </div>
            {analisis && (
              <div className={`id-ia-resultado ${analisis.esMock ? 'id-ia-mock' : 'id-ia-real'}`}>
                <div className="id-ia-meta">
                  <span className="id-ia-provider">{analisis.provider}</span>
                  {analisis.modelo && <span className="id-ia-modelo"> · {analisis.modelo}</span>}
                  {analisis.tokensUsados && <span className="id-ia-tokens"> · {analisis.tokensUsados} tokens</span>}
                </div>
                <MarkdownSimple texto={analisis.texto} />
              </div>
            )}
          </section>

          {/* Sin datos */}
          {data.resumen.cuentasCobradas === 0 &&
           data.highlights.length === 0 &&
           data.anomalias.length === 0 &&
           data.recomendaciones.length === 0 && (
            <div className="id-vacio">
              <div className="id-vacio-ico">&#9654;</div>
              <p>Sin movimiento para esta fecha.</p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
