import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LrcLine } from '@/services/lrclib'
import type { Song } from '@/types/subsonic'

export type RepeatMode = 'off' | 'all' | 'one'

export interface CurrentLyrics {
  synced: LrcLine[] | null
  plain: string | null
}

interface PlayerState {
  queue: Song[]
  originalQueue: Song[]
  currentIndex: number
  isPlaying: boolean
  volume: number
  isMuted: boolean
  repeatMode: RepeatMode
  isShuffled: boolean
  currentPosition: number
  duration: number
  currentLyrics: CurrentLyrics | null
  isLyricsLoading: boolean
  /** se a música atual está favoritada (estrelada) */
  currentSongStarred: boolean | null
  /** flag p/ scrobble único por música */
  hasScrobbled: boolean
  queueOpen: boolean
  lyricsOpen: boolean
  isSeeking: boolean

  // playback
  play: () => void
  pause: () => void
  togglePlay: () => void
  next: () => void
  previous: () => void
  jumpTo: (index: number) => void
  seek: (seconds: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  cycleRepeat: () => void
  toggleShuffle: () => void
  markScrobbled: () => void
  resetScrobbleFlag: () => void

  // queue
  addToQueue: (songs: Song[]) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
  reorderQueue: (from: number, to: number) => void

  // play helpers
  playAlbum: (songs: Song[], startIndex?: number) => void
  playPlaylist: (songs: Song[], startIndex?: number) => void
  playSong: (song: Song, queue?: Song[]) => void
  playNext: (song: Song) => void

  // position / duration
  setCurrentPosition: (position: number) => void
  setDuration: (duration: number) => void
  setSeeking: (seeking: boolean) => void

  // lyrics
  setCurrentLyrics: (lyrics: CurrentLyrics | null) => void
  setLyricsLoading: (loading: boolean) => void
  setCurrentSongStarred: (starred: boolean | null) => void

  // panels
  toggleQueue: (open?: boolean) => void
  toggleLyrics: (open?: boolean) => void

  // reidratação (persist guarda só parte do estado)
  getCurrentSong: () => Song | null
}

function shuffledKeepingCurrent(queue: Song[], currentIndex: number): Song[] {
  const rest = queue.filter((_, i) => i !== currentIndex)
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j]!, rest[i]!]
  }
  if (currentIndex < 0 || currentIndex >= queue.length) return rest
  return [...rest.slice(0, currentIndex), queue[currentIndex]!, ...rest.slice(currentIndex)]
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      originalQueue: [],
      currentIndex: -1,
      isPlaying: false,
      volume: 0.8,
      isMuted: false,
      repeatMode: 'off',
      isShuffled: false,
      currentPosition: 0,
      duration: 0,
      currentLyrics: null,
      isLyricsLoading: false,
      currentSongStarred: null,
      hasScrobbled: false,
      queueOpen: false,
      lyricsOpen: false,
      isSeeking: false,

      getCurrentSong: () => {
        const { queue, currentIndex } = get()
        if (currentIndex < 0 || currentIndex >= queue.length) return null
        return queue[currentIndex] ?? null
      },

      play: () => {
        if (get().queue.length === 0) return
        set({ isPlaying: true })
      },
      pause: () => set({ isPlaying: false }),
      togglePlay: () => {
        const { queue, isPlaying } = get()
        if (queue.length === 0) return
        set({ isPlaying: !isPlaying })
      },

      next: () => {
        const { queue, currentIndex, repeatMode } = get()
        if (queue.length === 0) return
        if (currentIndex < queue.length - 1) {
          set({
            currentIndex: currentIndex + 1,
            currentPosition: 0,
            hasScrobbled: false,
            currentLyrics: null,
            isPlaying: true,
          })
          return
        }
        if (repeatMode === 'all') {
          set({ currentIndex: 0, currentPosition: 0, hasScrobbled: false, currentLyrics: null, isPlaying: true })
          return
        }
        // última música e repeat off/one → para
        set({ isPlaying: false, currentPosition: 0 })
      },

      previous: () => {
        const { queue, currentIndex, currentPosition, isPlaying } = get()
        if (queue.length === 0) return
        // se passou de 3s, reinicia a música atual
        if (currentPosition > 3) {
          set({ currentPosition: 0, isSeeking: true })
          return
        }
        if (currentIndex > 0) {
          set({
            currentIndex: currentIndex - 1,
            currentPosition: 0,
            hasScrobbled: false,
            currentLyrics: null,
            isPlaying: true,
          })
          return
        }
        // primeira música: reinicia
        set({ currentPosition: 0, isSeeking: true, isPlaying })
      },

      jumpTo: (index) => {
        const { queue } = get()
        if (index < 0 || index >= queue.length) return
        set({
          currentIndex: index,
          currentPosition: 0,
          hasScrobbled: false,
          currentLyrics: null,
          isPlaying: true,
        })
      },

      seek: (seconds) => set({ currentPosition: Math.max(0, seconds), isSeeking: true }),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)), isMuted: false }),
      toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),

      cycleRepeat: () =>
        set((s) => ({
          repeatMode: s.repeatMode === 'off' ? 'all' : s.repeatMode === 'all' ? 'one' : 'off',
        })),

      toggleShuffle: () =>
        set((s) => {
          if (s.isShuffled) {
            // restaura a fila original e reencontra a música atual
            const current = s.queue[s.currentIndex]
            const original = s.originalQueue
            const idx = current ? original.findIndex((song) => song.id === current.id) : 0
            return {
              queue: original,
              originalQueue: [],
              isShuffled: false,
              currentIndex: idx >= 0 ? idx : 0,
            }
          }
          if (s.queue.length === 0) return {}
          const queue = shuffledKeepingCurrent(s.queue, s.currentIndex)
          return { queue, originalQueue: s.queue, isShuffled: true }
        }),

      markScrobbled: () => set({ hasScrobbled: true }),
      resetScrobbleFlag: () => set({ hasScrobbled: false }),

      addToQueue: (songs) =>
        set((s) => {
          if (s.queue.length === 0) {
            return { queue: songs, originalQueue: s.isShuffled ? songs : [], currentIndex: 0, isPlaying: true }
          }
          const queue = [...s.queue, ...songs]
          const originalQueue = s.isShuffled ? [...s.originalQueue, ...songs] : s.originalQueue
          return { queue, originalQueue }
        }),

      playNext: (song) =>
        set((s) => {
          if (s.queue.length === 0 || s.currentIndex < 0) {
            return { queue: [song], originalQueue: [], currentIndex: 0, isPlaying: true }
          }
          const queue = [...s.queue]
          queue.splice(s.currentIndex + 1, 0, song)
          let originalQueue = s.originalQueue
          if (s.isShuffled) {
            originalQueue = [...originalQueue]
            originalQueue.splice(s.currentIndex + 1, 0, song)
          }
          return { queue, originalQueue }
        }),

      removeFromQueue: (index) =>
        set((s) => {
          if (index < 0 || index >= s.queue.length) return {}
          const queue = s.queue.filter((_, i) => i !== index)
          let originalQueue = s.originalQueue
          const removedSong = s.queue[index]
          if (s.isShuffled && removedSong) {
            const oi = originalQueue.findIndex((song) => song.id === removedSong.id)
            if (oi >= 0) originalQueue = originalQueue.filter((_, i) => i !== oi)
          }
          let currentIndex = s.currentIndex
          if (index < s.currentIndex) currentIndex -= 1
          if (queue.length === 0) {
            return { queue: [], originalQueue: [], currentIndex: -1, isPlaying: false, currentPosition: 0 }
          }
          if (index === s.currentIndex) {
            if (currentIndex >= queue.length) currentIndex = queue.length - 1
            return {
              queue,
              originalQueue,
              currentIndex,
              currentPosition: 0,
              hasScrobbled: false,
              currentLyrics: null,
              isPlaying: false,
            }
          }
          if (currentIndex >= queue.length) currentIndex = queue.length - 1
          return { queue, originalQueue, currentIndex }
        }),

      clearQueue: () =>
        set({
          queue: [],
          originalQueue: [],
          currentIndex: -1,
          isPlaying: false,
          currentPosition: 0,
          duration: 0,
          currentLyrics: null,
          hasScrobbled: false,
        }),

      reorderQueue: (from, to) =>
        set((s) => {
          if (from === to || from < 0 || to < 0 || from >= s.queue.length || to >= s.queue.length)
            return {}
          const queue = [...s.queue]
          const [moved] = queue.splice(from, 1)
          queue.splice(to, 0, moved!)
          let currentIndex = s.currentIndex
          if (from === currentIndex) currentIndex = to
          else {
            if (from < currentIndex && to >= currentIndex) currentIndex -= 1
            if (from > currentIndex && to <= currentIndex) currentIndex += 1
          }
          return { queue, currentIndex }
        }),

      playAlbum: (songs, startIndex = 0) =>
        set({
          queue: songs,
          originalQueue: [],
          currentIndex: startIndex,
          isPlaying: true,
          currentPosition: 0,
          hasScrobbled: false,
          currentLyrics: null,
          isShuffled: false,
        }),

      playPlaylist: (songs, startIndex = 0) =>
        set({
          queue: songs,
          originalQueue: [],
          currentIndex: startIndex,
          isPlaying: true,
          currentPosition: 0,
          hasScrobbled: false,
          currentLyrics: null,
          isShuffled: false,
        }),

      playSong: (song, queue) =>
        set((s) => {
          const q = queue ?? [song]
          const idx = Math.max(
            0,
            q.findIndex((song2) => song2.id === song.id),
          )
          return {
            queue: q,
            originalQueue: s.isShuffled ? [] : s.originalQueue,
            isShuffled: false,
            currentIndex: idx,
            isPlaying: true,
            currentPosition: 0,
            hasScrobbled: false,
            currentLyrics: null,
          }
        }),

      setCurrentPosition: (position) => set({ currentPosition: position, isSeeking: false }),
      setDuration: (duration) => set({ duration }),
      setSeeking: (seeking) => set({ isSeeking: seeking }),

      setCurrentLyrics: (lyrics) => set({ currentLyrics: lyrics }),
      setLyricsLoading: (loading) => set({ isLyricsLoading: loading }),
      setCurrentSongStarred: (starred) => set({ currentSongStarred: starred }),

      toggleQueue: (open) =>
        set((s) => {
          const queueOpen = open ?? !s.queueOpen
          return { queueOpen, lyricsOpen: queueOpen ? false : s.lyricsOpen }
        }),
      toggleLyrics: (open) =>
        set((s) => {
          const lyricsOpen = open ?? !s.lyricsOpen
          return { lyricsOpen, queueOpen: lyricsOpen ? false : s.queueOpen }
        }),
    }),
    {
      name: 'navidrome-player',
      partialize: (state) => ({
        queue: state.queue,
        originalQueue: state.originalQueue,
        currentIndex: state.currentIndex,
        volume: state.volume,
        repeatMode: state.repeatMode,
        isShuffled: state.isShuffled,
        isMuted: state.isMuted,
      }),
    },
  ),
)
