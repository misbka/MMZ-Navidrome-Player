import { Link } from 'react-router-dom'
import { Disc3 } from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'
import { getCoverArtUrl } from '@/services/subsonic'
import { formatTotalDuration } from '@/lib/utils'
import type { Playlist } from '@/types/subsonic'

interface PlaylistCardProps {
  playlist: Playlist
}

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  const playPlaylist = usePlayerStore((s) => s.playPlaylist)
  const coverUrl = playlist.coverArt ? getCoverArtUrl(playlist.coverArt, 300) : null

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const songs = playlist.entry ?? []
    if (songs.length === 0) return
    playPlaylist(songs, 0)
  }

  return (
    <Link
      to={`/playlists/${playlist.id}`}
      className="group block rounded-lg p-3 transition-colors hover:bg-zinc-900"
    >
      <div className="relative aspect-square overflow-hidden rounded-md bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-lg">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={playlist.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Disc3 className="size-10 text-zinc-700" />
          </div>
        )}
        {(playlist.entry?.length ?? 0) > 0 && (
          <button
            onClick={handlePlay}
            className="absolute right-2 bottom-2 flex size-10 translate-y-2 items-center justify-center rounded-full bg-primary text-black opacity-0 shadow-xl transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
            aria-label={`Tocar ${playlist.name}`}
          >
            <svg viewBox="0 0 24 24" className="ml-0.5 size-5 fill-current">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
      </div>
      <div className="mt-3 min-w-0">
        <div className="truncate text-sm font-medium text-zinc-100">{playlist.name}</div>
        <div className="truncate text-xs text-zinc-400">
          {playlist.songCount ?? playlist.entry?.length ?? 0} músicas
          {playlist.duration ? ` · ${formatTotalDuration(playlist.duration)}` : ''}
        </div>
      </div>
    </Link>
  )
}
