import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Menu, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [value, setValue] = useState(searchParams.get('q') ?? '')

  useEffect(() => {
    setValue(searchParams.get('q') ?? '')
  }, [searchParams])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/search?q=${encodeURIComponent(value.trim())}`)
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-zinc-800/70 bg-zinc-950/80 px-4 backdrop-blur-md md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </Button>

      <form onSubmit={submit} className="relative w-full max-w-md">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Artistas, álbuns, músicas..."
          className="h-10 rounded-full bg-zinc-900 pl-10"
          aria-label="Buscar"
        />
      </form>
    </header>
  )
}
