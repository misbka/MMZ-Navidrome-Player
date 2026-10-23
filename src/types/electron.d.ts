export interface ElectronAPI {
  getVersion: () => Promise<string>
  platform: () => string
  minimize: () => void
  maximize: () => void
  close: () => void
  showNotification: (title: string, body: string, icon?: string) => void
  saveLyrics: (key: string, data: unknown) => Promise<void>
  getLyrics: (key: string) => Promise<unknown | null>
  openExternal: (url: string) => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
