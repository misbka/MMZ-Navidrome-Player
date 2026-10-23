import { useEffect } from 'react'
import { usePlayerStore } from '@/store/playerStore'
import { star, unstar } from '@/services/subsonic'
import { toast } from 'sonner'

/** Registra os atalhos globais de teclado do player. */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isTyping =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('contenteditable') === 'true')
      if (isTyping) return

      const store = usePlayerStore.getState()
      const key = e.key.toLowerCase()

      switch (true) {
        case e.code === 'Space':
          e.preventDefault()
          store.togglePlay()
          break
        case e.key === 'ArrowLeft' && e.ctrlKey:
          e.preventDefault()
          store.previous()
          break
        case e.key === 'ArrowRight' && e.ctrlKey:
          e.preventDefault()
          store.next()
          break
        case e.key === 'ArrowLeft':
          e.preventDefault()
          store.seek(Math.max(0, store.currentPosition - 5))
          break
        case e.key === 'ArrowRight':
          e.preventDefault()
          store.seek(store.currentPosition + 5)
          break
        case e.key === 'ArrowUp':
          e.preventDefault()
          store.setVolume(Math.min(1, store.volume + 0.1))
          break
        case e.key === 'ArrowDown':
          e.preventDefault()
          store.setVolume(Math.max(0, store.volume - 0.1))
          break
        case key === 'n':
          e.preventDefault()
          store.next()
          break
        case key === 'p':
          e.preventDefault()
          store.previous()
          break
        case key === 'm':
          e.preventDefault()
          store.toggleMute()
          break
        case key === 's':
          e.preventDefault()
          store.toggleShuffle()
          break
        case key === 'r':
          e.preventDefault()
          store.cycleRepeat()
          break
        case key === 'q':
          e.preventDefault()
          store.toggleQueue()
          break
        case key === 'l': {
          e.preventDefault()
          const song = store.getCurrentSong()
          if (!song) return
          const starred = store.currentSongStarred === true
          const action = starred ? unstar : star
          action(song.id)
            .then(() => {
              store.setCurrentSongStarred(!starred)
              toast.success(starred ? 'Removido dos favoritos' : 'Adicionado aos favoritos')
            })
            .catch(() => toast.error('Erro ao atualizar favorito'))
          break
        }
        case e.key === '?':
          e.preventDefault()
          window.dispatchEvent(new CustomEvent('toggle-shortcuts-help'))
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
