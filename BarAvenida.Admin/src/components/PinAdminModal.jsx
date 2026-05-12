import { useState, useRef, useEffect } from 'react'
import './PinAdminModal.css'

/**
 * Modal para confirmar acciones destructivas con PIN admin.
 *
 * Props:
 *   - titulo       string  : título del modal (default "Confirmación admin requerida")
 *   - mensaje      string  : descripción de la acción que se va a ejecutar
 *   - peligro      bool?   : si la acción es destructiva (botón rojo). Default true.
 *   - confirmLabel string? : label del botón de confirmar (default "Confirmar")
 *   - onConfirm    fn      : async (pin) => void.  Si lanza Error, se muestra inline.
 *   - onCancel     fn      : () => void
 *   - showNumpad   bool?   : si mostrar numpad visual. Default false.
 */
export default function PinAdminModal({
  titulo = 'Confirmación admin requerida',
  mensaje = '',
  peligro = true,
  confirmLabel = 'Confirmar',
  onConfirm,
  onCancel,
  showNumpad = false,
}) {
  const [pin, setPin]           = useState('')
  const [error, setError]       = useState('')
  const [enviando, setEnviando] = useState(false)
  const inputRef                = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handlePin = (val) => {
    // sólo dígitos, max 6
    const limpio = String(val).replace(/\D/g, '').slice(0, 6)
    setPin(limpio)
    if (error) setError('')
  }

  const handleConfirm = async () => {
    if (!pin || enviando) return
    setEnviando(true)
    setError('')
    try {
      await onConfirm(pin)
    } catch (e) {
      setError(e?.message || 'Error al confirmar')
      setPin('')
      setTimeout(() => inputRef.current?.focus(), 0)
    } finally {
      setEnviando(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter')   handleConfirm()
    if (e.key === 'Escape')  onCancel?.()
  }

  // Numpad inline (sin importar NumPad para no acoplar tipos)
  const pushDigit = (d) => {
    if (enviando) return
    if (pin.length >= 6) return
    handlePin(pin + d)
  }
  const popDigit = () => {
    if (enviando) return
    handlePin(pin.slice(0, -1))
  }

  return (
    <div className="pam-overlay" onClick={onCancel}>
      <div className="pam-box" onClick={e => e.stopPropagation()}>
        <div className="pam-header">
          <span className="pam-titulo">
            <span className="pam-lock">🔒</span> {titulo}
          </span>
          <button className="pam-close" onClick={onCancel} disabled={enviando}>✕</button>
        </div>

        <div className="pam-body">
          {mensaje && <p className="pam-mensaje">{mensaje}</p>}

          <label className="pam-label">PIN admin</label>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            className={`pam-input${error ? ' pam-input-error' : ''}`}
            value={pin}
            onChange={e => handlePin(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={6}
            placeholder="••••"
            disabled={enviando}
          />

          {error && <div className="pam-error">{error}</div>}

          {showNumpad && (
            <div className="pam-numpad">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => {
                if (k === '') return <div key={i} className="pam-np-key pam-np-empty" />
                if (k === '⌫') return (
                  <button
                    key={i}
                    type="button"
                    className="pam-np-key pam-np-back"
                    onClick={popDigit}
                    disabled={enviando}
                  >⌫</button>
                )
                return (
                  <button
                    key={i}
                    type="button"
                    className="pam-np-key"
                    onClick={() => pushDigit(k)}
                    disabled={enviando}
                  >{k}</button>
                )
              })}
            </div>
          )}
        </div>

        <div className="pam-footer">
          <button
            className="pam-btn-cancel"
            onClick={onCancel}
            disabled={enviando}
          >
            Cancelar
          </button>
          <button
            className={`pam-btn-ok${peligro ? ' pam-btn-peligro' : ''}`}
            onClick={handleConfirm}
            disabled={!pin || enviando}
          >
            {enviando ? 'Verificando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
