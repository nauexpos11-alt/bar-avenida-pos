import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import './CambioUsuarioModal.css'

export default function CambioUsuarioModal({ onLogin, onClose }) {
  const [codigo,    setCodigo]    = useState('')
  const [pin,       setPin]       = useState('')
  const [error,     setError]     = useState('')
  const [cargando,  setCargando]  = useState(false)
  const codigoRef = useRef(null)

  useEffect(() => {
    codigoRef.current?.focus()
  }, [])

  const handleLogin = async () => {
    if (!codigo.trim() || !pin) { setError('Ingresa código y PIN'); return }
    setCargando(true)
    setError('')
    try {
      const r = await api.login(codigo.trim(), pin)
      onLogin(r)
    } catch (e) {
      setError(e.message || 'Código o PIN incorrecto')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="cum-overlay" onClick={onClose}>
      <div className="cum-modal" onClick={e => e.stopPropagation()}>
        <div className="cum-header">
          <span className="cum-titulo">Cambio de usuario</span>
          <button className="cum-btn-x" onClick={onClose}>✕</button>
        </div>

        <div className="cum-body">
          <div className="cum-hint">Ingresa las credenciales del nuevo usuario para cambiar la sesión activa.</div>

          {error && <div className="cum-error">{error}</div>}

          <label className="cum-lbl">Código</label>
          <input
            ref={codigoRef}
            className="cum-input"
            value={codigo}
            maxLength={20}
            onChange={e => setCodigo(e.target.value)}
            placeholder="Código de usuario"
            onKeyDown={e => e.key === 'Enter' && document.getElementById('cum-pin')?.focus()}
          />

          <label className="cum-lbl">PIN</label>
          <input
            id="cum-pin"
            className="cum-input"
            type="password"
            maxLength={8}
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="••••"
            onKeyDown={e => e.key === 'Enter' && !cargando && handleLogin()}
          />
        </div>

        <div className="cum-footer">
          <button className="cum-btn-ingresar" onClick={handleLogin} disabled={cargando}>
            {cargando ? 'Verificando...' : 'Cambiar usuario'}
          </button>
          <button className="cum-btn-cancelar" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
