const CACHE_NAME = 'baravenida-tablet-v2'

// Archivos del shell de la app que se cachean al instalar.
// La app vive bajo /tablet/ en produccion.
const SHELL = [
  '/tablet/',
  '/tablet/index.html',
  '/tablet/offline.html',
]

// ── Instalación: pre-cachea el shell ────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL))
  )
  // Activa el SW inmediatamente sin esperar a que se cierren pestañas
  self.skipWaiting()
})

// ── Activación: elimina cachés antiguas ─────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  )
  // Toma control de todas las pestañas abiertas al instante
  self.clients.claim()
})

// ── Fetch: Network-first con fallback a caché ───────
// Las llamadas a la API siempre van a la red (no se cachean).
// Los assets de la app usan caché si la red falla.
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Peticiones a la API → siempre red, sin caché
  if (url.port === '7000' || url.pathname.startsWith('/api') || url.pathname.startsWith('/barhub')) {
    return  // deja que el navegador lo maneje normalmente
  }

  // Assets de la app → Network-first, caché como fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Guarda en caché la respuesta fresca
        if (response.ok && request.method === 'GET') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request).then(r => r || caches.match('/tablet/offline.html')))
  )
})
