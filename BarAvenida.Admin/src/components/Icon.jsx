/**
 * Icon — set de iconos SVG minimalistas tipo Lucide/Phosphor.
 * Stroke = currentColor → controlado por color CSS del padre.
 * Uso: <Icon name="productos" size={20} className="..." />
 */

const ICONS = {
  // Categorías / catálogo
  productos: 'M3 6.5L12 3l9 3.5v11L12 21l-9-3.5v-11zM3 6.5L12 10m0 0l9-3.5M12 10v11',
  cerveza:   'M6 11h12v9a2 2 0 01-2 2H8a2 2 0 01-2-2v-9zM6 11V8a2 2 0 012-2h8a2 2 0 012 2v3M18 12h2a2 2 0 012 2v3a2 2 0 01-2 2h-2M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2',

  // Operación
  mesas:   'M3 8h18M5 8v12M19 8v12M3 4h18M9 12h6M9 16h6',
  areas:   'M3 5h7v7H3V5zm0 11h7v3H3v-3zm11-11h7v3h-7V5zm0 7h7v7h-7v-7z',
  centro:  'M12 2l3.5 7L23 10l-5.5 5.5L19 23l-7-4-7 4 1.5-7.5L1 10l7.5-1L12 2z',
  pos:     'M5 4h14a2 2 0 012 2v3H3V6a2 2 0 012-2zM3 11h18v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9zm7 4h4',
  barra:   'M4 7h16v3H4V7zm1 3l1.5 11h11L19 10M9 14v4m3-4v4m3-4v4',
  cuentas: 'M5 4h11l3 3v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM8 9h7M8 13h7M8 17h4',
  cobrar:  'M3 7h18a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1zM12 11a2 2 0 100 4 2 2 0 000-4zM6 9v-.5M18 16v.5',
  caja:    'M3 9l2-5h14l2 5M3 9v10a2 2 0 002 2h14a2 2 0 002-2V9M3 9h18M8 13h8',

  // Reportes / análisis
  reportes:    'M3 21h18M5 17V9m4 8V5m4 12v-8m4 8V11m4 6V7',
  monitor:     'M3 13l4-4 5 5 5-7 4 4M3 21h18',
  dashboard:   'M3 3h7v9H3V3zm0 12h7v6H3v-6zm11-7h7v13h-7V8zm0-5h7v3h-7V3z',

  // Solicitudes / sugerencias
  sugerencias: 'M9 22h6M10 18h4M12 2a7 7 0 014 12.7c-.6.5-1 1.2-1 2v.3H9v-.3c0-.8-.4-1.5-1-2A7 7 0 0112 2z',
  alerta:      'M12 3l10 17H2L12 3zm0 6v5m0 3v.5',
  warning:     'M12 3l10 17H2L12 3zm0 6v5m0 3v.5',

  // Personal
  usuarios:    'M16 11a4 4 0 100-8 4 4 0 000 8zM8 13a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 21c0-3 2.5-5 6-5s6 2 6 5M14 21c0-3 2-5 5-5 1.5 0 3 .4 4 1.2',
  usuario:     'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6',

  // Config
  config:      'M12 9a3 3 0 100 6 3 3 0 000-6zm9.4 3a9.4 9.4 0 00-.1-1.6l2-1.5-2-3.5-2.4.8c-.8-.6-1.7-1.1-2.7-1.4L15.6 2h-4l-.6 2.8c-1 .3-1.9.8-2.7 1.4L5.8 5.4l-2 3.5 2 1.5a9.4 9.4 0 000 3.2l-2 1.5 2 3.5 2.4-.8c.8.6 1.7 1.1 2.7 1.4l.6 2.8h4l.6-2.8c1-.3 1.9-.8 2.7-1.4l2.4.8 2-3.5-2-1.5c.1-.5.1-1 .1-1.6z',

  // Acciones CRUD
  add:    'M12 5v14m-7-7h14',
  edit:   'M16 3l5 5-11 11H5v-5L16 3zm-2 2l5 5',
  trash:  'M4 7h16M9 7V4h6v3M6 7v13a2 2 0 002 2h8a2 2 0 002-2V7M10 11v7m4-7v7',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zm10 2l-5-5',
  close:  'M6 6l12 12M18 6L6 18',
  check:  'M5 12l5 5 9-12',
  imprimir: 'M6 9V3h12v6M6 18H4a1 1 0 01-1-1v-6a1 1 0 011-1h16a1 1 0 011 1v6a1 1 0 01-1 1h-2M6 14h12v7H6v-7z',

  // Navegación
  back:   'M15 18l-6-6 6-6',
  forward:'M9 6l6 6-6 6',
  up:     'M6 15l6-6 6 6',
  down:   'M6 9l6 6 6-6',
  refresh:'M3 12a9 9 0 0115-6.7L21 8m0 0V3m0 5h-5M21 12a9 9 0 01-15 6.7L3 16m0 0v5m0-5h5',

  // Estado
  pos_home:'M3 12l9-9 9 9v8a2 2 0 01-2 2h-3v-6h-8v6H5a2 2 0 01-2-2v-8z',
  shield: 'M12 2l9 3v6c0 5-3.8 9.7-9 11-5.2-1.3-9-6-9-11V5l9-3z',
  bell:   'M6 9a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9zM10 21a2 2 0 004 0',
  star:   'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z',
  qr:     'M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm4 11v3m-4 0v4m0-4h7m-7 4h4m3-4v4',
  history:'M3 12a9 9 0 109-9 9 9 0 00-9 9zm0 0H1m11 0V7m0 5l3 3',

  // KDS / orden
  kds:    'M3 4h18v14a2 2 0 01-2 2H5a2 2 0 01-2-2V4zm0 4h18M8 12h8m-8 4h5',
  ticket: 'M2 9a2 2 0 012-2h16a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V9zm8-2v12',

  // Cross-sell / promos
  promo:  'M20 12l-7 7-9-9V4h6l10 8z',
  link:   'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7L11.5 7M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7L12.5 17',

  // Audit
  audit:  'M9 3v3h6V3M5 5h14v16H5V5zm4 7h6m-6 4h6',
  cancel: 'M12 2a10 10 0 100 20 10 10 0 000-20zm4 6l-8 8m0-8l8 8',

  // Pago
  efectivo: 'M3 7h18a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1zm9 4a2 2 0 100 4 2 2 0 000-4z',
  tarjeta:  'M3 6h18a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1zm-1 4h20M6 15h4',

  // Misc
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9',
  arrow_right: 'M5 12h14m-6-6l6 6-6 6',
  arrow_left:  'M19 12H5m6 6l-6-6 6-6',
  filter: 'M3 5h18M6 12h12M10 19h4',
  menu:   'M4 6h16M4 12h16M4 18h16',
  options:'M5 12a1 1 0 110 2 1 1 0 010-2zm7 0a1 1 0 110 2 1 1 0 010-2zm7 0a1 1 0 110 2 1 1 0 010-2z',
  eye:    'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zm10 3a3 3 0 100-6 3 3 0 000 6z',
  lock:   'M6 11h12v9a1 1 0 01-1 1H7a1 1 0 01-1-1v-9zm2 0V7a4 4 0 018 0v4',
  key:    'M14.5 3a5.5 5.5 0 11-3.8 9.4L3 20.2V21h3v-3h3v-3h3.1A5.5 5.5 0 0114.5 3z',
}

export default function Icon({ name, size = 20, strokeWidth = 1.5, className, style, color, ...rest }) {
  const path = ICONS[name]
  if (!path) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className={className}
        style={style}
        aria-hidden="true"
      >
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
