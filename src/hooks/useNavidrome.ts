import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  getAlbum,
  getAlbumList2,
  getArtist,
  getArtistInfo2,
  getArtists,
  getPlaylist,
  getPlaylists,
  getRandomSongs,
  getStarred2,
  search3,
  subsonicRequest,
} from '@/services/subsonic'
import type {
  Album,
  AlbumID3,
  AlbumListType,
  Artist,
  ArtistID3,
  ArtistInfo2,
  Playlist,
  SearchResult3,
  Song,
} from '@/types/subsonic'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  options: { enabled?: boolean; showError?: boolean } = {},
): AsyncState<T> {
  const { enabled = true, showError = true } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fn()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Erro ao carregar dados'
        setError(message)
        if (showError) toast.error(message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, enabled])

  return { data, loading, error, refetch }
}

// ---------------------------------------------------------------------------
// Álbuns
// ---------------------------------------------------------------------------

export function useAlbumList(
  type: AlbumListType = 'newest',
  size = 50,
  offset = 0,
): AsyncState<Album[]> {
  return useAsync(() => getAlbumList2(type, size, offset), [type, size, offset])
}

export function useAlbum(id: string | undefined): AsyncState<AlbumID3 | null> {
  return useAsync(() => getAlbum(id ?? ''), [id], { enabled: !!id })
}

// ---------------------------------------------------------------------------
// Artistas
// ---------------------------------------------------------------------------

export function useArtists(): AsyncState<Artist[]> {
  return useAsync(() => getArtists(), [])
}

export function useArtist(id: string | undefined): AsyncState<ArtistID3 | null> {
  return useAsync(() => getArtist(id ?? ''), [id], { enabled: !!id })
}

export function useArtistInfo(id: string | undefined): AsyncState<ArtistInfo2 | null> {
  return useAsync(() => getArtistInfo2(id ?? ''), [id], { enabled: !!id, showError: false })
}

export function useArtistAlbums(id: string | undefined): AsyncState<Album[]> {
  return useAsync(
    async () => {
      const res = await subsonicRequest<Record<string, unknown>>(undefined, 'getArtist', { id })
      const artist = (res?.artist ?? null) as (ArtistID3 & { album?: Album[] }) | null
      const albums = artist?.album ?? []
      // ordena por ano
      return [...albums].sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
    },
    [id],
    { enabled: !!id },
  )
}

// ---------------------------------------------------------------------------
// Playlists
// ---------------------------------------------------------------------------

export function usePlaylists(): AsyncState<Playlist[]> {
  return useAsync(() => getPlaylists(), [])
}

export function usePlaylist(id: string | undefined): AsyncState<Playlist | null> {
  return useAsync(() => getPlaylist(id ?? ''), [id], { enabled: !!id })
}

// ---------------------------------------------------------------------------
// Busca / aleatórios / favoritos
// ---------------------------------------------------------------------------

export function useSearch(query: string): AsyncState<SearchResult3> {
  return useAsync(() => search3(query), [query], { enabled: query.trim().length > 0 })
}

export function useRandomSongs(size = 50): AsyncState<Song[]> {
  return useAsync(() => getRandomSongs(size), [size])
}

export function useStarred(): AsyncState<{ song?: Song[]; album?: Album[]; artist?: Artist[] }> {
  return useAsync(() => getStarred2(), [])
}
