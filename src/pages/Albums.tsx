import { useState } from 'react'
import { AlbumCard } from '@/components/library/AlbumCard'
import { PageSkeleton } from '@/components/layout/Layout'
import { useAlbumList } from '@/hooks/useNavidrome'
import { cn } from '@/lib/utils'
import type { AlbumListType } from '@/types/subsonic'

const FILTERS: Array<{ value: AlbumListType; label: string }> = [
  { value: 'newest', label: 'Adicionados recentemente' },
  { value: 'frequent', label: 'Mais tocados' },
  { value: 'recent', label: 'Tocados recentemente' },
  { value: 'starred', label: 'Favoritos' },
  { value: 'random', label: 'Aleatórios' },
  { value: 'alphabeticalByName', label: 'A-Z' },
]

export function AlbumsPage() {
  const [filter, setFilter] = useState<AlbumListType>('newest')
  const { data: albums, loading } = useAlbumList(filter, 60)

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Álbuns</h1>
        <p className="text-zinc-400">Explore toda a sua coleção</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
              filter === f.value
                ? 'border-primary bg-primary text-black'
                : 'border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <PageSkeleton count={10} />
      ) : (albums?.length ?? 0) === 0 ? (
        <div className="py-20 text-center text-zinc-500">Nenhum álbum encontrado</div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {albums!.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      )}
    </div>
  )
}
