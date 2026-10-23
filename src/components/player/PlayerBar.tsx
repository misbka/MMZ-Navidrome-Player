import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Heart,
  ListMusic,
  MicVocal,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { toast } from 'sonner'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { usePlayerStore } from '@/store/playerStore'
import { getCoverArtUrl, star, unstar } from '@/services/subsonic'
import { formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function PlayerBar() {
  const queue = usePlayerStore((s) => s.queue)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)
  const isMuted = usePlayerStore((s) => s.isMuted)
  const repeatMode = usePlayerStore((s) => s.repeatMode)
  const isShuffled = usePlayerStore((s) => s.isShuffled)
  const currentPosition = usePlayerStore((s) => s.currentPosition)
  const duration = usePlayerStore((s) => s.duration)
  const currentLyrics = usePlayerStore((s) => s.currentLyrics)
  const lyricsOpen = usePlayerStore((s) => s.lyricsOpen)
  const queueOpen = usePlayerStore((s) => s.queueOpen)
  const currentSongStarred = usePlayerStore((s) => s.currentSongStarred)

  const song = queue[currentIndex] ?? null
  const [seekValue, setSeekValue] = useState<number[] | null>(null)

  const store = usePlayerStore.getState

  const toggleStar = async () => {
    if (!song) return
    const starred = currentSongStarred === true
    try {
      if (starred) await unstar(song.id)
      else await star(song.id)
      usePlayerStore.getState().setCurrentSongStarred(!starred)
      toast.success(starred ? 'Removido dos favoritos' : 'Adicionado aos favoritos')
    } catch {
      toast.error('Erro ao atualizar favoritos')
    }
  }

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const hasSyncedLyrics = !!currentLyrics?.synced && currentLyrics.synced.length > 0
  const progress = duration > 0 ? Math.min(100, (currentPosition / duration) * 100) : 0

  return (
    <footer className="h-20 shrink-0 border-t border-zinc-800 bg-zinc-900">
      <div className="mx-auto flex h-full max-w-screen-2xl items-center gap-4 px-3 md:px-5">
        {/* ESQUERDA: música atual */}
        <div className="flex min-w-0 flex-1 items-center gap-3 md:w-1/4 md:flex-none">
          {song ? (
            <>
              {song.coverArt ? (
                <img
                  src={getCoverArtUrl(song.coverArt, 80) ?? ''}
                  alt={song.title}
                  className="size-14 shrink-0 rounded-md object-cover shadow-md"
                />
              ) : (
                <div className="size-14 shrink-0 rounded-md bg-zinc-800" />
              )}
              <div className="min-w-0">
                <Link
                  to={song.albumId ? `/albums/${song.albumId}` : '#'}
                  className="block truncate text-sm font-medium text-zinc-100 hover:underline"
                >
                  {song.title}
                </Link>
                <Link
                  to={song.artistId ? `/artists/${song.artistId}` : '#'}
                  className="block truncate text-xs text-zinc-400 hover:text-zinc-200 hover:underline"
                >
                  {song.artist ?? 'Desconhecido'}
                </Link>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-1 hidden shrink-0 sm:inline-flex"
                onClick={toggleStar}
                title={currentSongStarred ? 'Remover dos favoritos' : 'Favoritar'}
              >
                <Heart
                  className={cn('size-4', currentSongStarred ? 'fill-primary text-primary' : 'text-zinc-400')}
                />
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="size-14 rounded-md bg-zinc-800" />
              <div className="text-sm text-zinc-500">Nenhuma música tocando</div>
            </div>
          )}
        </div>

        {/* CENTRO: controles */}
        <div className="hidden w-1/2 flex-col items-center gap-1.5 md:flex">
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => store().toggleShuffle()}
                  className={cn(isShuffled && 'text-primary hover:text-primary')}
                >
                  <Shuffle className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isShuffled ? 'Desembaralhar' : 'Embaralhar'} (S)</TooltipContent>
            </Tooltip>

            <Button variant="ghost" size="icon-sm" onClick={() => store().previous()}>
              <SkipBack className="size-5 fill-current" />
            </Button>

            <Button
              variant="secondary"
              size="icon"
              className="rounded-full bg-white text-black hover:bg-white/90"
              onClick={() => store().togglePlay()}
              disabled={!song}
            >
              {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
            </Button>

            <Button variant="ghost" size="icon-sm" onClick={() => store().next()}>
              <SkipForward className="size-5 fill-current" />
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => store().cycleRepeat()}
                  className={cn(repeatMode !== 'off' && 'text-primary hover:text-primary')}
                >
                  {repeatMode === 'one' ? <Repeat1 className="size-4" /> : <Repeat className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Repetir: {repeatMode === 'off' ? 'desligado' : repeatMode === 'all' ? 'fila' : 'uma'}
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="flex w-full max-w-xl items-center gap-2">
            <span className="w-10 text-right text-[11px] tabular-nums text-zinc-400">
              {formatDuration(seekValue?.[0] ?? currentPosition)}
            </span>
            <Slider
              value={seekValue ?? [progress]}
              max={100}
              step={0.1}
              disabled={!song}
              onValueChange={(v) => setSeekValue(v)}
              onValueCommit={(v) => {
                if (duration > 0) store().seek((v[0] ?? 0) / 100 * duration)
                setSeekValue(null)
              }}
              className="flex-1"
              aria-label="Progresso"
            />
            <span className="w-10 text-[11px] tabular-nums text-zinc-400">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Controles compactos no mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <Button variant="ghost" size="icon-sm" onClick={() => store().previous()}>
            <SkipBack className="size-5 fill-current" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full bg-white text-black"
            onClick={() => store().togglePlay()}
            disabled={!song}
          >
            {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => store().next()}>
            <SkipForward className="size-5 fill-current" />
          </Button>
        </div>

        {/* DIREITA: volume, letras, fila */}
        <div className="hidden w-1/4 items-center justify-end gap-1 md:flex">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => store().toggleLyrics()}
                className={cn(lyricsOpen && 'text-primary', hasSyncedLyrics && !lyricsOpen && 'text-primary/80')}
                title="Letras sincronizadas"
              >
                <MicVocal className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Letras sincronizadas (Q)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => store().toggleQueue()}
                className={cn(queueOpen && 'text-primary')}
              >
                <ListMusic className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fila de reprodução</TooltipContent>
          </Tooltip>

          <Button variant="ghost" size="icon-sm" onClick={() => store().toggleMute()}>
            <VolumeIcon className="size-4" />
          </Button>
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            max={100}
            step={1}
            onValueChange={(v) => store().setVolume((v[0] ?? 0) / 100)}
            className="w-24"
            aria-label="Volume"
          />
        </div>
      </div>
    </footer>
  )
}
