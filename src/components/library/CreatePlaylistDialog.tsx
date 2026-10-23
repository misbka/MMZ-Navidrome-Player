import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createPlaylist } from '@/services/subsonic'

export const OPEN_CREATE_PLAYLIST_EVENT = 'open-create-playlist'

export interface OpenCreatePlaylistDetail {
  songIds?: string[]
  onSuccess?: () => void
}

/**
 * Dialog global de criação de playlist.
 * Qualquer parte do app pode abrir com:
 * window.dispatchEvent(new CustomEvent('open-create-playlist', { detail: { songIds: [...] } }))
 */
export function CreatePlaylistDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [comment, setComment] = useState('')
  const [songIds, setSongIds] = useState<string[]>([])
  const [onSuccess, setOnSuccess] = useState<(() => void) | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OpenCreatePlaylistDetail>).detail ?? {}
      setSongIds(detail.songIds ?? [])
      setOnSuccess(() => detail.onSuccess ?? null)
      setName('')
      setComment('')
      setOpen(true)
    }
    window.addEventListener(OPEN_CREATE_PLAYLIST_EVENT, handler)
    return () => window.removeEventListener(OPEN_CREATE_PLAYLIST_EVENT, handler)
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Digite um nome para a playlist')
      return
    }
    setSaving(true)
    try {
      await createPlaylist(name.trim(), comment.trim(), songIds)
      toast.success('Playlist criada')
      onSuccess?.()
      setOpen(false)
    } catch {
      toast.error('Erro ao criar playlist')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova playlist</DialogTitle>
          <DialogDescription>
            {songIds.length > 0
              ? `A playlist será criada com ${songIds.length} ${songIds.length === 1 ? 'música' : 'músicas'}.`
              : 'Crie uma playlist no seu servidor Navidrome'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gpl-name">Nome</Label>
            <Input
              id="gpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Minha playlist"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gpl-comment">Descrição</Label>
            <Textarea
              id="gpl-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Descrição opcional"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
