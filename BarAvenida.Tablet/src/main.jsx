import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './scroll-fixes.css'
import App from './App.jsx'

// ── Registro del Service Worker ──────────────────────
// La PWA se sirve desde /tablet/ en produccion. El SW se registra con
// scope /tablet/ para que solo controle peticiones bajo esa ruta.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/tablet/sw.js', { scope: '/tablet/' })
      .catch((err) => console.warn('SW registro fallido:', err))
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
