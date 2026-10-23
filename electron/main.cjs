'use strict'

/**
 * Processo principal do Electron (Node + Electron APIs).
 * O renderer NÃO tem acesso ao Node (contextIsolation: true, sandbox: true);
 * tudo o que ele precisa chega por aqui via IPC (ver electron/preload.cjs).
 */

const path = require('node:path')
const fs = require('node:fs')
const {
  app,
  BrowserWindow,
  Menu,
  Notification,
  ipcMain,
  nativeTheme,
  screen,
  session,
  shell,
} = require('electron')

const isDev = !app.isPackaged
// A URL de dev é definida explicitamente pelo script `npm run dev:electron`.
// Sem ela, carrega o build de produção em dist/ (também é o caso do app empacotado).
const DEV_URL = process.env.VITE_DEV_SERVER_URL || ''
const APP_ID = 'com.navidrome.player'

// ---------------------------------------------------------------------------
// Identidade / preferências globais
// ---------------------------------------------------------------------------

// Necessário para notificações e agrupamento da taskbar no Windows
app.setAppUserModelId(APP_ID)
// Força o dark mode nas janelas/títulos do sistema (Windows 11, macOS)
nativeTheme.themeSource = 'dark'
// Player de áudio: permite autoplay após restaurar a fila (ex.: ao abrir o app)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

// ---------------------------------------------------------------------------
// Instância única
// ---------------------------------------------------------------------------

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  boot()
}

// ---------------------------------------------------------------------------
// Estado da janela (restaura posição/tamanho entre sessões)
// ---------------------------------------------------------------------------

const windowStateFile = () => path.join(app.getPath('userData'), 'window-state.json')
const lyricsCacheFile = () => path.join(app.getPath('userData'), 'lyrics-cache.json')

function loadWindowState() {
  const fallback = { width: 1280, height: 820, x: undefined, y: undefined, maximized: false }
  try {
    const state = JSON.parse(fs.readFileSync(windowStateFile(), 'utf8'))
    if (!state || typeof state !== 'object') return fallback
    const { width, height, x, y, maximized } = state
    if (!Number.isFinite(width) || !Number.isFinite(height)) return { ...fallback }

    // só restaura a posição se ela couber em algum display conectado
    const displayBounds = screen.getAllDisplays().map((d) => d.bounds)
    const fits = displayBounds.some(
      (b) =>
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        x + 50 > b.x &&
        y + 50 > b.y &&
        x < b.x + b.width &&
        y < b.y + b.height,
    )
    return {
      width: Math.max(900, Math.round(width)),
      height: Math.max(560, Math.round(height)),
      x: fits ? Math.round(x) : undefined,
      y: fits ? Math.round(y) : undefined,
      maximized: maximized === true,
    }
  } catch {
    return fallback
  }
}

function saveWindowState(win) {
  try {
    if (!win || win.isDestroyed()) return
    // guarda o bounds "normal" (sem maximizar) para restaurar corretamente
    const bounds = win.getNormalBounds ? win.getNormalBounds() : win.getBounds()
    fs.writeFileSync(
      windowStateFile(),
      JSON.stringify({ ...bounds, maximized: win.isMaximized() }),
    )
  } catch {
    /* falha ao persistir o estado não é crítico */
  }
}

// ---------------------------------------------------------------------------
// Cache persistente de letras (usado pelo renderer via IPC)
// ---------------------------------------------------------------------------

const MAX_LYRICS_ENTRIES = 4000
let lyricsCache = null
let lyricsWriteTimer = null

function readLyricsCache() {
  if (lyricsCache) return lyricsCache
  try {
    const parsed = JSON.parse(fs.readFileSync(lyricsCacheFile(), 'utf8'))
    lyricsCache = parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    lyricsCache = {}
  }
  return lyricsCache
}

function writeLyricsCacheSoon() {
  clearTimeout(lyricsWriteTimer)
  lyricsWriteTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(lyricsCacheFile()), { recursive: true })
      fs.writeFileSync(lyricsCacheFile(), JSON.stringify(lyricsCache ?? {}))
    } catch {
      /* melhor esforço */
    }
  }, 250)
}

function trimLyricsCache(cache) {
  const keys = Object.keys(cache)
  if (keys.length <= MAX_LYRICS_ENTRIES) return
  // remove as entradas mais antigas (ordem de inserção)
  for (const key of keys.slice(0, keys.length - MAX_LYRICS_ENTRIES)) delete cache[key]
}

// ---------------------------------------------------------------------------
// Segurança: links externos saem do app
// ---------------------------------------------------------------------------

function isSafeExternalUrl(value) {
  try {
    const url = new URL(String(value))
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function openExternal(value) {
  if (isSafeExternalUrl(value)) shell.openExternal(String(value))
}

// CORS: o renderer carrega de file:// (produção) ou localhost (dev) e chama a API
// do Navidrome em outra origem. Injetamos os headers de CORS nas respostas para
// que axios/fetch funcionem mesmo quando o servidor não envia Access-Control-Allow-*.
function installCorsRelaxation() {
  const CORS_HEADERS = {
    'access-control-allow-origin': ['*'],
    'access-control-allow-methods': ['GET, POST, PUT, DELETE, OPTIONS'],
    'access-control-allow-headers': ['*'],
    'access-control-expose-headers': ['*'],
  }

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders }
    // remove variações de caixa para não duplicar
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase().startsWith('access-control-')) delete headers[key]
    }
    callback({ responseHeaders: { ...headers, ...CORS_HEADERS } })
  })
}

