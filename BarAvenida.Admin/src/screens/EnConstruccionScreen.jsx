import './EnConstruccionScreen.css'

function GearIcon() {
  return (
    <svg className="enc-gear" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

export default function EnConstruccionScreen({ nombrePantalla = 'Esta sección', onVolver }) {
  return (
    <div className="enc-root">
      <div className="enc-particles" aria-hidden="true">
        {Array.from({ length: 20 }, (_, i) => (
          <span key={i} className="enc-particle" style={{ '--i': i }} />
        ))}
      </div>

      <div className="enc-content">
        <GearIcon />
        <h1 className="enc-title">{nombrePantalla.toUpperCase()}</h1>
        <p className="enc-subtitle">Esta sección está en construcción</p>
        <p className="enc-pronto shimmer">Próximamente disponible</p>
        <button className="enc-volver" onClick={onVolver}>
          ← Volver al Dashboard
        </button>
      </div>
    </div>
  )
}
