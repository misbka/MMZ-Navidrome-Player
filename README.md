# Navidrome Player
![Alt text](https://i.ibb.co/qYgmgDHY/b1.png)
#
![Alt text](https://i.ibb.co/8LjTJHhg/b2.png)
#
![Alt text](https://i.ibb.co/r253PZ9p/b3.png)
#
![Alt text](https://i.ibb.co/8gYDvc63/b4.png)


Player de música para **Navidrome** (API Subsonic) construído com React + TypeScript + Vite + Tailwind CSS + shadcn/ui. Projetado para ser empacotado como aplicação desktop com **Electron** — todo o código roda apenas com APIs de navegador (sem dependências de Node no renderer).

## Stack

| Camada | Tecnologia |
| --- | --- |
| UI | React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui (Radix) |
| Estado | Zustand (+ `persist` no localStorage) |
| Navegação | react-router-dom (`HashRouter`, compatível com `file://` no Electron) |
| HTTP | axios |
| Ícones | lucide-react |
| Toasts | sonner |
| Drag & drop da fila | @dnd-kit/core + @dnd-kit/sortable |
| Letras | [LRCLib](https://lrclib.net) |

## Rodando

```bash
npm install

# somente web (renderer no navegador)
npm run dev           # http://localhost:5173
npm run build         # typecheck + build de produção em dist/
npm run preview       # serve o build

# desktop (Electron)
npm run dev:electron  # Vite + Electron com hot reload
npm run start         # Electron carregando dist/ (requer npm run build antes)

# empacotamento
npm run dist          # instalador NSIS em release/ (Windows)
npm run dist:mac      # DMG (macOS)
npm run dist:linux    # AppImage + deb (Linux)
npm run icon          # regenera build/icon.png (512) e build/icon.ico (256)
```

O instalador do Windows sai em `release/Navidrome Player-<versão>-setup.exe` (build de demonstração, sem assinatura de código — o Windows SmartScreen pode pedir "Mais informações → Executar assim mesmo").

## Estrutura

```
src/
  services/
    subsonic.ts      # API Subsonic (auth por token, álbuns, artistas, playlists, star, scrobble, URLs)
    lrclib.ts        # letras sincronizadas (parse LRC + busca)
  store/
    authStore.ts     # servidores, sessão, login/logout (persist)
    playerStore.ts   # fila, playback, volume, repeat/shuffle, letras (persist)
  hooks/
    useNavidrome.ts  # data fetching com loading/erro/refetch
    useKeyboardShortcuts.ts
    useLyrics.ts     # busca automática com cache em memória/IPC
  components/
    player/          # AudioEngine, PlayerBar, QueueDrawer, LyricsPanel
    library/         # AlbumCard, ArtistCard, SongRow, PlaylistCard, ContextMenu, CreatePlaylistDialog
    layout/          # Sidebar, Header, Layout
    ui/              # componentes shadcn/ui
  pages/             # Login, Home, Albums, AlbumDetail, Artists, ArtistDetail,
                     # Playlists, PlaylistDetail, Favorites, Search
  lib/               # cn(), formatadores, md5 (para o token de auth)
  types/             # subsonic.ts, electron.d.ts
electron/
  main.cjs           # processo main: janela, IPC, notificações, cache de letras
  preload.cjs        # contextBridge → window.electronAPI (renderer continua sem Node)
scripts/             # utilitários: ícone, testes (md5, LRC) e smoke test do app
```

## Autenticação

Usa o método **token** do Subsonic (API `1.16.1`, client `navidrome-electron`):

1. gera um `salt` aleatório;
2. calcula `t = md5(password + salt)` (`src/lib/md5.ts`, implementação própria testada);
3. envia `u`, `t`, `s`, `v`, `c`, `f=json`;
4. valida com `ping`.

As credenciais (várias contas/servidores suportados) ficam no `localStorage`. Em erros **40** (credenciais inválidas) ou **50** (sessão inválida) a sessão é limpa e o app redireciona para o login.

## Atalhos de teclado

| Tecla | Ação |
| --- | --- |
| `Espaço` | play / pause |
| `←` / `→` | −5s / +5s |
| `N` ou `Ctrl+→` | próxima música |
| `P` ou `Ctrl+←` | música anterior |
| `M` | mute / unmute |
| `↑` / `↓` | volume ±10% |
| `L` | favoritar música atual |
| `Q` | abrir/fechar fila |
| `S` | shuffle |
| `R` | ciclo de repetição (off → all → one) |
| `?` | modal de atalhos |

## App desktop (Electron)

O renderer é totalmente agnóstico de plataforma: ele só usa `window.electronAPI` quando existe e cai para as web APIs quando roda no navegador. **Nenhuma API Node é usada no renderer** (`contextIsolation: true`, `sandbox: true`).

`src/types/electron.d.ts` declara a ponte exposta pelo `electron/preload.cjs`:

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

`electron/main.cjs` cuida de:

- **Janela** — estado (posição/tamanho/maximizado) persistido em `userData/window-state.json`, com validação para não restaurar fora dos displays conectados;
- **Segurança** — links externos abrem no navegador padrão (`setWindowOpenHandler` + filtro em `will-navigate`), menu reduzido, devtools só no dev;
- **Notificações** — `Notification` do processo main (`app.setAppUserModelId` para agrupamento na taskbar do Windows);
- **Letras** — cache persistente em `userData/lyrics-cache.json` (até 4000 entradas, escrita com debounce);
- **CORS** — injeta `Access-Control-Allow-*` nas respostas para que `axios`/`fetch` funcionem de `file://` contra o servidor Navidrome;
- **Dev mode** — `npm run dev:electron` sobe o Vite e o Electron com hot reload (`VITE_DEV_SERVER_URL`); sem essa variável ele carrega `dist/index.html` direto.

Integrações de navegador já presentes:

- **MediaSession API** — metadados + artwork + handlers de play/pause/next/previous/seek;
- **Notification API** — aviso ao trocar de música (no Electron usa a nativa);
- **manifest.json** e **service worker** (`public/sw.js`) com cache *CacheFirst* para `getCoverArt` (apenas no navegador — em `file://` o registro é ignorado).

## Funcionalidades

- **Home** com carrosséis: adicionados recentemente, tocados recentemente, mais tocados, favoritos.
- **Álbuns** com filtros (`newest`, `frequent`, `recent`, `starred`, `random`, `alphabeticalByName`).
- **Detalhe de álbum** — capa, metadados, tocar/shuffle/favoritar e tabela de músicas.
- **Artistas** e detalhe com bio (`getArtistInfo2`) e grade de álbuns.
- **Playlists** — criar, editar, remover, adicionar músicas (menu de contexto) e remover música por índice.
- **Favoritos** — abas de músicas/álbuns/artistas com remoção rápida.
- **Busca global** — artistas, álbuns e músicas via `search3`.
- **Fila** com drag-and-drop, tocar agora, tocar a seguir, limpar e remover.
- **Letras sincronizadas** — busca automática, cache, auto-scroll, seek ao clicar na linha e busca manual.
- **Scrobble** automático aos 50% ou 4 minutos (o que vier primeiro), uma vez por música.

## Testes e utilitários

```bash
node --experimental-strip-types scripts/test-md5.mts       # MD5 vs crypto nativo
node --experimental-strip-types scripts/test-lrc.mts       # parser de letras
node scripts/generate-icon.mjs                             # gera os ícones
node scripts/verify-rendered.mjs [caminho-do-exe]          # smoke test via CDP
```

`test-md5.mts` valida a implementação de MD5 contra o `crypto` nativo (UTF-8, múltiplos blocos e bordas de 55/56/63/64 bytes). `test-lrc.mts` valida o parser de letras.

`verify-rendered.mjs` abre o app (por padrão `release/win-unpacked/Navidrome Player.exe`) com remote debugging, conecta via Chrome DevTools Protocol e confirma que o React renderizou (`#root` com conteúdo), que o dark mode está ativo e que `window.electronAPI` existe — um smoke test completo do pipeline Electron + renderer.
