import { useState, useRef, useEffect } from 'react'
import { api } from '../api'
import NumPad from './NumPad'
import './AbrirMesaModal.css'

const AREAS_VALIDAS = ['Comedor', 'Terraza']

export default function AbrirMesaModal({ mesa, auth, onExito, onCancelar }) {
  // Default: el area que tiene la mesa, si es valida; sino "Comedor"
  const areaInicial = AREAS_VALIDAS.includes(mesa.areaNombre) ? mesa.areaNombre : 'Comedor'

  const [areaSel, setAreaSel]           = useState(areaInicial)
  const [aliasMesa, setAliasMesa]       = useState(`Mesa ${mesa.numero}`)
  const [personas, setPersonas]         = useState(2)
  const [showPersonas, setShowPersonas] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.select() }, [])

  const handleAbrir = async () => {
    const aliasFinal = (aliasMesa ?? '').trim()
    const esDefault = !aliasFinal ||
      aliasFinal.toLowerCase() === `mesa ${mesa.numero}`.toLowerCase()
    const aliasParaBackend = esDefault ? null : aliasFinal

    // Si la mesera dejo el area que ya tenia la mesa, no lo mandamos (queda heredado de la mesa).
    // Si la mesera la cambio, mandamos el nuevo valor para sobreescribir.
    const areaParaBackend = (areaSel === mesa.areaNombre) ? null : areaSel

    setLoading(true)
    setError(null)
    try {
      const cuenta = await api.abrirCuenta(auth.token, {
        mesaId:         mesa.id,
        meseraId:       auth.id,
        numeroPersonas: personas,
        nombreCliente:  aliasParaBackend,
        area:           areaParaBackend,
      })
      onExito(cuenta)
    } catch (e) {
      setError(e.message || 'No se pudo abrir la cuenta')
    } finally {
      setLoading(false)
    }
  }

  const tituloHeader = aliasMesa?.trim() || `Mesa ${mesa.numero}`

  return (
    <>
      <div className="am-overlay" onClick={e => e.target === e.currentTarget && onCancelar()}>
        <div className="am-box">

          {/* Header */}
          <div className="am-header">
            <div className="am-title">ABRIR CUENTA</div>
            <div className="am-subtitle">Captura los datos para iniciar el servicio</div>
          </div>

          {/* Body */}
          <div className="am-body">

            {/* Mesa info read-only (numero original) */}
            <div className="am-mesa-info">
              <div className="am-mesa-info-bloque">
                <span className="am-mesa-info-label">MESA</span>
                <span className="am-mesa-info-val">{mesa.numero}</span>
              </div>
              <div className="am-mesa-info-bloque">
                <span className="am-mesa-info-label">ORIGEN</span>
                <span className="am-mesa-info-val am-mesa-info-val-sm">{mesa.areaNombre || '—'}</span>
              </div>
            </div>

            {/* AREA editable - SELECT */}
            <label className="am-campo am-campo-select">
              <span className="am-label">ÁREA</span>
              <select
                className="am-select"
                value={areaSel}
                onChange={e => setAreaSel(e.target.value)}
                disabled={loading}
              >
                {AREAS_VALIDAS.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <span className="am-chevron">▾</span>
            </label>

            {/* NOMBRE editable */}
            <label className="am-campo am-campo-input">
              <span className="am-label">NOMBRE</span>
              <input
                ref={inputRef}
                type="text"
                className="am-input"
                value={aliasMesa}
                onChange={e => setAliasMesa(e.target.value)}
                placeholder={`Mesa ${mesa.numero}`}
                maxLength={30}
                disabled={loading}
              />
            </label>

            {/* PERSONAS */}
            <button className="am-campo" onClick={() => !loading && setShowPersonas(true)} disabled={loading}>
              <span className="am-label">PERSONAS</span>
              <span className="am-valor">
                {personas} {personas === 1 ? 'PERSONA' : 'PERSONAS'}
              </span>
              <span className="am-chevron">›</span>
            </button>

          </div>

          {error && <div className="am-error">⚠ {error}</div>}

          {/* Footer */}
          <div className="am-footer">
            <button className="am-btn-cancelar" onClick={onCancelar} disabled={loading}>
              CANCELAR
            </button>
            <button
              className="am-btn-abrir"
              onClick={handleAbrir}
              disabled={loading}
            >
              {loading ? 'ABRIENDO...' : `ABRIR ${tituloHeader.toUpperCase()}`}
            </button>
          </div>

        </div>
      </div>

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
