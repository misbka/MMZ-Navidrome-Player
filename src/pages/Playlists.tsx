import { useState } from 'react'
import { ListMusic, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PlaylistCard } from '@/components/library/PlaylistCard'
import { PageSkeleton } from '@/components/layout/Layout'
import { usePlaylists } from '@/hooks/useNavidrome'
import { createPlaylist } from '@/services/subsonic'

export function PlaylistsPage() {
  const { data: playlists, loading, refetch } = usePlaylists()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Digite um nome para a playlist')
      return
    }
    setCreating(true)
    try {
      await createPlaylist(name.trim(), description.trim())
      toast.success('Playlist criada')
      setOpen(false)
      setName('')
      setDescription('')
      refetch()
    } catch {
      toast.error('Erro ao criar playlist')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Playlists</h1>
          <p className="text-zinc-400">Suas playlists do Navidrome</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Nova playlist
        </Button>
      </div>

      {loading ? (
        <PageSkeleton count={8} />
      ) : (playlists?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-zinc-500">
          <ListMusic className="size-12 text-zinc-700" />
          <p>Você ainda não tem playlists</p>
          <Button variant="outline" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Criar primeira playlist
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {playlists!.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova playlist</DialogTitle>
            <DialogDescription>Crie uma playlist no seu servidor Navidrome</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playlist-name">Nome</Label>
              <Input
                id="playlist-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Minha playlist"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playlist-desc">Descrição</Label>
              <Textarea
                id="playlist-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição opcional"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="size-4 animate-spin" />}
                Criar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
