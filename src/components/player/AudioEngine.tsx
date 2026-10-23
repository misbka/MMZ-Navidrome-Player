import { useEffect, useRef } from 'react'
import { getCoverArtUrl, getStreamUrl, scrobble } from '@/services/subsonic'
import { usePlayerStore } from '@/store/playerStore'

/**
 * Motor de áudio: elemento <audio> HTML5 controlado pelo playerStore.
 * Também integra MediaSession API e notificações.
 */
export function AudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const switchingRef = useRef(false)

  const queue = usePlayerStore((s) => s.queue)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)
  const isMuted = usePlayerStore((s) => s.isMuted)
  const isSeeking = usePlayerStore((s) => s.isSeeking)
  const currentPosition = usePlayerStore((s) => s.currentPosition)

  const song = queue[currentIndex] ?? null

  // src da música atual
  const streamUrl = song ? getStreamUrl(song.id) : null

  // controla play/pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying && streamUrl) {
      const p = audio.play()
      if (p?.catch) {
        p.catch((err: unknown) => {
          // autoplay bloqueado pelo browser — não é erro fatal
          if ((err as Error)?.name !== 'NotAllowedError') {
            console.error('Erro ao reproduzir:', err)
          }
        })
      }
    } else {
      audio.pause()
    }
  }, [isPlaying, streamUrl])

  // troca de música: recarrega
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !streamUrl) return
    switchingRef.current = true
    audio.src = streamUrl
    audio.load()
    usePlayerStore.getState().setCurrentPosition(0)
    if (usePlayerStore.getState().isPlaying) {
      audio
        .play()
        .catch(() => {
          /* autoplay pode ser bloqueado */
        })
        .finally(() => {
          switchingRef.current = false
        })
    } else {
      switchingRef.current = false
    }
  }, [streamUrl])

  // volume / mute
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    audio.muted = isMuted
  }, [volume, isMuted])

  // seek externo (teclado / clique na barra)
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !isSeeking) return
    audio.currentTime = usePlayerStore.getState().currentPosition
    usePlayerStore.getState().setSeeking(false)
  }, [isSeeking, currentPosition])

  // eventos do elemento audio
  const handleTimeUpdate = () => {
    const audio = audioRef.current
    if (!audio) return
    const store = usePlayerStore.getState()
    if (store.isSeeking) return
    store.setCurrentPosition(audio.currentTime)

    // scrobble: 50% ou 4 minutos (o que vier primeiro), apenas 1x por música
    const duration = audio.duration
    if (!store.hasScrobbled && song && !isNaN(duration) && duration > 0) {
      const threshold = Math.min(duration * 0.5, 240)
      if (audio.currentTime >= threshold) {
        store.markScrobbled()
        scrobble(song.id, Date.now(), true).catch(() => {
          /* scrobble é best-effort */
        })
      }
    }
  }

  const handleLoadedMetadata = () => {
    const audio = audioRef.current
    if (!audio || isNaN(audio.duration)) return
    usePlayerStore.getState().setDuration(audio.duration)
  }

  const handleEnded = () => {
    const store = usePlayerStore.getState()
    const audio = audioRef.current
    if (store.repeatMode === 'one' && audio) {
      audio.currentTime = 0
      audio.play().catch(() => undefined)
      return
    }
    store.next()
  }

  const handlePlay = () => {
    if (!usePlayerStore.getState().isPlaying) usePlayerStore.getState().play()
  }

  // pausa vinda de fora (botão do sistema, headset etc) — sincroniza o store,
  // mas ignora a pausa transitória causada por troca de música (audio.src recarregado)
  const handlePause = () => {
    if (switchingRef.current) return
    const audio = audioRef.current
    if (!audio) return
    // durante o carregamento de um novo src o elemento também dispara pause
    if (audio.readyState < 2) return
    if (usePlayerStore.getState().isPlaying) usePlayerStore.getState().pause()
  }

  // MediaSession API
  useEffect(() => {
    if (!('mediaSession' in navigator) || !song) return
    const artwork = song.coverArt ? getArtworkUrls(song.coverArt) : []
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist ?? 'Desconhecido',
      album: song.album ?? '',
      artwork,
    })
  }, [song?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    const store = usePlayerStore.getState()
    try {
      ms.setActionHandler('play', () => store.play())
      ms.setActionHandler('pause', () => store.pause())
      ms.setActionHandler('previoustrack', () => store.previous())
      ms.setActionHandler('nexttrack', () => store.next())
      ms.setActionHandler('seekbackward', (details) =>
        store.seek(Math.max(0, store.currentPosition - (details.seekOffset ?? 10))),
      )
      ms.setActionHandler('seekforward', (details) =>
        store.seek(store.currentPosition + (details.seekOffset ?? 10)),
      )
      ms.setActionHandler('seekto', (details) => {
        if (details.seekTime != null) store.seek(details.seekTime)
      })
    } catch {
      /* nem todos os browsers suportam todos os handlers */
    }
  }, [])

  // Notification API (opcional) — notifica ao trocar de música
  useEffect(() => {
    if (!song || !isPlaying) return
    // no Electron preferimos a notificação do processo main (não pede permissão)
    if (window.electronAPI?.showNotification) {
      window.electronAPI.showNotification(song.title, song.artist ?? '')
      return
    }
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    try {
      new Notification(song.title, { body: song.artist ?? '', silent: true })
    } catch {
      /* ignora */
    }
  }, [song?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // só pede permissão quando rodando num browser (no Electron o main cuida disso)
  useEffect(() => {
    if (window.electronAPI) return
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined)
    }
  }, [])

  return (
    <audio
      ref={audioRef}
      preload="metadata"
      className="hidden"
      data-testid="audio-engine"
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleLoadedMetadata}
      onEnded={handleEnded}
      onPlay={handlePlay}
      onPause={handlePause}
    />
  )
}

function getArtworkUrls(coverArtId: string): MediaImage[] {
  const sizes = [96, 192, 256, 512]
  const images: MediaImage[] = []
  for (const size of sizes) {
    const url = getCoverArtUrl(coverArtId, size)
    if (url) images.push({ src: url, sizes: `${size}x${size}` })
  }
  return images
}
