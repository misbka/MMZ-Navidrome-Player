import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Disc3,
  Home,
  Library,
  ListMusic,
  LogOut,
  MicVocal,
  Music2,
  Search,
  Server,
  Star,
  User,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { usePlayerStore } from '@/store/playerStore'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface SidebarProps {
  onNavigate?: () => void
  className?: string
}

const navItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/search', label: 'Buscar', icon: Search, end: false },
]

const libraryItems = [
  { to: '/albums', label: 'Álbuns', icon: Disc3 },
  { to: '/artists', label: 'Artistas', icon: User },
  { to: '/playlists', label: 'Playlists', icon: ListMusic },
  { to: '/favorites', label: 'Favoritos', icon: Star },
]

export function Sidebar({ onNavigate, className }: SidebarProps) {
  const servers = useAuthStore((s) => s.servers)
  const currentServerId = useAuthStore((s) => s.currentServerId)
  const logout = useAuthStore((s) => s.logout)
  const removeServer = useAuthStore((s) => s.removeServer)
  const switchServer = useAuthStore((s) => s.switchServer)
  const clearQueue = usePlayerStore((s) => s.clearQueue)
  const navigate = useNavigate()
  const [switching, setSwitching] = useState(false)

  const currentServer = servers.find((s) => s.id === currentServerId)

  const handleLogout = () => {
    clearQueue()
    logout()
    toast.success('Sessão encerrada')
    navigate('/login')
    onNavigate?.()
  }

  const handleSwitch = async (id: string) => {
    if (id === currentServerId) return
    setSwitching(true)
    try {
      await switchServer(id)
      clearQueue()
      toast.success('Servidor alterado')
      navigate('/')
    } catch {
      toast.error('Não foi possível conectar ao servidor')
    } finally {
      setSwitching(false)
    }
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
    )

  return (
    <div className={cn('flex h-full flex-col bg-zinc-950', className)}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5">
        <Disc3 className="size-7 text-primary" />
        <span className="text-lg font-bold tracking-tight">
          Navidrome <span className="text-primary">Player</span>
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={onNavigate}>
              <item.icon className="size-5" />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div>
          <div className="flex items-center gap-2 px-3 pb-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            <Library className="size-4" />
            Sua Biblioteca
          </div>
          <div className="space-y-1">
            {libraryItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass} onClick={onNavigate}>
                <item.icon className="size-5" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Rodapé: servidor + logout */}
      <div className="border-t border-zinc-800 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-zinc-900">
              <Server className="size-5 shrink-0 text-zinc-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-zinc-100">
                  {currentServer?.name ?? 'Sem servidor'}
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  {currentServer?.username ?? '—'}
                </span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-64">
            <DropdownMenuLabel>Servidores</DropdownMenuLabel>
            {servers.map((server) => (
              <DropdownMenuItem
                key={server.id}
                disabled={switching}
                onClick={() => handleSwitch(server.id)}
              >
                <Server className="size-4" />
                <span className="flex-1 truncate">{server.name}</span>
                {server.id === currentServerId && (
                  <span className="ml-2 size-2 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            ))}
            {servers.length > 1 && <DropdownMenuSeparator />}
            {servers
              .filter((s) => s.id !== currentServerId)
              .map((server) => (
                <DropdownMenuItem
                  key={`remove-${server.id}`}
                  variant="destructive"
                  onClick={() => removeServer(server.id)}
                >
                  <X className="size-4" />
                  Remover {server.name}
                </DropdownMenuItem>
              ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/login')}>
              <Music2 className="size-4" />
              Adicionar servidor
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="size-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          className="mt-1 w-full justify-start text-zinc-400 hover:bg-zinc-900 hover:text-red-400"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Logout
        </Button>
      </div>

      <div className="flex items-center gap-2 px-5 pb-4 text-[10px] text-zinc-600">
        <MicVocal className="size-3" />
        Subsonic API 1.16.1
      </div>
    </div>
  )
}
