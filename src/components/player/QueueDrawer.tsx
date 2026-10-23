import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ListMusic, Trash2, X } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { usePlayerStore } from '@/store/playerStore'
import { getCoverArtUrl } from '@/services/subsonic'
import { formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Song } from '@/types/subsonic'

interface QueueItemProps {
  song: Song
  index: number
  isCurrent: boolean
  onJump: (index: number) => void
  onRemove: (index: number) => void
}

function QueueItem({ song, index, isCurrent, onJump, onRemove }: QueueItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${song.id}-${index}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-3 rounded-md px-2 py-2 transition-colors',
        isCurrent ? 'bg-zinc-800' : 'hover:bg-zinc-900',
        isDragging && 'z-10 bg-zinc-800 shadow-lg',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
        aria-label="Reordenar"
      >
        <GripVertical className="size-4" />
      </button>

      <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onJump(index)}>
        {song.coverArt ? (
          <img
            src={getCoverArtUrl(song.coverArt, 80) ?? ''}
            alt=""
            className="size-10 shrink-0 rounded object-cover"
          />
        ) : (
          <div className="size-10 shrink-0 rounded bg-zinc-800" />
        )}
        <div className="min-w-0 flex-1">
          <div className={cn('truncate text-sm', isCurrent ? 'text-primary font-medium' : 'text-zinc-100')}>
            {song.title}
          </div>
          <div className="truncate text-xs text-zinc-500">{song.artist ?? 'Desconhecido'}</div>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-zinc-500">
          {formatDuration(song.duration)}
        </span>
      </button>

      <Button
        variant="ghost"
        size="icon-sm"
        className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        onClick={() => onRemove(index)}
        aria-label="Remover da fila"
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}

export function QueueDrawer() {
  const queue = usePlayerStore((s) => s.queue)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const queueOpen = usePlayerStore((s) => s.queueOpen)
  const toggleQueue = usePlayerStore((s) => s.toggleQueue)
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue)
  const clearQueue = usePlayerStore((s) => s.clearQueue)
  const reorderQueue = usePlayerStore((s) => s.reorderQueue)
  const jumpTo = usePlayerStore((s) => s.jumpTo)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    // ids são `${songId}-${index}` → extrai o índice original
    const from = Number(String(active.id).split('-').pop())
    const to = Number(String(over.id).split('-').pop())
    if (isNaN(from) || isNaN(to)) return
    reorderQueue(from, to)
  }

  // ids estáveis para o dnd (baseados no índice)
  const items = queue.map((song, index) => ({ ...song, id: `${song.id}-${index}` }))

  return (
    <Sheet open={queueOpen} onOpenChange={(open) => toggleQueue(open)}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-96">
        <SheetHeader className="flex flex-row items-center justify-between border-b border-zinc-800">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ListMusic className="size-5 text-primary" />
            Fila de reprodução
            {queue.length > 0 && (
              <span className="text-xs font-normal text-zinc-500">({queue.length})</span>
            )}
          </SheetTitle>
          {queue.length > 0 && (
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-red-400" onClick={clearQueue}>
              <Trash2 className="size-4" />
              Limpar fila
            </Button>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {queue.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-zinc-500">
              <ListMusic className="size-10 text-zinc-700" />
              <p className="text-sm">A fila está vazia</p>
              <p className="text-xs">Adicione músicas tocando um álbum ou playlist</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                {items.map((song, index) => (
                  <QueueItem
                    key={song.id}
                    song={song}
                    index={index}
                    isCurrent={index === currentIndex}
                    onJump={jumpTo}
                    onRemove={removeFromQueue}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
