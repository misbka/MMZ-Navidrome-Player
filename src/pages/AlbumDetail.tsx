import { Link, useParams } from 'react-router-dom'
import { Heart, Music, Play, Shuffle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SongRow } from '@/components/library/SongRow'
import { useAlbum } from '@/hooks/useNavidrome'
import { usePlayerStore } from '@/store/playerStore'
import { getCoverArtUrl, star, unstar } from '@/services/subsonic'
import { formatTotalDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Song } from '@/types/subsonic'

export function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: album, loading } = useAlbum(id)
  const [starred, setStarred] = useState(false)
  const [starChecked, setStarChecked] = useState(false)

  const isStarred = starChecked ? starred : !!album?.starred

  const songs: Song[] = album?.song ?? []
  const totalDuration = songs.reduce((acc, s) => acc + (s.duration ?? 0), 0)

  const handlePlay = (startIndex = 0) => {
    if (songs.length === 0) return
    usePlayerStore.getState().playAlbum(songs, startIndex)
  }

  const handleShuffle = () => {
    if (songs.length === 0) return
    const store = usePlayerStore.getState()
    store.playAlbum(songs, Math.floor(Math.random() * songs.length))
    if (!store.isShuffled) store.toggleShuffle()
  }

  const toggleStar = async () => {
    if (!album) return
    try {
      if (isStarred) {
        await unstar(album.id)
        setStarred(false)
        toast.success('Removido dos favoritos')
      } else {
        await star(album.id)
        setStarred(true)
        toast.success('Adicionado aos favoritos')
      }
      setStarChecked(true)
    } catch {
      toast.error('Erro ao atualizar favoritos')
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 pb-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row">
          <Skeleton className="size-72 rounded-lg bg-zinc-900" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-3 w-24 bg-zinc-900" />
            <Skeleton className="h-10 w-64 bg-zinc-900" />
            <Skeleton className="h-4 w-40 bg-zinc-900" />
            <div className="flex gap-2 pt-4">
              <Skeleton className="h-10 w-28 rounded-full bg-zinc-900" />
              <Skeleton className="h-10 w-28 rounded-full bg-zinc-900" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full bg-zinc-900" />
          ))}
        </div>
      </div>
    )
  }

  if (!album) {
    return <div className="py-20 text-center text-zinc-500">Álbum não encontrado</div>
  }

  const coverUrl = getCoverArtUrl(album.coverArt ?? album.id, 400)

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col items-start gap-6 sm:flex-row">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={album.name}
            className="size-56 shrink-0 rounded-lg object-cover shadow-2xl sm:size-72"
          />
        ) : (
          <div className="flex size-56 shrink-0 items-center justify-center rounded-lg bg-zinc-900 sm:size-72">
            <Music className="size-16 text-zinc-700" />
          </div>
        )}

        <div className="flex-1 space-y-3">
          <div className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">Álbum</div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{album.name}</h1>
          <div className="flex flex-wrap items-center gap-1 text-sm text-zinc-400">
            {album.artistId ? (
              <Link to={`/artists/${album.artistId}`} className="font-medium text-zinc-100 hover:underline">
                {album.artist}
              </Link>
            ) : (
              <span className="font-medium text-zinc-100">{album.artist ?? 'Desconhecido'}</span>
            )}
            {album.year && <span>· {album.year}</span>}
            <span>
              · {songs.length} {songs.length === 1 ? 'música' : 'músicas'}
            </span>
            {totalDuration > 0 && <span>· {formatTotalDuration(totalDuration)}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              size="lg"
              className="rounded-full bg-primary font-semibold text-black hover:bg-primary/90"
              onClick={() => handlePlay(0)}
              disabled={songs.length === 0}
            >
              <Play className="size-5 fill-current" />
              Tocar
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="rounded-full"
              onClick={handleShuffle}
              disabled={songs.length === 0}
            >
              <Shuffle className="size-5" />
              Shuffle
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={toggleStar}
              title={isStarred ? 'Remover dos favoritos' : 'Favoritar'}
            >
              <Heart className={cn('size-6', isStarred ? 'fill-primary text-primary' : 'text-zinc-400')} />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela de músicas */}
      <div>
        <div className="mb-2 grid grid-cols-[2rem_1fr_auto] gap-3 border-b border-zinc-800 px-3 pb-2 text-xs tracking-wider text-zinc-500 uppercase md:grid-cols-[2rem_minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_auto]">
          <div className="text-center">#</div>
          <div>Título</div>
          <div className="hidden md:block">Álbum</div>
          <div className="hidden md:block">Artista</div>
          <div className="text-right">Duração</div>
        </div>

        {songs.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">Nenhuma música neste álbum</div>
        ) : (
          <div className="space-y-0.5">
            {songs.map((song, index) => (
              <SongRow
                key={song.id}
                song={song}
                index={index}
                queue={songs}
                showAlbum={false}
                showArtist={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
