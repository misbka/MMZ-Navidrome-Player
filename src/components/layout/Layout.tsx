import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { CircleHelp, Keyboard, X } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { PlayerBar } from '@/components/player/PlayerBar'
import { QueueDrawer } from '@/components/player/QueueDrawer'
import { LyricsPanel } from '@/components/player/LyricsPanel'
import { AudioEngine } from '@/components/player/AudioEngine'
import { CreatePlaylistDialog } from '@/components/library/CreatePlaylistDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useLyrics } from '@/hooks/useLyrics'
import { cn } from '@/lib/utils'

const SHORTCUTS: Array<{ keys: string; description: string }> = [
  { keys: 'Espaço', description: 'Play / Pause' },
  { keys: '←', description: 'Voltar 5 segundos' },
  { keys: '→', description: 'Avançar 5 segundos' },
  { keys: 'N / Ctrl+→', description: 'Próxima música' },
  { keys: 'P / Ctrl+←', description: 'Música anterior' },
  { keys: 'M', description: 'Mudo' },
  { keys: '↑', description: 'Volume +10%' },
  { keys: '↓', description: 'Volume -10%' },
  { keys: 'L', description: 'Favoritar música atual' },
  { keys: 'Q', description: 'Abrir/fechar fila' },
  { keys: 'S', description: 'Embaralhar' },
  { keys: 'R', description: 'Modo de repetição' },
  { keys: '?', description: 'Mostrar atalhos' },
]

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const currentServerId = useAuthStore((s) => s.currentServerId)
  const navigate = useNavigate()

  useKeyboardShortcuts()
  useLyrics()

  useEffect(() => {
    if (!isAuthenticated || !currentServerId) navigate('/login')
  }, [isAuthenticated, currentServerId, navigate])

  useEffect(() => {
    const handler = () => setHelpOpen((v) => !v)
    window.addEventListener('toggle-shortcuts-help', handler)
    return () => window.removeEventListener('toggle-shortcuts-help', handler)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <AudioEngine />

      <div className="flex min-h-0 flex-1">
        {/* Sidebar fixa no desktop */}
        <aside className="hidden w-64 shrink-0 border-r border-zinc-800 md:block">
          <Sidebar />
        </aside>

        {/* Drawer no mobile */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 w-72 border-r border-zinc-800 bg-zinc-950 shadow-2xl">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-3 z-10"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
              >
                <X className="size-5" />
              </Button>
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        {/* Conteúdo central scrollável */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header onMenuClick={() => setMobileOpen(true)} />
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Painéis laterais */}
      <LyricsPanel />
      <QueueDrawer />

      {/* Player bar fixa no rodapé */}
      <PlayerBar />

      {/* Dialog global de criação de playlist */}
      <CreatePlaylistDialog />

      {/* Botão flutuante de atalhos */}
      <button
        onClick={() => setHelpOpen(true)}
        className="fixed right-4 bottom-24 z-30 hidden size-9 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 shadow-lg transition-colors hover:bg-zinc-800 hover:text-white md:flex"
        title="Atalhos de teclado (?)"
      >
        <Keyboard className="size-4" />
      </button>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleHelp className="size-5 text-primary" />
              Atalhos de teclado
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SHORTCUTS.map((s) => (
              <div
                key={s.keys}
                className="flex items-center justify-between rounded-md bg-zinc-900 px-3 py-2 text-sm"
              >
                <span className="text-zinc-400">{s.description}</span>
                <kbd className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs font-mono text-zinc-200">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function PageSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={cn('grid gap-4', 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5')}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="aspect-square animate-pulse rounded-lg bg-zinc-900" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-900" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-900" />
        </div>
      ))}
    </div>
  )
}
