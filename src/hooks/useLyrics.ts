import { useEffect, useRef } from 'react'
import { getSong } from '@/services/subsonic'
import { searchLyrics, type LyricsResult } from '@/services/lrclib'
import { usePlayerStore } from '@/store/playerStore'

const memoryCache = new Map<string, LyricsResult | null>()

function cacheKey(songId: string) {
  return `lyrics:${songId}`
}

async function loadLyrics(
  songId: string,
  title: string,
  artist: string,
  album?: string,
  duration?: number,
): Promise<LyricsResult | null> {
  // 1. cache em memória
  if (memoryCache.has(songId)) return memoryCache.get(songId) ?? null

  // 2. cache persistente (Electron)
  if (window.electronAPI?.getLyrics) {
    try {
      const cached = await window.electronAPI.getLyrics(cacheKey(songId))
      if (cached) {
        memoryCache.set(songId, cached as LyricsResult)
        return cached as LyricsResult
      }
    } catch {
      /* segue para a busca */
    }
  }

  // 3. busca no LRCLib
  const result = await searchLyrics(title, artist, album, duration)
  memoryCache.set(songId, result)

  // grava no cache persistente se disponível
  if (result && window.electronAPI?.saveLyrics) {
    try {
      await window.electronAPI.saveLyrics(cacheKey(songId), result)
    } catch {
      /* ignora */
    }
  }

  return result
}

/** Busca letras da música atual automaticamente (com cache em memória). */
export function useLyrics() {
  const song = usePlayerStore((s) => s.queue[s.currentIndex] ?? null)
  const setCurrentLyrics = usePlayerStore((s) => s.setCurrentLyrics)
  const setLyricsLoading = usePlayerStore((s) => s.setLyricsLoading)
  const setCurrentSongStarred = usePlayerStore((s) => s.setCurrentSongStarred)
  const seqRef = useRef(0)

  useEffect(() => {
    if (!song) {
      setCurrentLyrics(null)
      setCurrentSongStarred(null)
      return
    }

    const seq = ++seqRef.current
    setLyricsLoading(true)
    setCurrentSongStarred(song.star ? true : false)

    loadLyrics(song.id, song.title, song.artist ?? '', song.album, song.duration)
      .then((result) => {
        if (seq !== seqRef.current) return
        setCurrentLyrics(result)
      })
      .finally(() => {
        if (seq === seqRef.current) setLyricsLoading(false)
      })

    // descobre o estado de favorito real via API (o campo `star` nem sempre vem)
    getSong(song.id)
      .then((full) => {
        if (seq !== seqRef.current) return
        setCurrentSongStarred(full?.star ? true : false)
      })
      .catch(() => {
        /* mantém o valor heurístico */
      })
  }, [song?.id, setCurrentLyrics, setLyricsLoading, setCurrentSongStarred, song])
}

/** Busca letras manualmente (input do usuário) — usado pelo painel de letras. */
export async function fetchLyricsManual(
  songId: string,
  title: string,
  artist: string,
): Promise<LyricsResult | null> {
  memoryCache.delete(songId)
  const result = await searchLyrics(title, artist)
  memoryCache.set(songId, result)
  if (result && window.electronAPI?.saveLyrics) {
    try {
      await window.electronAPI.saveLyrics(cacheKey(songId), result)
    } catch {
      /* ignora */
    }
  }
  return result
}

export function getActiveLineIndex(
  synced: Array<{ time: number; text: string }> | null,
  position: number,
): number {
  if (!synced || synced.length === 0) return -1
  let idx = -1
  for (let i = 0; i < synced.length; i++) {
    if (synced[i]!.time <= position) idx = i
    else break
  }
  return idx
}
