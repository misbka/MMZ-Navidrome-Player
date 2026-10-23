import { useSearchParams } from 'react-router-dom'
import { Search as SearchIcon } from 'lucide-react'
import { AlbumCard } from '@/components/library/AlbumCard'
import { ArtistCard } from '@/components/library/ArtistCard'
import { SongRow } from '@/components/library/SongRow'
import { PageSkeleton } from '@/components/layout/Layout'
import { useSearch } from '@/hooks/useNavidrome'

export function SearchPage() {
  const [params] = useSearchParams()
  const query = params.get('q')?.trim() ?? ''
  const { data, loading } = useSearch(query)

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-32 text-center text-zinc-500">
        <SearchIcon className="size-12 text-zinc-700" />
        <p className="text-lg">Busque por artistas, álbuns ou músicas</p>
        <p className="text-sm">Use a barra de busca no topo da página</p>
      </div>
    )
  }

  const artists = data?.artist ?? []
  const albums = data?.album ?? []
  const songs = data?.song ?? []
  const total = artists.length + albums.length + songs.length

  if (loading) {
    return (
      <div className="space-y-8 pb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Resultados para "<span className="text-primary">{query}</span>"
        </h1>
        <PageSkeleton count={10} />
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="py-24 text-center text-zinc-500">
        Nenhum resultado para "<span className="text-zinc-300">{query}</span>"
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-8">
      <h1 className="text-2xl font-bold tracking-tight">
        Resultados para "<span className="text-primary">{query}</span>"
      </h1>

      {artists.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Artistas</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {artists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        </section>
      )}

      {albums.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Álbuns</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        </section>
      )}

      {songs.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Músicas</h2>
          <div className="space-y-0.5">
            {songs.map((song, index) => (
              <SongRow key={song.id} song={song} index={index} queue={songs} showCover />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
