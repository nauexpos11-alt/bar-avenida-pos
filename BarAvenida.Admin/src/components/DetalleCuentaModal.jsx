import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import './DetalleCuentaModal.css'

const fmt = n => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtFecha = d => d
  ? new Date(d).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—'

const ESTADO_CHIP = {
  Abierta:   { cls: 'dcm-chip-abierta',   label: '● Abierta'   },
  Cobrada:   { cls: 'dcm-chip-cobrada',   label: '● Cobrada'   },
  Cancelada: { cls: 'dcm-chip-cancelada', label: '● Cancelada' },
}

const MOTIVOS_CANCELACION = [
  'Cliente se retiró sin pagar',
  'Error en captura',
  'Mesa ocupada por error',
  'Cuenta duplicada',
  'Otro...',
]

export default function DetalleCuentaModal({ auth, cuentaId, onClose, onRefresh, toast }) {
  const [cuenta,        setCuenta]       = useState(null)
  const [cargando,      setCargando]     = useState(true)
  const [reimprimiendo, setReimprimiendo] = useState(false)

  // Sub-modal cancelar
  const [modalCancelar,  setModalCancelar]  = useState(false)
  const [pinCancel,      setPinCancel]      = useState('')
  const [motivoSel,      setMotivoSel]      = useState(MOTIVOS_CANCELACION[0])
  const [motivoLibre,    setMotivoLibre]    = useState('')
  const [cancelando,     setCancelando]     = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const d = await api.adminGetCuentaDetalle(auth.token, cuentaId)
      setCuenta(d)
    } catch (e) {
      toast('Error al cargar detalle: ' + e.message, 'error')
    } finally {
      setCargando(false)
    }
  }, [auth.token, cuentaId, toast])

  useEffect(() => { cargar() }, [cargar])

  const handleReimprimir = async () => {
    setReimprimiendo(true)
    try {
      const r = await api.adminReimprimirCuenta(auth.token, cuentaId)
      toast(r?.mensaje || 'Ticket reimpreso correctamente')
    } catch (e) {
      toast(e.message || 'Error al reimprimir', 'error')
    } finally {
      setReimprimiendo(false)
    }
  }

  const abrirCancelar = () => {
    setPinCancel('')
    setMotivoSel(MOTIVOS_CANCELACION[0])
    setMotivoLibre('')
    setModalCancelar(true)
  }

  const handleCancelar = async () => {
    if (!pinCancel) { toast('Ingresa tu PIN', 'error'); return }
    const motivo = motivoSel === 'Otro...' ? motivoLibre.trim() : motivoSel
    if (!motivo) { toast('Especifica el motivo', 'error'); return }
    setCancelando(true)
    try {
      await api.adminCancelarCuenta(auth.token, cuentaId, { pin: pinCancel, motivo })
      toast('Cuenta cancelada correctamente')
      setModalCancelar(false)
      onRefresh()
    } catch (e) {
      toast(e.message || 'Error al cancelar cuenta', 'error')
    } finally {
      setCancelando(false)
    }
  }

  const chip = cuenta ? (ESTADO_CHIP[cuenta.estado] || { cls: '', label: cuenta.estado }) : null

  return (
    <>
      {/* Overlay principal */}
      <div className="dcm-overlay" onClick={onClose}>
        <div className="dcm-modal" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="dcm-header">
            <div className="dcm-header-left">
              {cargando && <span className="dcm-titulo">Cargando cuenta...</span>}
              {cuenta && (
                <>
                  <span className="dcm-titulo">
                    Cuenta #{String(cuenta.folio).padStart(4, '0')}
                  </span>
                  <span className={`dcm-chip ${chip?.cls}`}>{chip?.label}</span>
                </>
              )}
            </div>
            <button className="dcm-btn-x" onClick={onClose}>✕</button>
          </div>

          {/* Body */}
          <div className="dcm-body">
            {cargando && <div className="dcm-loader">Cargando detalle...</div>}

            {!cargando && cuenta && (
              <>
                {/* Sección 1 — Info general */}
                <div className="dcm-section">
                  <h4 className="dcm-section-title">Información general</h4>
                  <div className="dcm-info-grid">
                    <span className="dcm-info-lbl">Mesa</span>
                    <span className="dcm-info-val">{cuenta.mesaNumero}</span>

                    <span className="dcm-info-lbl">Mesera</span>
                    <span className="dcm-info-val">{cuenta.meseraNombre}</span>

                    <span className="dcm-info-lbl">Personas</span>
                    <span className="dcm-info-val">{cuenta.numeroPersonas}</span>

                    {cuenta.nombreCliente && (
                      <>
                        <span className="dcm-info-lbl">Cliente</span>
                        <span className="dcm-info-val">{cuenta.nombreCliente}</span>
                      </>
                    )}

                    <span className="dcm-info-lbl">Apertura</span>
                    <span className="dcm-info-val">{fmtFecha(cuenta.fechaApertura)}</span>

                    {cuenta.fechaCierre && (
                      <>
                        <span className="dcm-info-lbl">Cierre</span>
                        <span className="dcm-info-val">{fmtFecha(cuenta.fechaCierre)}</span>
                      </>
                    )}

                    {/* Cobrada: pago */}
                    {cuenta.estado === 'Cobrada' && (
                      <>
                        <span className="dcm-info-lbl">Método pago</span>
                        <span className="dcm-info-val">{cuenta.metodoPago}</span>

                        {(cuenta.montoEfectivo ?? 0) > 0 && (
                          <>
                            <span className="dcm-info-lbl">Efectivo</span>
                            <span className="dcm-info-val">{fmt(cuenta.montoEfectivo)}</span>
                          </>
                        )}
                        {(cuenta.montoTarjeta ?? 0) > 0 && (
                          <>
                            <span className="dcm-info-lbl">Tarjeta</span>
                            <span className="dcm-info-val">{fmt(cuenta.montoTarjeta)}</span>
                          </>
                        )}
                        {(cuenta.cambio ?? 0) > 0 && (
                          <>
                            <span className="dcm-info-lbl">Cambio</span>
                            <span className="dcm-info-val">{fmt(cuenta.cambio)}</span>
                          </>
                        )}
                        {cuenta.rfcCliente && (
                          <>
                            <span className="dcm-info-lbl">RFC</span>
                            <span className="dcm-info-val">{cuenta.rfcCliente}</span>
                          </>
                        )}
                        {cuenta.razonSocialCliente && (
                          <>
                            <span className="dcm-info-lbl">Razón social</span>
                            <span className="dcm-info-val">{cuenta.razonSocialCliente}</span>
                          </>
                        )}
                      </>
                    )}

                    {/* Cancelada: motivo */}
                    {cuenta.estado === 'Cancelada' && cuenta.motivoCancelacion && (
                      <>
                        <span className="dcm-info-lbl">Motivo cancel.</span>
                        <span className="dcm-info-val dcm-val-cancelada">{cuenta.motivoCancelacion}</span>
                        {cuenta.usuarioCancelacionNombre && (
                          <>
                            <span className="dcm-info-lbl">Canceló</span>
                            <span className="dcm-info-val">{cuenta.usuarioCancelacionNombre}</span>
                          </>
                        )}
                        {cuenta.fechaCancelacion && (
                          <>
                            <span className="dcm-info-lbl">Fecha cancel.</span>
                            <span className="dcm-info-val">{fmtFecha(cuenta.fechaCancelacion)}</span>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Sección 2 — Productos */}
                {cuenta.ordenes && cuenta.ordenes.some(o => o.detalles?.length > 0) && (
                  <div className="dcm-section">
                    <h4 className="dcm-section-title">
                      Productos consumidos
                      <span className="dcm-section-sub">
                        {cuenta.ordenes.length} orden{cuenta.ordenes.length !== 1 ? 'es' : ''}
                      </span>
                    </h4>
                    <table className="dcm-tabla-prod">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Cant.</th>
                          <th>Precio</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cuenta.ordenes.flatMap((orden, oi) => {
                          const rows = []
                          if (cuenta.ordenes.length > 1) {
                            rows.push(
                              <tr key={`sep-${oi}`} className="dcm-tr-sep">
                                <td colSpan={4}>
                                  Orden {oi + 1} · {fmtFecha(orden.fechaEnvio)}
                                  {orden.esAgregado && <span className="dcm-badge-agr"> AGREGADO</span>}
                                </td>
                              </tr>
                            )
                          }
                          ;(orden.detalles || []).forEach((d, di) => {
                            rows.push(
                              <tr key={`d-${oi}-${di}`} className={di % 2 === 0 ? 'dcm-par' : 'dcm-impar'}>
                                <td>{d.productoNombre}</td>
                                <td className="dcm-td-num">{d.cantidad}</td>
                                <td className="dcm-td-num">{fmt(d.precioUnitario)}</td>
                                <td className="dcm-td-num">{fmt(d.subtotal)}</td>
                              </tr>
                            )
                          })
                          return rows
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sección 3 — Totales */}
                <div className="dcm-section">
                  <h4 className="dcm-section-title">Totales</h4>
                  <div className="dcm-totales">
                    <div className="dcm-total-row">
                      <span>Subtotal</span>
                      <span>{fmt(cuenta.subtotal)}</span>
                    </div>
                    {(cuenta.descuento ?? 0) > 0 && (
                      <div className="dcm-total-row">
                        <span>Descuento</span>
                        <span className="dcm-val-descuento">−{fmt(cuenta.descuento)}</span>
                      </div>
                    )}
                    {(cuenta.comisionTarjeta ?? 0) > 0 && (
                      <div className="dcm-total-row">
                        <span>Comisión tarjeta (5%)</span>
                        <span>{fmt(cuenta.comisionTarjeta)}</span>
                      </div>
                    )}
                    <div className="dcm-total-row dcm-total-grande">
                      <span>TOTAL</span>
                      <span>{fmt(cuenta.total)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer de acciones */}
          {!cargando && cuenta && (
            <div className="dcm-footer">
              {cuenta.estado === 'Cobrada' && (
                <button
                  className="dcm-btn-reimp"
                  onClick={handleReimprimir}
                  disabled={reimprimiendo}
                >
                  {reimprimiendo ? 'Reimprimiendo...' : '🖨️ Reimprimir ticket'}
                </button>
              )}
              {cuenta.estado === 'Abierta' && (
                <button className="dcm-btn-cancel" onClick={abrirCancelar}>
                  ❌ Cancelar cuenta
                </button>
              )}
              <button className="dcm-btn-cerrar" onClick={onClose}>Cerrar</button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-modal: confirmación de cancelación */}
      {modalCancelar && (
        <div className="dcm-overlay dcm-overlay-top" onClick={() => setModalCancelar(false)}>
          <div className="dcm-modal dcm-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="dcm-header">
              <span className="dcm-titulo">
                Cancelar cuenta #{cuenta && String(cuenta.folio).padStart(4, '0')}
              </span>
              <button className="dcm-btn-x" onClick={() => setModalCancelar(false)}>✕</button>
            </div>

            <div className="dcm-body">
              <p className="dcm-aviso">
                Esta acción no se puede deshacer. La mesa quedará libre.
              </p>
              <div className="tc-form">
                <label className="tc-lbl">Motivo de cancelación</label>
                <select
                  className="tc-input"
                  value={motivoSel}
                  onChange={e => setMotivoSel(e.target.value)}
                >
                  {MOTIVOS_CANCELACION.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                {motivoSel === 'Otro...' && (
                  <>
                    <label className="tc-lbl">Especificar motivo</label>
                    <input
                      className="tc-input"
                      type="text"
                      placeholder="Describe el motivo..."
                      maxLength={200}
                      value={motivoLibre}
                      onChange={e => setMotivoLibre(e.target.value)}
                    />
                  </>
                )}

                <label className="tc-lbl">PIN de administrador</label>
                <input
                  className="tc-input"
                  type="password"
                  placeholder="••••"
                  maxLength={8}
                  value={pinCancel}
                  onChange={e => setPinCancel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCancelar()}
                  autoFocus
                />
              </div>
            </div>

            <div className="dcm-footer">
              <button
                className="dcm-btn-cancel"
                onClick={handleCancelar}
                disabled={cancelando}
              >
                {cancelando ? 'Cancelando...' : 'Confirmar cancelación'}
              </button>
              <button
                className="dcm-btn-cerrar"
                onClick={() => setModalCancelar(false)}
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
