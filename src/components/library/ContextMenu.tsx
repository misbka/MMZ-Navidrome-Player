import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ArrowUpRight,
  Disc3,
  Heart,
  ListPlus,
  Play,
  Plus,
  Share2,
  User,
} from 'lucide-react'
import {
  OPEN_CREATE_PLAYLIST_EVENT,
} from '@/components/library/CreatePlaylistDialog'
import { getPlaylists, star, unstar, updatePlaylist } from '@/services/subsonic'
import { usePlayerStore } from '@/store/playerStore'
import type { Song } from '@/types/subsonic'

interface SongContextMenuProps {
  song: Song
  children: React.ReactNode
  /** se a música está dentro de uma playlist, permite remover */
  playlistId?: string
  playlistIndex?: number
  onRemoved?: () => void
}

export function SongContextMenu({
  song,
  children,
  playlistId,
  playlistIndex,
  onRemoved,
}: SongContextMenuProps) {
  const navigate = useNavigate()
  const [playlists, setPlaylists] = useState<Array<{ id: string; name: string }> | null>(null)

  const loadPlaylists = async () => {
    if (playlists) return
    try {
      const list = await getPlaylists()
      setPlaylists(list.map((p) => ({ id: p.id, name: p.name })))
    } catch {
      toast.error('Erro ao carregar playlists')
    }
  }

  const handleAddToPlaylist = async (playlistId2: string) => {
    try {
      await updatePlaylist(playlistId2, { songIdToAdd: song.id })
      toast.success('Adicionado à playlist')
    } catch {
      toast.error('Erro ao adicionar à playlist')
    }
  }

  const handleNewPlaylist = () => {
    window.dispatchEvent(
      new CustomEvent(OPEN_CREATE_PLAYLIST_EVENT, {
        detail: { songIds: [song.id], onSuccess: () => setPlaylists(null) },
      }),
    )
  }

  const handleStar = async () => {
    try {
      await star(song.id)
      toast.success('Adicionado aos favoritos')
    } catch {
      toast.error('Erro ao favoritar')
    }
  }

  const handleUnstar = async () => {
    try {
      await unstar(song.id)
      toast.success('Removido dos favoritos')
    } catch {
      toast.error('Erro ao remover favorito')
    }
  }

  const handleShare = async () => {
    const url = song.albumId
      ? `${window.location.origin}/albums/${song.albumId}`
      : window.location.origin
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copiado')
    } catch {
      toast.error('Não foi possível copiar o link')
    }
  }

  const handleRemoveFromPlaylist = async () => {
    if (!playlistId || playlistIndex == null) return
    try {
      await updatePlaylist(playlistId, { songIndexToRemove: playlistIndex })
      toast.success('Removida da playlist')
      onRemoved?.()
    } catch {
      toast.error('Erro ao remover da playlist')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem
          onClick={() => usePlayerStore.getState().playSong(song, [song])}
        >
          <Play className="size-4" />
          Tocar agora
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => usePlayerStore.getState().addToQueue([song])}>
          <ListPlus className="size-4" />
          Adicionar à fila
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => usePlayerStore.getState().playNext(song)}>
          <ArrowUpRight className="size-4" />
          Tocar a seguir
        </DropdownMenuItem>

        <DropdownMenuSub onOpenChange={(open) => open && loadPlaylists()}>
          <DropdownMenuSubTrigger>
            <Plus className="size-4" />
            Adicionar à playlist
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
            <DropdownMenuItem onClick={handleNewPlaylist}>
              <Plus className="size-4" />
              Nova playlist
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {playlists === null ? (
              <DropdownMenuItem disabled>Carregando...</DropdownMenuItem>
            ) : playlists.length === 0 ? (
              <DropdownMenuItem disabled>Nenhuma playlist</DropdownMenuItem>
            ) : (
              playlists.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => handleAddToPlaylist(p.id)}>
                  <Disc3 className="size-4" />
                  <span className="truncate">{p.name}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {song.albumId && (
          <DropdownMenuItem onClick={() => navigate(`/albums/${song.albumId}`)}>
            <Disc3 className="size-4" />
            Ir ao álbum
          </DropdownMenuItem>
        )}
        {song.artistId && (
          <DropdownMenuItem onClick={() => navigate(`/artists/${song.artistId}`)}>
            <User className="size-4" />
            Ir ao artista
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleStar}>
          <Heart className="size-4" />
          Favoritar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleUnstar}>
          <Heart className="size-4" />
          Remover favorito
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShare}>
          <Share2 className="size-4" />
          Compartilhar
        </DropdownMenuItem>

        {playlistId && playlistIndex != null && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleRemoveFromPlaylist}>
              Remover da playlist
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
