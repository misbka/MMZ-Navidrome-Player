# Navidrome Player

![Navidrome Player Screenshot 1](https://i.ibb.co/qYgmgDHY/b1.png)

![Navidrome Player Screenshot 2](https://i.ibb.co/8LjTJHhg/b2.png)

![Navidrome Player Screenshot 3](https://i.ibb.co/r253PZ9p/b3.png)

![Navidrome Player Screenshot 4](https://i.ibb.co/8gYDvc63/b4.png)

A music player for **Navidrome** (Subsonic API), built with React + TypeScript + Vite + Tailwind CSS + shadcn/ui. Designed to be packaged as a desktop application using **Electron** — all renderer code runs exclusively on browser APIs, with no Node.js dependencies.

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui (Radix) |
| State Management | Zustand (+ `persist` with localStorage) |
| Navigation | react-router-dom (`HashRouter`, compatible with `file://` in Electron) |
| HTTP | axios |
| Icons | lucide-react |
| Toast Notifications | sonner |
| Queue Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Lyrics | [LRCLIB](https://lrclib.net) |

## Getting Started

```bash
npm install

# Web only (browser renderer)
npm run dev           # http://localhost:5173
npm run build         # Typecheck + production build in dist/
npm run preview       # Serve the production build

# Desktop (Electron)
npm run dev:electron  # Vite + Electron with hot reload
npm run start         # Electron loading dist/ (requires npm run build first)

# Packaging
npm run dist          # NSIS installer in release/ (Windows)
npm run dist:mac      # DMG (macOS)
npm run dist:linux    # AppImage + deb (Linux)
npm run icon          # Regenerates build/icon.png (512) and build/icon.ico (256)
```

The Windows installer is generated at `release/Navidrome Player-<version>-setup.exe` (demonstration build, unsigned — Windows SmartScreen may require you to select "More info → Run anyway").

## Project Structure

```text
src/
  services/
    subsonic.ts      # Subsonic API (token authentication, albums, artists, playlists, favorites, scrobbling, URLs)
    lrclib.ts        # Synchronized lyrics (LRC parsing + search)
  store/
    authStore.ts     # Servers, sessions, login/logout (persist)
    playerStore.ts   # Queue, playback, volume, repeat/shuffle, lyrics (persist)
  hooks/
    useNavidrome.ts  # Data fetching with loading/error/refetch states
    useKeyboardShortcuts.ts
    useLyrics.ts     # Automatic lyrics lookup with in-memory/IPC cache
  components/
    player/          # AudioEngine, PlayerBar, QueueDrawer, LyricsPanel
    library/         # AlbumCard, ArtistCard, SongRow, PlaylistCard, ContextMenu, CreatePlaylistDialog
    layout/          # Sidebar, Header, Layout
    ui/              # shadcn/ui components
  pages/             # Login, Home, Albums, AlbumDetail, Artists, ArtistDetail,
                     # Playlists, PlaylistDetail, Favorites, Search
  lib/               # cn(), formatters, md5 (for authentication tokens)
  types/             # subsonic.ts, electron.d.ts
electron/
  main.cjs           # Main process: window, IPC, notifications, lyrics cache
  preload.cjs        # contextBridge → window.electronAPI (renderer remains Node-free)
scripts/             # Utilities: icon generation, tests (md5, LRC), app smoke test
```

## Authentication

Uses the Subsonic **token authentication** method (API `1.16.1`, client `navidrome-electron`):

1. Generates a random `salt`.
2. Calculates `t = md5(password + salt)` (`src/lib/md5.ts`, custom tested implementation).
3. Sends `u`, `t`, `s`, `v`, `c`, `f=json`.
4. Validates the connection using `ping`.

Credentials (multiple accounts/servers supported) are stored in `localStorage`. On errors **40** (invalid credentials) or **50** (invalid session), the session is cleared and the app redirects to the login screen.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `←` / `→` | −5s / +5s |
| `N` or `Ctrl+→` | Next track |
| `P` or `Ctrl+←` | Previous track |
| `M` | Mute / Unmute |
| `↑` / `↓` | Volume ±10% |
| `L` | Favorite current track |
| `Q` | Open / Close queue |
| `S` | Shuffle |
| `R` | Cycle repeat mode (off → all → one) |
| `?` | Open keyboard shortcuts dialog |

## Desktop App (Electron)

The renderer is completely platform-agnostic: it only uses `window.electronAPI` when available and falls back to standard web APIs when running in a browser.

**No Node.js APIs are used in the renderer** (`contextIsolation: true`, `sandbox: true`).

`src/types/electron.d.ts` declares the bridge exposed by `electron/preload.cjs`:

```ts
interface Window {
  electronAPI?: {
    getVersion(): Promise<string>
    platform(): string
    minimize(): void
    maximize(): void
    close(): void
    showNotification(title: string, body: string, icon?: string): void
    saveLyrics(key: string, data: unknown): Promise<void>
    getLyrics(key: string): Promise<unknown | null>
    openExternal(url: string): void
  }
}
```

`electron/main.cjs` handles:

- **Window Management** — window state (position, size, maximized status) persisted in `userData/window-state.json`, with validation to prevent restoring windows outside connected displays.
- **Security** — external links open in the system's default browser (`setWindowOpenHandler` + `will-navigate` filtering), restricted application menu, DevTools available only in development mode.
- **Notifications** — native `Notification` from the main process (`app.setAppUserModelId` for Windows taskbar grouping).
- **Lyrics** — persistent cache in `userData/lyrics-cache.json` (up to 4,000 entries, with debounced writes).
- **CORS** — injects `Access-Control-Allow-*` headers into responses so `axios`/`fetch` can communicate with the Navidrome server from `file://`.
- **Development Mode** — `npm run dev:electron` starts Vite and Electron with hot reload (`VITE_DEV_SERVER_URL`). Without this variable, Electron loads `dist/index.html` directly.

### Browser Integrations

- **MediaSession API** — metadata, artwork, and play/pause/next/previous/seek handlers.
- **Notification API** — notification when the track changes (uses native notifications in Electron).
- **manifest.json** and **service worker** (`public/sw.js`) with *CacheFirst* caching for `getCoverArt` (browser only — registration is skipped under `file://`).

## Features

- **Home** with carousels: recently added, recently played, most played, and favorites.
- **Albums** with sorting options (`newest`, `frequent`, `recent`, `starred`, `random`, `alphabeticalByName`).
- **Album Details** — artwork, metadata, play/shuffle/favorite actions, and track listing.
- **Artists** and artist details with biography (`getArtistInfo2`) and album grid.
- **Playlists** — create, edit, delete, add tracks (via context menu), and remove tracks by index.
- **Favorites** — separate tabs for songs, albums, and artists, with quick removal.
- **Global Search** — search artists, albums, and songs using `search3`.
- **Queue Management** — drag-and-drop reordering, play now, play next, clear queue, and remove tracks.
- **Synchronized Lyrics** — automatic lookup, caching, auto-scroll, seek by clicking a lyric line, and manual search.
- **Automatic Scrobbling** — submits a scrobble at 50% playback or after 4 minutes, whichever comes first, once per track.

## Tests & Utilities

```bash
node --experimental-strip-types scripts/test-md5.mts       # MD5 vs native crypto
node --experimental-strip-types scripts/test-lrc.mts       # Lyrics parser
node scripts/generate-icon.mjs                             # Generate icons
node scripts/verify-rendered.mjs [path-to-exe]              # Smoke test via CDP
```

`test-md5.mts` validates the MD5 implementation against native `crypto` (UTF-8, multiple blocks, and 55/56/63/64-byte boundary cases).

`test-lrc.mts` validates the lyrics parser.

`verify-rendered.mjs` launches the app (by default `release/win-unpacked/Navidrome Player.exe`) with remote debugging, connects through the Chrome DevTools Protocol, and verifies that React has rendered (`#root` contains content), dark mode is active, and `window.electronAPI` exists — a complete smoke test of the Electron + renderer pipeline.
