import { useEffect, useRef, useState } from 'react'
import { Loader2, MicVocal, Search } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePlayerStore } from '@/store/playerStore'
import { fetchLyricsManual } from '@/hooks/useLyrics'
import { getCoverArtUrl } from '@/services/subsonic'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function LyricsPanel() {
  const lyricsOpen = usePlayerStore((s) => s.lyricsOpen)
  const toggleLyrics = usePlayerStore((s) => s.toggleLyrics)
  const currentLyrics = usePlayerStore((s) => s.currentLyrics)
  const isLoading = usePlayerStore((s) => s.isLyricsLoading)
  const currentPosition = usePlayerStore((s) => s.currentPosition)
  const setCurrentLyrics = usePlayerStore((s) => s.setCurrentLyrics)
  const seek = usePlayerStore((s) => s.seek)
  const queue = usePlayerStore((s) => s.queue)
  const currentIndex = usePlayerStore((s) => s.currentIndex)

  const song = queue[currentIndex] ?? null

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const lineRefs = useRef<Map<number, HTMLButtonElement>>(new Map())
  const [manualOpen, setManualOpen] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualArtist, setManualArtist] = useState('')
  const [searching, setSearching] = useState(false)

  const synced = currentLyrics?.synced ?? null
  const plain = currentLyrics?.plain ?? null

  // índice da linha atual
  let activeIndex = -1
  if (synced) {
    for (let i = 0; i < synced.length; i++) {
      if (synced[i]!.time <= currentPosition) activeIndex = i
      else break
    }
  }

  // auto-scroll suave para manter a linha atual no centro
  useEffect(() => {
    if (!lyricsOpen || activeIndex < 0) return
    const container = scrollRef.current
    const el = lineRefs.current.get(activeIndex)
    if (!container || !el) return
    const target = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2
    container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
  }, [activeIndex, lyricsOpen])

  useEffect(() => {
    setManualTitle(song?.title ?? '')
    setManualArtist(song?.artist ?? '')
  }, [song?.id, song?.title, song?.artist]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualSearch = async () => {
    if (!song || !manualTitle.trim()) return
    setSearching(true)
    try {
      const result = await fetchLyricsManual(song.id, manualTitle.trim(), manualArtist.trim())
      if (result) {
        setCurrentLyrics(result)
        toast.success('Letras encontradas')
        setManualOpen(false)
      } else {
        toast.error('Letras não encontradas')
      }
    } finally {
      setSearching(false)
    }
  }

  return (
    <Sheet open={lyricsOpen} onOpenChange={(open) => toggleLyrics(open)}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-950 p-0 sm:max-w-96"
      >
        <SheetHeader className="border-b border-zinc-800/80">
          <SheetTitle className="flex items-center gap-2 text-base">
            <MicVocal
              className={cn('size-5', synced && synced.length > 0 ? 'text-primary' : 'text-zinc-500')}
            />
            Letras
          </SheetTitle>
          {song && (
            <div className="flex items-center gap-3 pt-1">
              {song.coverArt && (
                <img
                  src={getCoverArtUrl(song.coverArt, 100) ?? ''}
                  alt=""
                  className="size-12 rounded-md object-cover"
                />
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-zinc-100">{song.title}</div>
                <div className="truncate text-xs text-zinc-400">{song.artist ?? 'Desconhecido'}</div>
              </div>
            </div>
          )}
        </SheetHeader>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-zinc-500" />
            </div>
          ) : synced && synced.length > 0 ? (
            <div className="flex flex-col gap-3">
              {synced.map((line, i) => {
                const isActive = i === activeIndex
                const isPast = i < activeIndex
                return (
                  <button
                    key={`${line.time}-${i}`}
                    ref={(el) => {
                      if (el) lineRefs.current.set(i, el)
                      else lineRefs.current.delete(i)
                    }}
                    onClick={() => seek(line.time)}
                    className={cn(
                      'w-full text-left transition-all duration-300',
                      isActive
                        ? 'text-3xl font-bold text-white'
                        : isPast
                          ? 'text-zinc-500 hover:text-zinc-300'
                          : 'text-zinc-400 hover:text-zinc-200',
                    )}
                  >
                    {line.text || '♪'}
                  </button>
                )
              })}
            </div>
          ) : plain ? (
            <pre className="font-sans text-base leading-relaxed whitespace-pre-wrap text-zinc-300">
              {plain}
            </pre>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <MicVocal className="size-12 text-zinc-700" />
              <div>
                <p className="text-zinc-300">Letras não encontradas</p>
                <p className="text-sm text-zinc-500">Tente buscar manualmente</p>
              </div>
            </div>
          )}
        </div>

        {/* Busca manual */}
        <div className="border-t border-zinc-800/80 p-4">
          {manualOpen ? (
            <div className="space-y-2">
              <Input
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="Título da música"
                className="h-8 bg-zinc-900"
              />
              <Input
                value={manualArtist}
                onChange={(e) => setManualArtist(e.target.value)}
                placeholder="Artista"
                className="h-8 bg-zinc-900"
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleManualSearch} disabled={searching}>
                  {searching && <Loader2 className="size-4 animate-spin" />}
                  Buscar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setManualOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="w-full" onClick={() => setManualOpen(true)}>
              <Search className="size-4" />
              Buscar letras manualmente
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
