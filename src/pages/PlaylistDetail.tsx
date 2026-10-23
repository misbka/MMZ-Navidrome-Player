import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ListMusic, Loader2, Pencil, Play, Shuffle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SongRow } from '@/components/library/SongRow'
import { usePlaylist } from '@/hooks/useNavidrome'
import { usePlayerStore } from '@/store/playerStore'
import { deletePlaylist, getCoverArtUrl, updatePlaylist } from '@/services/subsonic'
import { formatTotalDuration } from '@/lib/utils'
import type { Song } from '@/types/subsonic'

export function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: playlist, loading, refetch } = usePlaylist(id)

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const songs: Song[] = playlist?.entry ?? []
  const totalDuration = songs.reduce((acc, s) => acc + (s.duration ?? 0), 0)

  const handlePlay = (startIndex = 0) => {
    if (songs.length === 0) return
    usePlayerStore.getState().playPlaylist(songs, startIndex)
  }

  const handleShuffle = () => {
    if (songs.length === 0) return
    const store = usePlayerStore.getState()
    store.playPlaylist(songs, Math.floor(Math.random() * songs.length))
    if (!store.isShuffled) store.toggleShuffle()
  }

  const openEdit = () => {
    setName(playlist?.name ?? '')
    setComment(playlist?.comment ?? '')
    setEditOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playlist || !name.trim()) return
    setSaving(true)
    try {
      await updatePlaylist(playlist.id, { name: name.trim(), comment: comment.trim() })
      toast.success('Playlist atualizada')
      setEditOpen(false)
      refetch()
    } catch {
      toast.error('Erro ao atualizar playlist')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!playlist) return
    setDeleting(true)
    try {
      await deletePlaylist(playlist.id)
      toast.success('Playlist removida')
      navigate('/playlists')
    } catch {
      toast.error('Erro ao remover playlist')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 pb-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row">
          <Skeleton className="size-56 rounded-lg bg-zinc-900 sm:size-64" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-3 w-20 bg-zinc-900" />
            <Skeleton className="h-10 w-64 bg-zinc-900" />
            <Skeleton className="h-4 w-40 bg-zinc-900" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full bg-zinc-900" />
          ))}
        </div>
      </div>
    )
  }

  if (!playlist) {
    return <div className="py-20 text-center text-zinc-500">Playlist não encontrada</div>
  }

  const coverUrl = playlist.coverArt ? getCoverArtUrl(playlist.coverArt, 400) : null

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col items-start gap-6 sm:flex-row">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={playlist.name}
            className="size-52 shrink-0 rounded-lg object-cover shadow-2xl sm:size-64"
          />
        ) : (
          <div className="flex size-52 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 shadow-2xl sm:size-64">
            <ListMusic className="size-16 text-zinc-700" />
          </div>
        )}

        <div className="flex-1 space-y-3">
          <div className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            Playlist
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{playlist.name}</h1>
          {playlist.comment && <p className="text-sm text-zinc-400">{playlist.comment}</p>}
          <div className="flex flex-wrap items-center gap-1 text-sm text-zinc-400">
            {playlist.owner && <span>{playlist.owner}</span>}
            <span>
              · {songs.length} {songs.length === 1 ? 'música' : 'músicas'}
            </span>
            {totalDuration > 0 && <span>· {formatTotalDuration(totalDuration)}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              size="lg"
              className="rounded-full bg-primary font-semibold text-black hover:bg-primary/90"
              onClick={() => handlePlay(0)}
              disabled={songs.length === 0}
            >
              <Play className="size-5 fill-current" />
              Tocar
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="rounded-full"
              onClick={handleShuffle}
              disabled={songs.length === 0}
            >
              <Shuffle className="size-5" />
              Shuffle
            </Button>
            <Button variant="ghost" size="sm" onClick={openEdit}>
              <Pencil className="size-4" />
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:bg-red-950/40 hover:text-red-300"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              Remover
            </Button>
          </div>
        </div>
      </div>

      {/* Músicas */}
      {songs.length === 0 ? (
        <div className="py-16 text-center text-zinc-500">
          Esta playlist está vazia. Use o menu de contexto de qualquer música para adicionar.
        </div>
      ) : (
        <div className="space-y-0.5">
          {songs.map((song, index) => (
            <SongRow
              key={`${song.id}-${index}`}
              song={song}
              index={index}
              queue={songs}
              playlistId={playlist.id}
              playlistIndex={index}
              onRemoved={refetch}
            />
          ))}
        </div>
      )}

      {/* Dialog editar */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar playlist</DialogTitle>
            <DialogDescription>Altere o nome e a descrição</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-comment">Descrição</Label>
              <Input
                id="edit-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog deletar */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover playlist?</DialogTitle>
            <DialogDescription>
              A playlist "{playlist.name}" será removida permanentemente do servidor.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
