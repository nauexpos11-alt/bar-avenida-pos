import { useState } from 'react'
import './CambiarMeseroModal.css'

const MESERAS = [
  { id: 1,  codigo: '37', nombre: 'ROSARITO' },
  { id: 2,  codigo: '23', nombre: 'ABBY GZZ' },
  { id: 3,  codigo: '43', nombre: 'ADRIANA Z' },
  { id: 4,  codigo: '38', nombre: 'ALE REYES' },
  { id: 5,  codigo: '4',  nombre: 'ALEJANDRA RDZ' },
  { id: 6,  codigo: '21', nombre: 'ALESSA' },
  { id: 7,  codigo: '17', nombre: 'ALEXIA' },
  { id: 8,  codigo: '51', nombre: 'ALISSON' },
  { id: 9,  codigo: '7',  nombre: 'ANAHI' },
  { id: 10, codigo: '5',  nombre: 'ANAHI SALAZAR' },
  { id: 11, codigo: '49', nombre: 'BARRA 1' },
  { id: 12, codigo: '30', nombre: 'CECY' },
  { id: 13, codigo: '14', nombre: 'CHUY' },
  { id: 14, codigo: '18', nombre: 'COMELONCHES' },
  { id: 15, codigo: '8',  nombre: 'DAMARIS' },
  { id: 16, codigo: '32', nombre: 'DANI SIERRA' },
  { id: 17, codigo: '2',  nombre: 'DANIELA DELGADO' },
  { id: 18, codigo: '36', nombre: 'DANIELA VAL' },
  { id: 19, codigo: '1',  nombre: 'DANY CASTILLO' },
  { id: 20, codigo: '50', nombre: 'DEYSI' },
]

export default function CambiarMeseroModal({
  mesaNumero, meseraActualId, onConfirmar, onCancelar,
}) {
  const [busqueda, setBusqueda]       = useState('')
  const [seleccionada, setSeleccionada] = useState(null) // objeto mesera para confirmar

  const filtradas = MESERAS.filter(m =>
    m.nombre.includes(busqueda.toUpperCase()) ||
    m.codigo.includes(busqueda)
  )

  const actual = MESERAS.find(m => m.id === meseraActualId)

  return (
    <>
      {/* ── Modal principal ── */}
      <div className="cm-overlay" onClick={e => e.target === e.currentTarget && onCancelar()}>
        <div className="cm-box">

          {/* Header */}
          <div className="cm-header">
            <div className="cm-title">CAMBIAR MESERO</div>
            <div className="cm-subtitle">
              Mesa {mesaNumero}{actual ? ` — actual: ${actual.nombre}` : ''}
            </div>
          </div>

          {/* Buscador */}
          <div className="cm-search-wrap">
            <input
              className="cm-search"
              type="text"
              placeholder="Buscar por nombre o código..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>

          {/* Grid de meseras */}
          <div className="cm-grid">
            {filtradas.length === 0 ? (
              <div className="cm-vacio">Sin resultados</div>
            ) : (
              filtradas.map(m => (
                <button
                  key={m.id}
                  className={`cm-card ${m.id === meseraActualId ? 'cm-card-actual' : ''}`}
                  onClick={() => setSeleccionada(m)}
                >
                  <span className="cm-codigo">{m.codigo}</span>
                  <span className="cm-nombre">{m.nombre}</span>
                  {m.id === meseraActualId && (
                    <span className="cm-actual-badge">ACTUAL</span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="cm-footer">
            <button className="cm-btn-cancelar" onClick={onCancelar}>
              CANCELAR
            </button>
          </div>

        </div>
      </div>

      {/* ── Sub-modal de confirmación ── */}
      {seleccionada && (
        <div className="cm-confirm-overlay"
          onClick={e => e.target === e.currentTarget && setSeleccionada(null)}>
          <div className="cm-confirm-box">
            <div className="cm-confirm-title">¿CAMBIAR MESERO?</div>
            <div className="cm-confirm-sub">
              Se asignará <strong>{seleccionada.nombre}</strong> ({seleccionada.codigo})
              {actual ? ` en lugar de ${actual.nombre}` : ''}.
            </div>
            <div className="cm-confirm-actions">
              <button className="cm-btn-cancelar" onClick={() => setSeleccionada(null)}>
                CANCELAR
              </button>
              <button className="cm-btn-confirmar" onClick={() => {
                alert('Función pendiente: cambio de mesero')
                onConfirmar(seleccionada.id)
              }}>
                SÍ, CAMBIAR
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
