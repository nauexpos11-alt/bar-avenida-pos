/**
 * Icon — KDS variant.
 */
const ICONS = {
  check:    'M5 12l5 5 9-12',
  alerta:   'M12 3l10 17H2L12 3zm0 6v5m0 3v.5',
  refresh:  'M3 12a9 9 0 0115-6.7L21 8m0 0V3m0 5h-5M21 12a9 9 0 01-15 6.7L3 16m0 0v5m0-5h5',
  imprimir: 'M6 9V3h12v6M6 18H4a1 1 0 01-1-1v-6a1 1 0 011-1h16a1 1 0 011 1v6a1 1 0 01-1 1h-2M6 14h12v7H6v-7z',
  ticket:   'M2 9a2 2 0 012-2h16a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V9z',
  close:    'M6 6l12 12M18 6L6 18',
  kds:      'M3 4h18v14a2 2 0 01-2 2H5a2 2 0 01-2-2V4zm0 4h18',
}

export default function Icon({ name, size = 20, strokeWidth = 1.5, className, style, color, ...rest }) {
  const path = ICONS[name]
  if (!path) return null
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
