import { useState } from 'react'
import { api } from '../api'
import NumPad from './NumPad'
import './AbrirMesaModal.css'

export default function AbrirMesaModal({ mesa, auth, onExito, onCancelar }) {
  const [personas, setPersonas]   = useState(2)
  const [showPersonas, setShowPersonas] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const handleAbrir = async () => {
    setLoading(true)
    setError(null)
    try {
      const cuenta = await api.abrirCuenta(auth.token, {
        mesaId:         mesa.id,
        meseraId:       auth.id,
        numeroPersonas: personas,
      })
      onExito(cuenta)
    } catch (e) {
      setError(e.message || 'No se pudo abrir la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ── Overlay principal ── */}
      <div className="am-overlay" onClick={e => e.target === e.currentTarget && onCancelar()}>
        <div className="am-box">

          {/* Header */}
          <div className="am-header">
            <div className="am-title">ABRIR CUENTA — MESA {mesa.numero}</div>
            <div className="am-subtitle">Captura los datos de la cuenta nueva</div>
          </div>

          {/* Body */}
          <div className="am-body">

            {/* ÁREA readonly */}
            <div className="am-campo am-campo-readonly">
              <span className="am-label">ÁREA</span>
              <span className="am-valor">{mesa.areaNombre ?? '—'}</span>
              <span className="am-ico-lock">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </span>
            </div>

            {/* MESA readonly */}
            <div className="am-campo am-campo-readonly">
              <span className="am-label">MESA</span>
              <span className="am-valor">{mesa.numero}</span>
              <span className="am-ico-lock">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </span>
            </div>

            {/* PERSONAS */}
            <button className="am-campo" onClick={() => setShowPersonas(true)}>
              <span className="am-label">NÚMERO DE PERSONAS</span>
              <span className="am-valor">
                {personas} {personas === 1 ? 'PERSONA' : 'PERSONAS'}
              </span>
              <span className="am-chevron">›</span>
            </button>

          </div>

          {/* Error */}
          {error && <div className="am-error">⚠ {error}</div>}

          {/* Footer */}
          <div className="am-footer">
            <button className="am-btn-cancelar" onClick={onCancelar} disabled={loading}>
              CANCELAR
            </button>
            <button className="am-btn-abrir" onClick={handleAbrir} disabled={loading}>
              {loading ? 'ABRIENDO...' : 'ABRIR MESA'}
            </button>
          </div>

        </div>
      </div>

      {/* ── NumPad: Cantidad de personas ── */}
      {showPersonas && (
        <NumPad
          titulo="NÚMERO DE PERSONAS"
          valorInicial={personas}
          valorMinimo={1}
          valorMaximo={30}
          onAceptar={v => { setPersonas(v); setShowPersonas(false) }}
          onCancelar={() => setShowPersonas(false)}
        />
      )}
    </>
  )
}
