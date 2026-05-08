const { contextBridge, ipcRenderer } = require('electron')

// Mantener electronAPI para compatibilidad con el Admin React
contextBridge.exposeInMainWorld('electronAPI', {
  abrirCarpetaTickets: () => ipcRenderer.invoke('abrir-carpeta-tickets'),
})

// Objeto baravenida para la pantalla de configuración de servidor
contextBridge.exposeInMainWorld('baravenida', {
  abrirCarpetaTickets: () => ipcRenderer.invoke('abrir-carpeta-tickets'),
  probarServidor:      (url) => ipcRenderer.invoke('probar-servidor', url),
  guardarServidor:     (url) => ipcRenderer.invoke('guardar-servidor', url),
  cancelarConfig:      ()    => ipcRenderer.invoke('cancelar-config'),
})
