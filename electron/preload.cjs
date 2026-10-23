'use strict'

/**
 * Ponte segura entre o renderer (isolado, sem Node) e o processo main.
 * O contrato está declarado em src/types/electron.d.ts — mantenha os dois em sincronia.
 */

const { contextBridge, ipcRenderer } = require('electron')

const VALID_NOTIFICATION = (payload) => {
  if (!payload || typeof payload !== 'object') return false
  return typeof payload.title === 'string' && payload.title.trim().length > 0
}

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('app:get-version'),

  platform: () => process.platform,

  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close: () => ipcRenderer.send('win:close'),

  showNotification: (title, body, icon) => {
    if (typeof title !== 'string' || !title.trim()) return
    if (!VALID_NOTIFICATION({ title })) return
    ipcRenderer.send('app:notify', { title, body, icon })
  },

  saveLyrics: (key, data) => ipcRenderer.invoke('lyrics:save', key, data),
  getLyrics: (key) => ipcRenderer.invoke('lyrics:get', key),

  openExternal: (url) => {
    if (typeof url !== 'string') return
    if (!/^https?:\/\//i.test(url.trim())) return
    // `shell` não existe em preload com sandbox → encaminha para o main via IPC
    ipcRenderer.send('shell:open-external', url.trim())
  },
})
