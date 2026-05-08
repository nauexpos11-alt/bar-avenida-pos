import { useState } from 'react'
import './NumPad.css'

export default function NumPad({
  titulo,
  valorInicial = 1,
  valorMinimo  = 1,
  valorMaximo  = 99,
  onAceptar,
  onCancelar,
}) {
  const [display, setDisplay] = useState(String(valorInicial))

  const handleDigit = (d) => {
    setDisplay(prev => {
      const next = prev === '0' ? d : prev + d
      return parseInt(next, 10) > valorMaximo ? prev : next
    })
  }

  const handleBorrar = () => {
    setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0')
  }

  const handleAceptar = () => {
    const num = parseInt(display, 10)
    if (isNaN(num) || num < valorMinimo) return
    onAceptar(Math.min(num, valorMaximo))
  }

  const num    = parseInt(display, 10) || 0
  const valido = num >= valorMinimo && num <= valorMaximo

  return (
    <div className="np-overlay" onClick={e => e.target === e.currentTarget && onCancelar()}>
      <div className="np-box">

        <div className="np-header">
          <span className="np-titulo">{titulo}</span>
          <button className="np-x" onClick={onCancelar}>✕</button>
        </div>

        <div className="np-display">
          <span className={`np-valor ${!valido ? 'np-valor-invalido' : ''}`}>
            {display}
          </span>
          {!valido && (
            <span className="np-hint">
              {num < valorMinimo ? `Mínimo: ${valorMinimo}` : `Máximo: ${valorMaximo}`}
            </span>
          )}
        </div>

        <div className="np-grid">
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button key={d} className="np-btn" onClick={() => handleDigit(d)}>{d}</button>
          ))}
          <button className="np-btn np-borrar" onClick={handleBorrar}>⌫</button>
          <button className="np-btn" onClick={() => handleDigit('0')}>0</button>
          <button
            className={`np-btn np-aceptar ${!valido ? 'np-aceptar-off' : ''}`}
            onClick={handleAceptar}
            disabled={!valido}
          >✓</button>
        </div>

      </div>
    </div>
  )
}
