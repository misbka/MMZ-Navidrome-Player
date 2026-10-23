import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { ArtistCard } from '@/components/library/ArtistCard'
import { PageSkeleton } from '@/components/layout/Layout'
import { useArtists } from '@/hooks/useNavidrome'

export function ArtistsPage() {
  const { data: artists, loading } = useArtists()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const list = artists ?? []
    if (!query.trim()) return list
    const q = query.toLowerCase()
    return list.filter((a) => a.name.toLowerCase().includes(q))
  }, [artists, query])

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Artistas</h1>
        <p className="text-zinc-400">Todos os artistas da sua biblioteca</p>
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filtrar artistas..."
        className="max-w-sm bg-zinc-900"
      />

      {loading ? (
        <PageSkeleton count={10} />
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-zinc-500">Nenhum artista encontrado</div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {filtered.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      )}
    </div>
  )
}
