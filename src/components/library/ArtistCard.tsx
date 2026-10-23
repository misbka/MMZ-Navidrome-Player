import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import type { Artist } from '@/types/subsonic'
import { getCoverArtUrl } from '@/services/subsonic'

interface ArtistCardProps {
  artist: Artist
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const coverUrl = getCoverArtUrl(artist.coverArt ?? artist.id, 300)

  return (
    <Link
      to={`/artists/${artist.id}`}
      className="block rounded-lg p-3 transition-colors hover:bg-zinc-900"
    >
      <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full bg-zinc-900 shadow-lg">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={artist.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <User className="size-10 text-zinc-700" />
          </div>
        )}
      </div>
      <div className="mt-3 text-center">
        <div className="truncate text-sm font-medium text-zinc-100">{artist.name}</div>
        {typeof artist.albumCount === 'number' && (
          <div className="text-xs text-zinc-400">
            {artist.albumCount} {artist.albumCount === 1 ? 'álbum' : 'álbuns'}
          </div>
        )}
      </div>
    </Link>
  )
}
