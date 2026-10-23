import { useState } from 'react'
import { Heart, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlbumCard } from '@/components/library/AlbumCard'
import { ArtistCard } from '@/components/library/ArtistCard'
import { SongRow } from '@/components/library/SongRow'
import { PageSkeleton } from '@/components/layout/Layout'
import { useStarred } from '@/hooks/useNavidrome'
import { unstar } from '@/services/subsonic'
import type { Album, Artist, Song } from '@/types/subsonic'

export function FavoritesPage() {
  const { data, loading, refetch } = useStarred()
  const [tab, setTab] = useState('songs')

  const songs: Song[] = data?.song ?? []
  const albums: Album[] = data?.album ?? []
  const artists: Artist[] = data?.artist ?? []

  const unstarItem = async (id: string) => {
    try {
      await unstar(id)
      toast.success('Removido dos favoritos')
      refetch()
    } catch {
      toast.error('Erro ao remover favorito')
    }
  }

  const total = songs.length + albums.length + artists.length

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <div className="flex items-center gap-3">
          <div className="flex size-16 items-center justify-center rounded-lg bg-gradient-to-br from-purple-700 to-zinc-800">
            <Heart className="size-8 fill-white text-white" />
          </div>
          <div className="space-y-2">
            <div className="h-6 w-40 animate-pulse rounded bg-zinc-900" />
            <div className="h-4 w-24 animate-pulse rounded bg-zinc-900" />
          </div>
        </div>
        <PageSkeleton count={10} />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-700 to-zinc-800 shadow-2xl sm:size-28">
          <Heart className="size-10 fill-white text-white" />
        </div>
        <div>
          <div className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            Coleção
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Favoritos</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {total} {total === 1 ? 'item' : 'itens'}
          </p>
        </div>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24 text-center text-zinc-500">
          <Loader2 className="size-8 text-zinc-700" />
          <p>Você ainda não favoritou nada</p>
          <p className="text-sm">Clique na estrela de músicas, álbuns ou artistas</p>
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="songs">Músicas ({songs.length})</TabsTrigger>
            <TabsTrigger value="albums">Álbuns ({albums.length})</TabsTrigger>
            <TabsTrigger value="artists">Artistas ({artists.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="songs" className="mt-4">
            {songs.length === 0 ? (
              <Empty text="Nenhuma música favoritada" />
            ) : (
              <div className="space-y-0.5">
                {songs.map((song, index) => (
                  <div key={`${song.id}-${index}`} className="group relative">
                    <SongRow song={song} index={index} queue={songs} />
                    <button
                      onClick={() => unstarItem(song.id)}
                      className="absolute top-1/2 right-2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-zinc-800 p-2 text-red-400 opacity-0 transition-opacity group-hover:flex group-hover:opacity-100"
                      title="Remover dos favoritos"
                    >
                      <Heart className="size-4 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="albums" className="mt-4">
            {albums.length === 0 ? (
              <Empty text="Nenhum álbum favoritado" />
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {albums.map((album) => (
                  <div key={album.id} className="group relative">
                    <AlbumCard album={album} />
                    <button
                      onClick={() => unstarItem(album.id)}
                      className="absolute top-3 right-3 z-10 hidden size-8 items-center justify-center rounded-full bg-zinc-950/80 text-red-400 backdrop-blur transition-opacity group-hover:flex"
                      title="Remover dos favoritos"
                    >
                      <Heart className="size-4 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="artists" className="mt-4">
            {artists.length === 0 ? (
              <Empty text="Nenhum artista favoritado" />
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                {artists.map((artist) => (
                  <div key={artist.id} className="group relative">
                    <ArtistCard artist={artist} />
                    <button
                      onClick={() => unstarItem(artist.id)}
                      className="absolute top-3 right-3 z-10 hidden size-8 items-center justify-center rounded-full bg-zinc-950/80 text-red-400 backdrop-blur transition-opacity group-hover:flex"
                      title="Remover dos favoritos"
                    >
                      <Heart className="size-4 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="py-16 text-center text-zinc-500">{text}</div>
}
