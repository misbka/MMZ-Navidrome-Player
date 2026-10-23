import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MoreHorizontal, Play, Pause } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SongContextMenu } from '@/components/library/ContextMenu'
import { usePlayerStore } from '@/store/playerStore'
import { getCoverArtUrl, star, unstar } from '@/services/subsonic'
import { formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Song } from '@/types/subsonic'

interface SongRowProps {
  song: Song
  index: number
  queue: Song[]
  showAlbum?: boolean
  showArtist?: boolean
  showCover?: boolean
  playlistId?: string
  playlistIndex?: number
  onRemoved?: () => void
  className?: string
}

export function SongRow({
  song,
  index,
  queue,
  showAlbum = true,
  showArtist = true,
  showCover = false,
  playlistId,
  playlistIndex,
  onRemoved,
  className,
}: SongRowProps) {
  const currentSong = usePlayerStore((s) => s.queue[s.currentIndex] ?? null)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const [starred, setStarred] = useState(!!song.star)

  const isCurrent = currentSong?.id === song.id

  const handlePlay = () => {
    usePlayerStore.getState().playSong(song, queue)
  }

  const toggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      if (starred) {
        await unstar(song.id)
        setStarred(false)
        toast.success('Removido dos favoritos')
      } else {
        await star(song.id)
        setStarred(true)
        toast.success('Adicionado aos favoritos')
      }
    } catch {
      toast.error('Erro ao atualizar favoritos')
    }
  }

  return (
    <div
      className={cn(
        'group grid cursor-pointer grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-zinc-900',
        showAlbum && showArtist && 'md:grid-cols-[2rem_minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_auto]',
        (!showAlbum || !showArtist) && 'md:grid-cols-[2rem_minmax(0,2fr)_minmax(0,1.5fr)_auto]',
        isCurrent && 'bg-zinc-900/80',
        className,
      )}
      onDoubleClick={handlePlay}
    >
      {/* # / play */}
      <div className="flex items-center justify-center text-zinc-500">
        {isCurrent && isPlaying ? (
          <Pause className="size-4 fill-primary text-primary" />
        ) : (
          <>
            <span className="group-hover:hidden tabular-nums">{index + 1}</span>
            <Play
              className="hidden size-4 fill-current text-zinc-100 group-hover:block"
              onClick={handlePlay}
            />
          </>
        )}
      </div>

      {/* título (+ capa opcional) */}
      <button
        className="flex min-w-0 items-center gap-3 text-left"
        onClick={handlePlay}
        onContextMenu={handlePlay}
      >
        {showCover && song.coverArt && (
          <img
            src={getCoverArtUrl(song.coverArt, 80) ?? ''}
            alt=""
            className="size-10 shrink-0 rounded object-cover"
          />
        )}
        <div className="min-w-0">
          <div className={cn('truncate', isCurrent ? 'text-primary' : 'text-zinc-100')}>
            {song.title}
          </div>
          {song.artist && (
            <div className="truncate text-xs text-zinc-500 md:hidden">
              {showArtist && song.artist}
            </div>
          )}
        </div>
      </button>

      {/* álbum */}
      {showAlbum && (
        <Link
          to={song.albumId ? `/albums/${song.albumId}` : '#'}
          className="hidden truncate text-zinc-400 hover:underline md:block"
          onClick={(e) => e.stopPropagation()}
        >
          {song.album ?? '—'}
        </Link>
      )}

      {/* artista */}
      {showArtist && (
        <Link
          to={song.artistId ? `/artists/${song.artistId}` : '#'}
          className="hidden truncate text-zinc-400 hover:underline md:block"
          onClick={(e) => e.stopPropagation()}
        >
          {song.artist ?? 'Desconhecido'}
        </Link>
      )}

      {/* duração + estrela + menu */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            'opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100',
            starred && 'opacity-100',
          )}
          onClick={toggleStar}
          aria-label={starred ? 'Remover dos favoritos' : 'Favoritar'}
        >
          <Heart className={cn('size-4', starred ? 'fill-primary text-primary' : 'text-zinc-400')} />
        </Button>
        <span className="hidden w-12 text-right text-xs tabular-nums text-zinc-500 md:block">
          {formatDuration(song.duration)}
        </span>
        <SongContextMenu
          song={song}
          playlistId={playlistId}
          playlistIndex={playlistIndex}
          onRemoved={onRemoved}
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            aria-label="Mais opções"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </SongContextMenu>
      </div>
    </div>
  )
}
