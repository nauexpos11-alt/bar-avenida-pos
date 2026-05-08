import { useState, useEffect } from 'react'
import { contarPendientes } from '../lib/offlineQueue'

export function useEstadoConexion() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pendientes, setPendientes] = useState(0)

  useEffect(() => {
    const onOnline  = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    let activo = true
    const tick = async () => {
      const n = await contarPendientes()
      if (activo) setPendientes(n)
    }
    tick()
    const interval = setInterval(tick, 3000)
    return () => { activo = false; clearInterval(interval) }
  }, [])

  return { online, pendientes }
}