// ---------------------------------------------------------------------------
// Janela principal
// ---------------------------------------------------------------------------

let mainWindow = null

function createWindow() {
  const state = loadWindowState()

  // o installer do Windows já embute o ícone no exe; só passamos explicitamente
  // quando o arquivo existe fora do asar (ex.: imagem de bandeja no Linux/macOS)
  const existingIcon = (relPath) => {
    const abs = path.join(__dirname, '..', relPath)
    return fs.existsSync(abs) ? abs : null
  }
  const windowIcon =
    process.platform === 'win32'
      ? existingIcon(path.join('build', 'icon.ico'))
      : existingIcon(path.join('build', 'icon.png'))

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    ...(state.x !== undefined && state.y !== undefined ? { x: state.x, y: state.y } : {}),
    minWidth: 900,
    minHeight: 560,
    show: false,
    backgroundColor: '#09090b',
    title: 'Navidrome Player',
    ...(windowIcon ? { icon: windowIcon } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      devTools: isDev,
    },
  })

  // segurança: nada de abrir janelas novas dentro do app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url)
    return { action: 'deny' }
  })

  // segurança: bloqueia navegação para fora do app (mantém as rotas internas)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isInternal =
      url.startsWith('file://') ||
      (DEV_URL && url.startsWith(DEV_URL)) ||
      url.startsWith('http://localhost') ||
      url.startsWith('http://127.0.0.1')
    if (!isInternal) {
      event.preventDefault()
      openExternal(url)
    }
  })

  mainWindow.once('ready-to-show', () => {
    if (state.maximized) mainWindow.maximize()
    mainWindow.show()
  })

  // fallback caso ready-to-show não dispare (ex.: falha de carregamento)
  const showFallback = setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) mainWindow.show()
  }, 4000)

  mainWindow.on('close', () => {
    clearTimeout(showFallback)
    saveWindowState(mainWindow)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  const load = DEV_URL
    ? mainWindow.loadURL(DEV_URL)
    : mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  load.catch((err) => {
    console.error('Falha ao carregar o renderer, tentando dist/index.html:', err)
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html')).catch((fileErr) => {
      console.error('Falha ao carregar dist/index.html:', fileErr)
    })
  })
}

// ---------------------------------------------------------------------------
// Menu (atalhos de copiar/colar + devtools apenas no desenvolvimento)
// ---------------------------------------------------------------------------

function buildMenu() {
  const template = [
    {
      label: 'Editar',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Exibir',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        ...(isDev ? [{ role: 'toggleDevTools' }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'fullscreen' },
      ],
    },
    { role: 'windowMenu' },
  ]

  if (process.platform === 'darwin') template.unshift({ role: 'appMenu' })

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ---------------------------------------------------------------------------
// IPC exposto ao renderer (espelhado em src/types/electron.d.ts)
// ---------------------------------------------------------------------------

function registerIpcHandlers() {
  ipcMain.handle('app:get-version', () => app.getVersion())

  ipcMain.on('win:minimize', () => mainWindow?.minimize())
  ipcMain.on('win:maximize', () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  ipcMain.on('win:close', () => mainWindow?.close())

  ipcMain.on('app:notify', (_event, payload) => {
    if (!Notification.isSupported()) return
    const { title, body, icon } = payload ?? {}
    if (!title) return
    try {
      const notification = new Notification({
        title: String(title).slice(0, 200),
        body: String(body ?? '').slice(0, 500),
        silent: true,
        // ícone remoto não é suportado pelo Notification do Electron
        ...(icon && /^(file:|data:)/i.test(String(icon)) ? { icon: String(icon) } : {}),
      })
      notification.show()
    } catch (err) {
      console.error('Falha ao exibir notificação:', err)
    }
  })

  ipcMain.handle('lyrics:get', (_event, key) => {
    if (typeof key !== 'string' || !key) return null
    return readLyricsCache()[key] ?? null
  })

  ipcMain.handle('lyrics:save', (_event, key, data) => {
    if (typeof key !== 'string' || !key) return
    const cache = readLyricsCache()
    cache[key] = data
    trimLyricsCache(cache)
    writeLyricsCacheSoon()
  })

  ipcMain.on('shell:open-external', (_event, url) => openExternal(url))
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

function boot() {
  registerIpcHandlers()
  buildMenu()

  app.whenReady().then(() => {
    // session só pode ser acessado depois que o app está pronto
    installCorsRelaxation()
    createWindow()

    app.on('activate', () => {
      // macOS: clique no dock sem janelas abertas
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
      else mainWindow?.focus()
    })
  })

  app.on('window-all-closed', () => {
    // macOS mantém o app no dock; nas demais plataformas encerra
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    clearTimeout(lyricsWriteTimer)
    if (lyricsCache) {
      try {
        fs.writeFileSync(lyricsCacheFile(), JSON.stringify(lyricsCache))
      } catch {
        /* melhor esforço */
      }
    }
  })
}
