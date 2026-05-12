import './NumPad.css'

/**
 * NumPad reutilizable.
 * Props:
 *   - value      string  : valor actual (controlado por el padre)
 *   - onChange   fn      : (nuevo) => void, cada cambio
 *   - onConfirm  fn?     : opcional, se llama al pulsar OK
 *   - maxLength  number? : longitud máxima del valor (default 4 para enteros)
 *   - allowDecimal bool? : si permite punto decimal (default false)
 *   - disabled   bool?
 *   - title      string? : etiqueta arriba del display
 */
export default function NumPad({
  value = '',
  onChange,
  onConfirm,
  maxLength = 4,
  allowDecimal = false,
  disabled = false,
  title = null,
}) {
  const set = (next) => {
    if (disabled) return
    onChange?.(next)
  }

  const pushDigit = (d) => {
    if (value.length >= maxLength) return
    // Evita ceros líderes para enteros (1, 2, 3...) salvo "0."
    if (!allowDecimal && value === '0') {
      set(d)
      return
    }
    set(value + d)
  }

  const pushDot = () => {
    if (!allowDecimal) return
    if (value.includes('.')) return
    set(value === '' ? '0.' : value + '.')
  }

  const back = () => set(value.slice(0, -1))
  const clear = () => set('')

  const ok = () => {
    if (disabled) return
    onConfirm?.(value)
  }

  return (
    <div className={`numpad-root${disabled ? ' numpad-disabled' : ''}`}>
      {title && <div className="numpad-title">{title}</div>}
      <div className="numpad-display">{value || '0'}</div>
      <div className="numpad-grid">
        {['7','8','9','4','5','6','1','2','3'].map(k => (
          <button
            key={k}
            type="button"
            className="numpad-key"
            onClick={() => pushDigit(k)}
            disabled={disabled}
          >
            {k}
          </button>
        ))}
        <button
          type="button"
          className={`numpad-key${allowDecimal ? '' : ' numpad-key-disabled'}`}
          onClick={pushDot}
          disabled={disabled || !allowDecimal}
        >
          .
        </button>
        <button
          type="button"
          className="numpad-key"
          onClick={() => pushDigit('0')}
          disabled={disabled}
        >
          0
        </button>
        <button
          type="button"
          className="numpad-key numpad-key-back"
          onClick={back}
          disabled={disabled}
          aria-label="Borrar"
        >
          ⌫
        </button>
        <button
          type="button"
          className="numpad-key numpad-key-clear"
          onClick={clear}
          disabled={disabled}
        >
          C
        </button>
        <button
          type="button"
          className="numpad-key numpad-key-ok"
          onClick={ok}
          disabled={disabled || !value}
        >
          OK
        </button>
      </div>
    </div>
  )
}
