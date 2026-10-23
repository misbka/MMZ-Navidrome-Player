import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { AlbumCard } from '@/components/library/AlbumCard'
import { useAlbumList, useStarred } from '@/hooks/useNavidrome'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Album } from '@/types/subsonic'

interface CarouselProps {
  title: string
  to?: string
  albums: Album[]
  loading?: boolean
}

function Carousel({ title, to, albums, loading }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 400, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-6 w-48 bg-zinc-900" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square bg-zinc-900" />
              <Skeleton className="h-4 w-3/4 bg-zinc-900" />
              <Skeleton className="h-3 w-1/2 bg-zinc-900" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (albums.length === 0) return null

  return (
    <section className="group/carousel relative space-y-3">
      <div className="flex items-center justify-between">
        {to ? (
          <Link to={to} className="text-xl font-bold tracking-tight hover:underline">
            {title}
          </Link>
        ) : (
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        )}
        <div className="hidden gap-1 md:flex">
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            onClick={() => scrollBy(-1)}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            onClick={() => scrollBy(1)}
          >
            <ChevronRight className="size-5" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth pb-2"
      >
        {albums.map((album) => (
          <div key={album.id} className="w-40 shrink-0 sm:w-44">
            <AlbumCard album={album} />
          </div>
        ))}
      </div>
    </section>
  )
}

export function HomePage() {
  const newest = useAlbumList('newest', 12)
  const frequent = useAlbumList('frequent', 12)
  const recent = useAlbumList('recent', 12)
  const starred = useStarred()

  const loading = newest.loading || frequent.loading || recent.loading || starred.loading

  if (loading) {
    return (
      <div className="space-y-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Home</h1>
          <p className="text-zinc-400">Sua biblioteca em um só lugar</p>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Carousel key={i} title="" albums={[]} loading />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Home</h1>
        <p className="text-zinc-400">Sua biblioteca em um só lugar</p>
      </div>

      <Carousel title="Adicionados recentemente" to="/albums" albums={newest.data ?? []} />
      <Carousel title="Tocados recentemente" to="/albums" albums={recent.data ?? []} />
      <Carousel title="Mais tocados" to="/albums" albums={frequent.data ?? []} />
      <Carousel title="Favoritos" to="/favorites" albums={starred.data?.album ?? []} />

      {!loading &&
        (newest.data?.length ?? 0) === 0 &&
        (frequent.data?.length ?? 0) === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-zinc-500">
            <Loader2 className="size-8 text-zinc-700" />
            <p>Sua biblioteca está vazia</p>
            <p className="text-sm">Adicione músicas no seu servidor Navidrome</p>
          </div>
        )}
    </div>
  )
}
