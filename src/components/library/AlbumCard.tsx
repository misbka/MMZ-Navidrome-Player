import { Link, useNavigate } from 'react-router-dom'
import { Disc3, Play } from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'
import { getAlbum, getCoverArtUrl } from '@/services/subsonic'
import type { Album, Song } from '@/types/subsonic'
import { toast } from 'sonner'

interface AlbumCardProps {
  album: Album
  showYear?: boolean
}

export function AlbumCard({ album, showYear = true }: AlbumCardProps) {
  const navigate = useNavigate()
  const name = album.name ?? album.title ?? 'Sem título'
  const coverUrl = getCoverArtUrl(album.coverArt ?? album.id, 300)

  const handlePlay = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const full = await getAlbum(album.id)
      const songs: Song[] = full?.song ?? []
      if (songs.length === 0) {
        toast.error('Este álbum não tem músicas disponíveis')
        return
      }
      usePlayerStore.getState().playAlbum(songs, 0)
    } catch {
      toast.error('Erro ao carregar o álbum')
    }
  }

  return (
    <div className="group relative">
      <Link
        to={`/albums/${album.id}`}
        className="block rounded-lg p-3 transition-colors hover:bg-zinc-900"
      >
        <div className="relative aspect-square overflow-hidden rounded-md bg-zinc-900 shadow-lg">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={name}
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Disc3 className="size-10 text-zinc-700" />
            </div>
          )}
          <button
            onClick={handlePlay}
            className="absolute right-2 bottom-2 flex size-10 translate-y-2 items-center justify-center rounded-full bg-primary text-black opacity-0 shadow-xl transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 hover:scale-105"
            aria-label={`Tocar ${name}`}
          >
            <Play className="ml-0.5 size-5 fill-current" />
          </button>
        </div>
        <div className="mt-3 min-w-0">
          <div className="truncate text-sm font-medium text-zinc-100">{name}</div>
          <div
            className="truncate text-xs text-zinc-400 hover:underline"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (album.artistId) navigate(`/artists/${album.artistId}`)
            }}
          >
            {album.artist ?? 'Desconhecido'}
            {showYear && album.year ? ` · ${album.year}` : ''}
          </div>
        </div>
      </Link>
    </div>
  )
}
