import { useState, useCallback, useEffect, useRef } from 'react'
import { api } from '../api'
import logoBar from '../assets/logo-bar-avenida.jpeg'
import './LoginScreen.css'

const KEYS = ['1','2','3','4','5','6','7','8','9','⌫','0','OK']

const QWERTY_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L','⌫'],
  ['Z','X','C','V','B','N','M'],
]

const QWERTY_NUMS = ['1','2','3','4','5','6','7','8','9','0']

export default function LoginScreen({ onLogin }) {
  const [step, setStep]       = useState('codigo')
  const [codigo, setCodigo]   = useState('')
  const [pin, setPin]         = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [modoAlfa, setModoAlfa] = useState(false)

  const codigoRef = useRef(null)
  const pinRef    = useRef(null)

  // Auto-focus al campo activo cuando cambia el paso
  useEffect(() => {
    const ref = step === 'codigo' ? codigoRef : pinRef
    // Pequeño delay para que el DOM esté listo al aparecer el campo PIN
    const id = setTimeout(() => ref.current?.focus(), 20)
    return () => clearTimeout(id)
  }, [step])

  // Focus inicial al montar
  useEffect(() => { codigoRef.current?.focus() }, [])

  // ── Login ────────────────────────────────────────────
  const doLogin = useCallback(async (pinVal) => {
    if (!codigo || !pinVal) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.login(codigo, pinVal)
      const rol = data.rol ?? data.role ?? ''
      if (rol !== 'Admin') throw new Error('Acceso denegado. Solo administradores.')
      onLogin(data)
    } catch (e) {
      setError(e.message || 'Código o PIN incorrecto')
      setPin('')
      // Re-focus al PIN para reintentar
      setTimeout(() => pinRef.current?.focus(), 20)
    } finally {
      setLoading(false)
    }
  }, [codigo, onLogin])

  // ── Handlers de teclado físico ───────────────────────
  const handleCodigoChange = (e) => {
    if (loading) return
    setError(null)
    // Acepta letras y números (códigos como ADMIN, BAR1, 23)
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    setCodigo(val)
  }

  const handlePinChange = (e) => {
    if (loading) return
    setError(null)
    // Solo dígitos, máx 4
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    setPin(val)
    if (val.length === 4) doLogin(val)
  }

  const handleCodigoKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault()
      if (codigo) setStep('pin')
    }
  }

  const handlePinKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault()
      if (pin) doLogin(pin)
    }
  }

  // ── Handler del numpad en pantalla ───────────────────
  const handleNumpadKey = useCallback((key) => {
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
        if (next.length === 4) doLogin(next)
      }
    }
  }, [step, codigo, pin, loading, doLogin])

  const volverCodigo = () => { setStep('codigo'); setPin(''); setError(null) }

  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-logo-wrap">
          <img src={logoBar} alt="Bar Avenida" className="login-logo-img" />
        </div>
        <p className="login-tagline">Monitor Administrativo</p>

        {/* ── Campos ── */}
        <div className="login-fields">

          {/* Campo CÓDIGO */}
          <div
            className={`field-row ${step === 'codigo' ? 'field-active' : 'field-done'}`}
            onClick={() => { if (step === 'pin') volverCodigo() }}
          >
            <span className="field-label">CÓDIGO</span>
            <input
              ref={codigoRef}
              className="field-input"
              type="text"
              value={codigo}
              onChange={handleCodigoChange}
              onKeyDown={handleCodigoKeyDown}
              maxLength={8}
              disabled={loading || step !== 'codigo'}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="—"
            />
          </div>

          {/* Campo PIN — solo aparece en step 'pin' */}
          {step === 'pin' && (
            <div className="field-row field-active">
              <span className="field-label">PIN</span>
              <input
                ref={pinRef}
                className="field-input field-input-pin"
                type="password"
                value={pin}
                onChange={handlePinChange}
                onKeyDown={handlePinKeyDown}
                maxLength={4}
                disabled={loading}
                autoComplete="new-password"
                inputMode="numeric"
                placeholder="○○○○"
              />
            </div>
          )}
        </div>

        {error && <div className="login-error">{error}</div>}

        {/* ── Toggle alfa / numérico (solo en paso código) ── */}
        {step === 'codigo' && (
          <button
            className="np-key np-alfa-toggle"
            onMouseDown={e => e.preventDefault()}
            onClick={() => setModoAlfa(a => !a)}
            disabled={loading}
          >
            {modoAlfa ? '🔢 Números' : '🔤 Letras'}
          </button>
        )}

        {/* ── Teclado numérico en pantalla ── */}
        {!modoAlfa ? (
          <div className="numpad">
            {KEYS.map(k => {
              const isOk  = k === 'OK'
              const isDel = k === '⌫'
              const disabled = loading
                || (isOk && step === 'codigo' && !codigo)
                || (isOk && step === 'pin' && !pin)

              return (
                <button
                  key={k}
                  className={`np-key ${isOk ? 'np-ok' : ''} ${isDel ? 'np-del' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleNumpadKey(k)}
                  disabled={disabled}
                >
                  {isOk ? (loading ? '...' : step === 'codigo' ? 'OK' : 'ENTRAR') : k}
                </button>
              )
            })}
          </div>
        ) : (
          /* ── Teclado QWERTY (solo en paso código) ── */
          <div className="qwerty-pad">
            {QWERTY_ROWS.map((row, ri) => (
              <div key={ri} className="qwerty-row">
                {row.map(k => (
                  <button
                    key={k}
                    className={`np-key qw-key${k === '⌫' ? ' np-del' : ''}`}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handleNumpadKey(k)}
                    disabled={loading}
                  >
                    {k}
                  </button>
                ))}
              </div>
            ))}
            <div className="qwerty-row">
              {QWERTY_NUMS.map(k => (
                <button
                  key={k}
                  className="np-key qw-key qw-digit"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleNumpadKey(k)}
                  disabled={loading}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="qwerty-row qwerty-actions">
              <button
                className="np-key qw-key qw-back"
                onMouseDown={e => e.preventDefault()}
                onClick={() => setModoAlfa(false)}
                disabled={loading}
              >
                🔢
              </button>
              <button
                className="np-key np-ok qw-ok"
                onMouseDown={e => e.preventDefault()}
                onClick={() => handleNumpadKey('OK')}
                disabled={loading || !codigo}
              >
                {loading ? '...' : 'OK'}
              </button>
            </div>
          </div>
        )}

        {step === 'pin' && (
          <button className="link-volver" onClick={volverCodigo}>
            ← Cambiar código
          </button>
        )}
      </div>
    </div>
  )
}
