export default function BarChartH({ data = [], labelKey = 'label', valueKey = 'value', color = '#f0c842', maxItems = 10 }) {
  if (!data.length) return <div className="chart-empty">Sin datos</div>

  const slice  = data.slice(0, maxItems)
  const maxVal = Math.max(...slice.map(d => d[valueKey]), 1)
  const fmt    = (v) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`

  return (
    <div className="bch-wrap">
      {slice.map((d, i) => {
        const pct = (d[valueKey] / maxVal) * 100
        return (
          <div key={i} className="bch-row">
            <div className="bch-label" title={d[labelKey]}>{d[labelKey]}</div>
            <div className="bch-bar-track">
              <div
                className="bch-bar-fill"
                style={{ width: `${pct}%`, background: color, opacity: 1 - i * 0.06 }}
              />
            </div>
            <div className="bch-val">{fmt(d[valueKey])}</div>
            {d.unidades != null && <div className="bch-units">{d.unidades} uds</div>}
          </div>
        )
      })}
    </div>
  )
}
