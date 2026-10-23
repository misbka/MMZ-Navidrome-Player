import { useParams } from 'react-router-dom'
import { User } from 'lucide-react'
import { AlbumCard } from '@/components/library/AlbumCard'
import { PageSkeleton } from '@/components/layout/Layout'
import { Skeleton } from '@/components/ui/skeleton'
import { useArtist, useArtistAlbums, useArtistInfo } from '@/hooks/useNavidrome'
import { getCoverArtUrl } from '@/services/subsonic'

export function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: artist, loading } = useArtist(id)
  const { data: info } = useArtistInfo(id)
  const { data: albums, loading: albumsLoading } = useArtistAlbums(id)

  if (loading) {
    return (
      <div className="space-y-8 pb-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
          <Skeleton className="size-52 rounded-full bg-zinc-900 sm:size-60" />
          <div className="space-y-3">
            <Skeleton className="h-3 w-20 bg-zinc-900" />
            <Skeleton className="h-10 w-64 bg-zinc-900" />
            <Skeleton className="h-4 w-32 bg-zinc-900" />
          </div>
        </div>
        <PageSkeleton count={8} />
      </div>
    )
  }

  if (!artist) {
    return <div className="py-20 text-center text-zinc-500">Artista não encontrado</div>
  }

  const imageUrl =
    artist.artistImageUrl ??
    (artist.coverArt ? getCoverArtUrl(artist.coverArt, 400) : null) ??
    info?.largeImageUrl

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={artist.name}
            className="size-52 shrink-0 rounded-full object-cover shadow-2xl sm:size-60"
          />
        ) : (
          <div className="flex size-52 shrink-0 items-center justify-center rounded-full bg-zinc-900 sm:size-60">
            <User className="size-20 text-zinc-700" />
          </div>
        )}
        <div className="space-y-2 text-center sm:text-left">
          <div className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">Artista</div>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">{artist.name}</h1>
          {typeof artist.albumCount === 'number' && (
            <p className="text-sm text-zinc-400">
              {artist.albumCount} {artist.albumCount === 1 ? 'álbum' : 'álbuns'}
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      {info?.biography && (
        <div className="max-w-3xl rounded-lg bg-zinc-900/60 p-5">
          <h2 className="mb-2 text-sm font-semibold tracking-wider text-zinc-400 uppercase">
            Sobre
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-line text-zinc-300">
            {info.biography}
          </p>
          {info.externalArtistUrl && (
            <a
              href={info.externalArtistUrl}
              className="mt-3 inline-block text-xs text-primary hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Ver perfil externo →
            </a>
          )}
        </div>
      )}

      {/* Álbuns */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Álbuns</h2>
        {albumsLoading ? (
          <PageSkeleton count={8} />
        ) : (albums?.length ?? 0) === 0 ? (
          <div className="py-16 text-center text-zinc-500">Nenhum álbum encontrado</div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {albums!.map((album) => (
              <AlbumCard key={album.id} album={album} showYear />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
