import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

export default function BarraRapidaScreen({ auth, onVolver, onIrCuenta }) {
  const [cuentas, setCuentas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [abriendo, setAbriendo] = useState(false)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const data = await api.getCuentasRapidasAbiertas(auth.token)
      setCuentas(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [auth.token])

  useEffect(() => { cargar() }, [cargar])

  const handleNueva = async () => {
    setAbriendo(true)
    setError(null)
    try {
      const cuenta = await api.abrirCuentaRapida(auth.token, { meseraId: auth.id })
      const mesaSintetica = { id: null, numero: cuenta.nombreCliente ?? 'BARRA', area: 'BARRA' }
      onIrCuenta(mesaSintetica, cuenta)
    } catch (e) {
      setError('Error: ' + e.message)
    } finally {
      setAbriendo(false)
    }
  }

  const handleAbrir = (c) => {
    setError(null)
    api.getCuenta(c.id, auth.token)
      .then(full => {
        const mesaSintetica = { id: null, numero: c.nombre ?? 'BARRA', area: 'BARRA' }
        onIrCuenta(mesaSintetica, full)
      })
      .catch(e => setError('Error: ' + e.message))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', color: '#f0f0f0', fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: '2px solid #1e1e1e', background: '#111' }}>
        <button
          onClick={onVolver}
          style={{ background: 'none', border: '1px solid #333', color: '#999', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
        >
          ← VOLVER
        </button>
        <h1 style={{ color: '#f0c842', fontSize: '1.15rem', fontWeight: 900, letterSpacing: '0.12em', margin: 0 }}>
          BARRA RÁPIDA
        </h1>
        <button
          onClick={cargar}
          style={{ marginLeft: 'auto', background: 'none', border: '1px solid #333', color: '#f0c842', width: 34, height: 34, borderRadius: 6, cursor: 'pointer', fontSize: '1.1rem' }}
          title="Recargar"
        >
          ↻
        </button>
      </div>

      {/* Action bar */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e1e1e' }}>
        <button
          onClick={handleNueva}
          disabled={abriendo}
          style={{ background: '#f0c842', color: '#000', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 900, fontSize: '0.95rem', cursor: abriendo ? 'not-allowed' : 'pointer', letterSpacing: '0.06em', opacity: abriendo ? 0.7 : 1 }}
        >
          {abriendo ? 'Abriendo...' : '+ NUEVA BARRA'}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background: '#3a0000', color: '#ff6b6b', padding: '10px 20px', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {cargando ? (
          <div style={{ color: '#555', textAlign: 'center', marginTop: 40 }}>Cargando...</div>
        ) : cuentas.length === 0 ? (
          <div style={{ color: '#555', textAlign: 'center', marginTop: 60, fontSize: '1rem', letterSpacing: '0.06em' }}>
            No hay cuentas de barra abiertas
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#555', fontSize: '0.72rem', letterSpacing: '0.12em', borderBottom: '1px solid #1e1e1e' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>CUENTA</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>MESERA</th>
                <th style={{ padding: '8px 12px', textAlign: 'left' }}>DESDE</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>TOTAL</th>
                <th style={{ padding: '8px 12px' }}></th>
              </tr>
            </thead>
            <tbody>
              {cuentas.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#f0c842' }}>{c.nombre}</td>
                  <td style={{ padding: '12px', color: '#ccc' }}>{c.mesera}</td>
                  <td style={{ padding: '12px', color: '#888', fontSize: '0.85rem' }}>
                    {new Date(c.fechaApertura).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>
                    ${Number(c.total ?? 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleAbrir(c)}
                      style={{ background: '#1a1a1a', border: '1px solid #333', color: '#f0c842', padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}
                    >
                      ABRIR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
