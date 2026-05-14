import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path. En produccion la PWA se sirve desde el backend en /tablet/.
// En dev (npm run dev) sigue funcionando en raiz porque Vite ajusta esto solo.
export default defineConfig({
  plugins: [react()],
  base: '/tablet/',
  build: {
    outDir: '../BarAvenida.API/wwwroot/tablet',
    emptyOutDir: true,
  },
  server: { port: 3002, host: true },
})
