import { useState, useEffect } from 'react'
import './Toast.css'

function ToastItem({ id, mensaje, tipo, onDone }) {
  const [saliendo, setSaliendo] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setSaliendo(true), 2800)
    const t2 = setTimeout(() => onDone(id), 3200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [id, onDone])

  const icons = { success: '✓', error: '⚠', info: 'ℹ' }

  return (
    <div className={`toast-item toast-${tipo}${saliendo ? ' toast-out' : ' toast-in'}`}>
      <span className="toast-icon">{icons[tipo] ?? 'ℹ'}</span>
      <span className="toast-msg">{mensaje}</span>
    </div>
  )
}

export default function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <ToastItem key={t.id} {...t} onDone={onDismiss} />
      ))}
    </div>
  )
}
