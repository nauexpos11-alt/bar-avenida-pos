import { useEffect, useState, useRef } from 'react'

// Devuelve un Date que SIEMPRE refleja la hora del servidor.
// Calcula offset al cargar y reaplica cada segundo.
// Re-sincroniza con el servidor cada 5 minutos.
export function useServerClock() {
  const [ahora, setAhora] = useState(() => new Date())
  const offsetMs = useRef(0)

  useEffect(() => {
    let cancelado = false

    async function sincronizar() {
      try {
        const t0 = Date.now()
        const resp = await fetch('/api/sistema/hora')
        const t1 = Date.now()
        const data = await resp.json()
        const latenciaIda = (t1 - t0) / 2
        const horaServidor = new Date(data.local).getTime() + latenciaIda
        const horaCliente  = Date.now()
        if (!cancelado) {
          offsetMs.current = horaServidor - horaCliente
        }
      } catch (e) {
        console.warn('No se pudo sincronizar hora servidor:', e)
      }
    }

    sincronizar()
    const reSync = setInterval(sincronizar, 5 * 60 * 1000)
    const tick   = setInterval(() => {
      setAhora(new Date(Date.now() + offsetMs.current))
    }, 1000)

    return () => {
      cancelado = true
      clearInterval(reSync)
      clearInterval(tick)
    }
  }, [])

  return ahora
}
