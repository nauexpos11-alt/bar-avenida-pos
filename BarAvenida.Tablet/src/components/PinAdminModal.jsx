import { useState, useEffect } from 'react'
import { api } from '../api'
import './PinAdminModal.css'

export default function PinAdminModal({ token, titulo, subtitulo, onValidado, onCancelar }) {
  const [pin, setPin]         = useState('')
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)

  const handleDigit = (d) => {
    if (pin.length >= 4 || loading) return
    setPin(prev => prev + d)
    setError(null)
  }
  const handleBorrar = () => {
    if (loading) return
    setPin(prev => prev.slice(0, -1))
    setError(null)
  }

  const handleConfirmar = async () => {
    if (pin.length !== 4) return
    setLoading(true)
    setError(null)
    console.log('[PIN] Validando PIN admin...')
    try {
      const r = await api.validarPinAdmin(token, pin)
      console.log('[PIN] Respuesta:', r)
      if (r?.ok) {
        onValidado({ ...r, pin })
      } else {
        setError('PIN no autorizado')
        setPin('')
      }
    } catch (e) {
      console.error('[PIN] Error:', e)
      const msg = e.status === 401
        ? 'PIN incorrecto. Intenta de nuevo.'
        : (e.message ?? 'Error al validar PIN')
      setError(msg)
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit al completar 4 dígitos
  useEffect(() => {
    if (pin.length === 4 && !loading) handleConfirmar()
  }, [pin])

  return (
    <div className="pin-overlay" onClick={e => e.target === e.currentTarget && !loading && onCancelar()}>
      <div className="pin-box">

        <div className="pin-header">
          <div className="pin-title">{titulo ?? 'AUTORIZACIÓN REQUERIDA'}</div>
          {subtitulo && <div className="pin-subtitle">{subtitulo}</div>}
        </div>

        <div className="pin-display">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className={`pin-dot ${i < pin.length ? 'pin-dot-fill' : ''}`}>
              {i < pin.length ? '●' : '○'}
            </span>
          ))}
        </div>

        {error && (
          <div style={{ color: '#f87171', textAlign: 'center',
            fontSize: '0.85rem', fontWeight: 600, padding: '0 16px 8px' }}>
            ⚠ {error}
          </div>
        )}

        {loading && (
          <div style={{ color: '#c8a830', textAlign: 'center',
            fontSize: '0.78rem', padding: '0 16px 8px', letterSpacing: '0.06em' }}>
            VERIFICANDO...
          </div>
        )}

        <div className="pin-numpad">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
            <button
              key={i}
              className={`pin-np-btn${d === '' ? ' pin-np-empty' : ''}${d === '⌫' ? ' pin-np-borrar' : ''}`}
              disabled={d === '' || loading}
              onClick={() => d === '⌫' ? handleBorrar() : handleDigit(d)}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="pin-footer">
          <button className="pin-btn-cancelar" onClick={onCancelar} disabled={loading}>
            ‹ ATRÁS
          </button>
          <button
            className="pin-btn-confirmar"
            disabled={pin.length < 4 || loading}
            onClick={handleConfirmar}
          >
            {loading ? 'VERIFICANDO...' : 'CONFIRMAR'}
          </button>
        </div>

      </div>
    </div>
  )
}
