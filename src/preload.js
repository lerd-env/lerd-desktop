'use strict'

const { contextBridge, ipcRenderer } = require('electron')

// Exposed only to the local gate page. The live dashboard is same-origin and
// does not use this bridge.
contextBridge.exposeInMainWorld('lerd', {
  probe: () => ipcRenderer.invoke('lerd:probe'),
  loadDashboard: () => ipcRenderer.invoke('lerd:load-dashboard'),
  openInstall: () => ipcRenderer.invoke('lerd:open-install'),
})
