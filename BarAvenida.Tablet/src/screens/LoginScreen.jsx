import { useState, useCallback } from 'react'
import { api } from '../api'
import logoImg from '../assets/logo-bar-avenida.jpeg'
import './LoginScreen.css'

// Teclado numérico — layout teléfono
const KEYS = ['1','2','3','4','5','6','7','8','9','⌫','0','OK']

export default function LoginScreen({ onLogin }) {
  const [step, setStep]       = useState('codigo')   // 'codigo' | 'pin'
  const [codigo, setCodigo]   = useState('')
  const [pin, setPin]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const doLogin = useCallback(async (pinVal) => {
    if (!codigo || !pinVal) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.login(codigo, pinVal)
      onLogin(data)
    } catch {
      setError('Código o PIN incorrecto. Intenta de nuevo.')
      setPin('')
    } finally {
      setLoading(false)
    }
  }, [codigo, onLogin])

  const handleKey = useCallback((key) => {
    if (loading) return
    setError(null)

    if (key === '⌫') {
      if (step === 'codigo') setCodigo(v => v.slice(0, -1))
      else                   setPin(v => v.slice(0, -1))
      return
    }

    if (key === 'OK') {
      if (step === 'codigo') { if (codigo) setStep('pin') }
      else                   { if (pin)   doLogin(pin)   }
      return
    }

    // Dígito
    if (step === 'codigo') {
      if (codigo.length < 8) setCodigo(v => v + key)
    } else {
      if (pin.length < 4) {
        const next = pin + key
        setPin(next)
        if (next.length === 4) doLogin(next)  // auto-login con 4 dígitos
      }
    }
  }, [step, codigo, pin, loading, doLogin])

  const volverCodigo = () => { setStep('codigo'); setPin(''); setError(null) }

  return (
    <div className="login-root">
      <div className="login-card">

        {/* Logo */}
        <div className="login-logo">
          <img src={logoImg} className="login-logo-img" alt="Bar Avenida" />
          <span className="logo-bar">BAR</span>
          <span className="logo-avenida">AVENIDA</span>
        </div>
        <p className="login-tagline">Sistema de Punto de Venta</p>

        {/* Campos de display */}
        <div className="login-fields">
          <div
            className={`field-row ${step === 'codigo' ? 'field-active' : 'field-done'}`}
            onClick={() => { if (step === 'pin') volverCodigo() }}
          >
            <span className="field-label">CÓDIGO</span>
            <span className="field-val">
              {codigo || <span className="field-placeholder">—</span>}
            </span>
          </div>

          {step === 'pin' && (
            <div className="field-row field-active">
              <span className="field-label">PIN</span>
              <span className="field-val field-dots">
                {pin.length > 0
                  ? '●'.repeat(pin.length) + '○'.repeat(4 - pin.length)
                  : <span className="field-placeholder">○○○○</span>
                }
              </span>
            </div>
          )}
        </div>

        {error && <div className="login-error">{error}</div>}

        {/* Teclado numérico */}
        <div className="numpad">
          {KEYS.map((k) => {
            const isOk  = k === 'OK'
            const isDel = k === '⌫'
            const isDisabled = loading
              || (isOk && step === 'codigo' && !codigo)
              || (isOk && step === 'pin' && !pin)

            return (
              <button
                key={k}
                className={`np-key ${isOk ? 'np-ok' : ''} ${isDel ? 'np-del' : ''}`}
                onClick={() => handleKey(k)}
                disabled={isDisabled}
              >
                {isOk
                  ? (loading ? '...' : step === 'codigo' ? 'OK' : 'ENTRAR')
                  : k
                }
              </button>
            )
          })}
        </div>

        {step === 'pin' && (
          <button className="link-volver" onClick={volverCodigo}>
            ← Cambiar código
          </button>
        )}
      </div>
    </div>
  )
}
