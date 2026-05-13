/**
 * Icon — set de iconos SVG minimalistas para Tablet.
 */

const ICONS = {
  productos: 'M3 6.5L12 3l9 3.5v11L12 21l-9-3.5v-11zM3 6.5L12 10m0 0l9-3.5M12 10v11',
  cerveza:   'M6 11h12v9a2 2 0 01-2 2H8a2 2 0 01-2-2v-9zM6 11V8a2 2 0 012-2h8a2 2 0 012 2v3M18 12h2a2 2 0 012 2v3a2 2 0 01-2 2h-2',
  mesas:     'M3 8h18M5 8v12M19 8v12M3 4h18M9 12h6M9 16h6',
  cuentas:   'M5 4h11l3 3v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM8 9h7M8 13h7M8 17h4',
  cobrar:    'M3 7h18a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1zM12 11a2 2 0 100 4 2 2 0 000-4z',
  add:       'M12 5v14m-7-7h14',
  trash:     'M4 7h16M9 7V4h6v3M6 7v13a2 2 0 002 2h8a2 2 0 002-2V7M10 11v7m4-7v7',
  edit:      'M16 3l5 5-11 11H5v-5L16 3zm-2 2l5 5',
  close:     'M6 6l12 12M18 6L6 18',
  check:     'M5 12l5 5 9-12',
  back:      'M15 18l-6-6 6-6',
  search:    'M11 19a8 8 0 100-16 8 8 0 000 16zm10 2l-5-5',
  imprimir:  'M6 9V3h12v6M6 18H4a1 1 0 01-1-1v-6a1 1 0 011-1h16a1 1 0 011 1v6a1 1 0 01-1 1h-2M6 14h12v7H6v-7z',
  alerta:    'M12 3l10 17H2L12 3zm0 6v5m0 3v.5',
  options:   'M5 12a1 1 0 110 2 1 1 0 010-2zm7 0a1 1 0 110 2 1 1 0 010-2zm7 0a1 1 0 110 2 1 1 0 010-2z',
  usuario:   'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  logout:    'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9',
  eye:       'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zm10 3a3 3 0 100-6 3 3 0 000 6z',
  cancel:    'M12 2a10 10 0 100 20 10 10 0 000-20zm4 6l-8 8m0-8l8 8',
  efectivo:  'M3 7h18a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1zm9 4a2 2 0 100 4 2 2 0 000-4z',
  tarjeta:   'M3 6h18a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1zm-1 4h20',
  refresh:   'M3 12a9 9 0 0115-6.7L21 8m0 0V3m0 5h-5M21 12a9 9 0 01-15 6.7L3 16m0 0v5m0-5h5',
}

export default function Icon({ name, size = 20, strokeWidth = 1.5, className, style, color, ...rest }) {
  const path = ICONS[name]
  if (!path) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" rx="3" />
      </svg>
    )
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      {...rest}
    >
      <path d={path} />
    </svg>
  )
}
