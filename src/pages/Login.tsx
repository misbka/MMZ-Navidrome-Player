import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Disc3, Loader2, Lock, Server, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/store/authStore'

export function LoginPage() {
  const navigate = useNavigate()
  const servers = useAuthStore((s) => s.servers)
  const currentServerId = useAuthStore((s) => s.currentServerId)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const login = useAuthStore((s) => s.login)
  const isLoggingIn = useAuthStore((s) => s.isLoggingIn)

  const [url, setUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // já autenticado e com servidor → home
  if (isAuthenticated && currentServerId) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim() || !username.trim()) {
      toast.error('Preencha a URL e o usuário')
      return
    }
    try {
      await login(url.trim(), username.trim(), password)
      toast.success('Conectado com sucesso')
      navigate('/', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao conectar'
      toast.error(message)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Disc3 className="size-12 text-primary" />
          <h1 className="text-2xl font-bold">
            Navidrome <span className="text-primary">Player</span>
          </h1>
          <p className="text-sm text-zinc-400">Conecte-se ao seu servidor Subsonic</p>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader>
            <CardTitle className="text-base">Entrar</CardTitle>
            <CardDescription>
              Use as credenciais da sua conta Navidrome / Subsonic
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL do servidor</Label>
                <div className="relative">
                  <Server className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="url"
                    placeholder="https://musica.exemplo.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="pl-9"
                    autoComplete="url"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <div className="relative">
                  <User className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="username"
                    placeholder="seu usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn && <Loader2 className="size-4 animate-spin" />}
                {isLoggingIn ? 'Conectando...' : 'Conectar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {servers.length > 0 && (
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader>
              <CardTitle className="text-base">Servidores salvos</CardTitle>
              <CardDescription>Entre rapidamente em um servidor já cadastrado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {servers.map((server, i) => (
                <div key={server.id} className="space-y-2">
                  {i > 0 && <Separator className="bg-zinc-800" />}
                  <Button
                    variant="outline"
                    className="w-full justify-start border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
                    onClick={() => {
                      const switchServer = useAuthStore.getState().switchServer
                      switchServer(server.id)
                        .then(() => navigate('/', { replace: true }))
                        .catch(() => toast.error('Não foi possível conectar'))
                    }}
                  >
                    <Server className="size-4 text-primary" />
                    <span className="flex-1 truncate text-left">{server.name}</span>
                    <span className="text-xs text-zinc-500">{server.username}</span>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-zinc-600">
          Autenticação por token (API Subsonic 1.16.1) · Suas credenciais ficam apenas neste
          dispositivo
        </p>
      </div>
    </div>
  )
}
