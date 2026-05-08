import { useState } from 'react'

export default function LineChart({ data = [], xKey = 'x', yKey = 'y', color = '#f0c842', height = 220 }) {
  const [tooltip, setTooltip] = useState(null)

  if (!data.length) return <div className="chart-empty">Sin datos</div>

  const values  = data.map(d => d[yKey])
  const maxVal  = Math.max(...values, 1)
  const minVal  = 0
  const range   = maxVal - minVal || 1
  const W       = 600
  const H       = height - 40
  const padL    = 56
  const padR    = 16
  const padT    = 12
  const padB    = 28
  const chartW  = W - padL - padR
  const chartH  = H - padT - padB

  const pts = data.map((d, i) => ({
    x: padL + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padT + (1 - (d[yKey] - minVal) / range) * chartH,
    raw: d,
  }))

  const poly = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = [
    `${pts[0].x},${padT + chartH}`,
    ...pts.map(p => `${p.x},${p.y}`),
    `${pts[pts.length - 1].x},${padT + chartH}`,
  ].join(' ')

  const ticks = 4
  const yLabels = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = minVal + (range * i) / ticks
    return { y: padT + (1 - i / ticks) * chartH, v }
  })

  const fmt = (v) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`

  return (
    <div className="lc-wrap" style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lcGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yLabels.map((t, i) => (
          <g key={i}>
            <line x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke="#2a2a2a" strokeWidth="1" />
            <text x={padL - 6} y={t.y + 4} textAnchor="end" fontSize="9" fill="#888">{fmt(t.v)}</text>
          </g>
        ))}

        <polygon points={area} fill="url(#lcGrad)" />
        <polyline points={poly} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x} cy={p.y} r="4"
            fill={tooltip?.i === i ? '#fff' : color}
            stroke={color} strokeWidth="2"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setTooltip({ i, x: p.x, y: p.y, raw: p.raw })}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}

        {data.length <= 14 && pts.map((p, i) => (
          <text key={i} x={p.x} y={padT + chartH + padB - 4} textAnchor="middle" fontSize="9" fill="#666">
            {String(p.raw[xKey]).slice(-5)}
          </text>
        ))}
      </svg>

      {tooltip && (
        <div className="lc-tooltip" style={{
          left: `${(tooltip.x / W) * 100}%`,
          top:  `${(tooltip.y / (H)) * 100}%`,
        }}>
          <div className="lc-tt-label">{tooltip.raw[xKey]}</div>
          <div className="lc-tt-val">${Number(tooltip.raw[yKey]).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
          {tooltip.raw.cuentas != null && <div className="lc-tt-sub">{tooltip.raw.cuentas} cuentas</div>}
        </div>
      )}
    </div>
  )
}
