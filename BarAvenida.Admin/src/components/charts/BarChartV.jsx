import { useState } from 'react'

export default function BarChartV({ data = [], xKey = 'x', yKey = 'y', color = '#f0c842', height = 200 }) {
  const [hover, setHover] = useState(null)

  if (!data.length) return <div className="chart-empty">Sin datos</div>

  const maxVal = Math.max(...data.map(d => d[yKey]), 1)
  const fmt    = (v) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`
  const fmtH   = (h) => `${String(h).padStart(2, '0')}:00`

  return (
    <div className="bcv-wrap" style={{ height }}>
      <div className="bcv-bars">
        {data.map((d, i) => {
          const pct = (d[yKey] / maxVal) * 100
          return (
            <div
              key={i}
              className="bcv-col"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {hover === i && (
                <div className="bcv-tooltip">
                  <div className="bcv-tt-h">{fmtH(d[xKey])}</div>
                  <div className="bcv-tt-v">{fmt(d[yKey])}</div>
                  {d.cuentas != null && <div className="bcv-tt-c">{d.cuentas} cuentas</div>}
                </div>
              )}
              <div className="bcv-bar-track">
                <div
                  className="bcv-bar-fill"
                  style={{ height: `${pct}%`, background: pct > 0 ? color : 'transparent' }}
                />
              </div>
              <div className="bcv-x-label">{d[xKey]}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
