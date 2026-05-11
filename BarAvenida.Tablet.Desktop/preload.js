const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('baravenida', {
  probarServidor:  (url) => ipcRenderer.invoke('probar-servidor', url),
  guardarServidor: (url) => ipcRenderer.invoke('guardar-servidor', url),
  cancelarConfig:  ()    => ipcRenderer.invoke('cancelar-config'),
})
