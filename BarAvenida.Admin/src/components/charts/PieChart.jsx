import { useState } from 'react'

function polarToCart(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function slicePath(cx, cy, r, startDeg, endDeg) {
  const s   = polarToCart(cx, cy, r, startDeg)
  const e   = polarToCart(cx, cy, r, endDeg)
  const big = endDeg - startDeg > 180 ? 1 : 0
  return `M${cx},${cy} L${s.x},${s.y} A${r},${r} 0 ${big},1 ${e.x},${e.y} Z`
}

const FALLBACK_COLORS = ['#f0c842','#e67e22','#3498db','#2ecc71','#9b59b6','#e74c3c','#1abc9c','#f39c12']

export default function PieChart({ data = [], labelKey = 'label', valueKey = 'value', colorKey = 'color', size = 180 }) {
  const [hover, setHover] = useState(null)

  const filtered = data.filter(d => d[valueKey] > 0)
  if (!filtered.length) return <div className="chart-empty">Sin datos</div>

  const total  = filtered.reduce((s, d) => s + d[valueKey], 0)
  const cx     = size / 2
  const cy     = size / 2
  const r      = size / 2 - 8
  const ri     = r * 0.45

  let cursor = 0
  const slices = filtered.map((d, i) => {
    const pct   = d[valueKey] / total
    const deg   = pct * 360
    const start = cursor
    const end   = cursor + deg
    cursor = end
    return {
      ...d,
      pct,
      startDeg: start,
      endDeg:   end,
      color:    d[colorKey] || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    }
  })

  const fmt = (v) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`

  return (
    <div className="pc-wrap">
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        {slices.map((s, i) => (
          <path
            key={i}
            d={slicePath(cx, cy, r, s.startDeg, s.endDeg)}
            fill={s.color}
            opacity={hover === i ? 1 : 0.85}
            stroke="#0a0a0a"
            strokeWidth="1.5"
            style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        <circle cx={cx} cy={cy} r={ri} fill="#111" />
        {hover !== null ? (
          <>
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize="10" fill="#f0c842" fontWeight="bold">
              {(slices[hover].pct * 100).toFixed(1)}%
            </text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" fill="#aaa">
              {fmt(slices[hover][valueKey])}
            </text>
          </>
        ) : (
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize="9" fill="#666">total</text>
        )}
      </svg>

      <div className="pc-legend">
        {slices.map((s, i) => (
          <div
            key={i}
            className={`pc-leg-item${hover === i ? ' pc-leg-hover' : ''}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="pc-leg-dot" style={{ background: s.color }} />
            <span className="pc-leg-label">{s[labelKey]}</span>
            <span className="pc-leg-pct">{(s.pct * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
