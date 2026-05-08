import { listarPendientes, borrarOrden, incrementarReintento } from './offlineQueue'

const MAX_REINTENTOS = 5

export async function sincronizarCola(apiClient, onProgreso) {
  const pendientes = await listarPendientes()
  if (pendientes.length === 0) return { exitosas: 0, fallidas: 0 }

  let exitosas = 0
  let fallidas = 0

  for (const orden of pendientes) {
    if (orden.reintentos >= MAX_REINTENTOS) {
      // Demasiados intentos, descartar
      await borrarOrden(orden.id)
      fallidas++
      continue
    }
    try {
      await apiClient.enviarOrdenDirecto(orden.token, orden.payload)
      await borrarOrden(orden.id)
      exitosas++
      onProgreso?.({ exitosas, fallidas, total: pendientes.length })
    } catch (e) {
      await incrementarReintento(orden.id)
      fallidas++
    }
  }

  return { exitosas, fallidas }
}
