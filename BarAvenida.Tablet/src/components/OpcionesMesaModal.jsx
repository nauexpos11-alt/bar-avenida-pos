import { useState } from 'react'
import { api } from '../api'
import './OpcionesMesaModal.css'

// ── SVG Icons ──────────────────────────────────────────
function IcoCapturar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="om-ico">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}
function IcoConsultar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className="om-ico">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}
function IcoCerrar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className="om-ico">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

// ── Opciones ───────────────────────────────────────────
export default function OpcionesMesaModal({
  mesa, cuenta, auth, onIrCapturar, onIrResumen, onCancelar,
}) {
  const [solicitando, setSolicitando] = useState(false)
  const [error, setError]             = useState(null)

  const nombreMesera = cuenta?.nombreMesera ?? cuenta?.mesera?.nombre ?? mesa?.nombreMesera ?? ''
  const totalActual  = cuenta?.total ?? mesa?.totalActual ?? 0

  const handleSolicitarCobro = async () => {
    if (solicitando) return
    console.log('[COBRO] Solicitando cobro, cuenta:', cuenta)
    if (!cuenta?.id) {
      setError('No hay cuenta cargada')
      return
    }
    setSolicitando(true)
    setError(null)
    try {
      const r = await api.solicitarCobro(auth.token, cuenta.id)
      console.log('[COBRO] Respuesta:', r)
      onCancelar()
    } catch (e) {
      console.error('[COBRO] Error:', e)
      setError(e.message ?? 'Error al solicitar cobro')
      setSolicitando(false)
    }
  }

  return (
    <div className="om-overlay" onClick={e => e.target === e.currentTarget && onCancelar()}>
      <div className="om-box">

        {/* Header */}
        <div className="om-header">
          <div className="om-title">MESA {mesa.numero}</div>
          {nombreMesera && (
            <div className="om-subtitle">
              {nombreMesera}
              {totalActual > 0 && ` — $${totalActual.toFixed(0)}`}
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: '6px 14px', color: '#f87171', fontSize: '0.78rem',
            background: '#1f0808', borderBottom: '1px solid #5a1010' }}>
            ⚠ {error}
          </div>
        )}

        {/* Grid 3 botones */}
        <div className="om-grid">
          <button className="om-btn" onClick={() => onIrCapturar(mesa)}>
            <IcoCapturar />
            <span>CAPTURAR</span>
          </button>
          <button className="om-btn" onClick={() => onIrResumen(mesa)}>
            <IcoConsultar />
            <span>CONSULTAR</span>
          </button>
          <button
            className="om-btn om-btn-pagar"
            onClick={handleSolicitarCobro}
            disabled={solicitando}
          >
            <span className="om-ico" style={{ fontSize: '1.4rem', height: 'auto' }}>💵</span>
            <span>{solicitando ? 'ENVIANDO...' : 'SOLICITAR\nCOBRO'}</span>
          </button>
        </div>

        {/* Footer */}
        <div className="om-footer">
          <button className="om-btn-cancelar" onClick={onCancelar}>
            CANCELAR
          </button>
        </div>

      </div>
    </div>
  )
}
