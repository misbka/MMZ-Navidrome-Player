import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { randomSalt } from '@/lib/utils'
import { md5 } from '@/lib/md5'
import { subsonicRequest } from '@/services/subsonic'

export interface NavidromeServer {
  id: string
  name: string
  url: string
  username: string
  password: string
}

interface AuthState {
  servers: NavidromeServer[]
  currentServerId: string | null
  isAuthenticated: boolean
  isLoggingIn: boolean

  addServer: (server: Omit<NavidromeServer, 'id'>) => NavidromeServer
  login: (url: string, username: string, password: string) => Promise<void>
  logout: () => void
  removeServer: (id: string) => void
  switchServer: (id: string) => Promise<void>
  getCurrentServer: () => NavidromeServer | null
}

function normalizeUrl(url: string): string {
  let u = url.trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(u)) u = `http://${u}`
  return u
}

function makeId(): string {
  return `srv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/** Gera os parâmetros de autenticação por token (Subsonic). */
export function buildAuthParams(password: string): { t: string; s: string } {
  const salt = randomSalt(12)
  return { t: md5(password + salt), s: salt }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      servers: [],
      currentServerId: null,
      isAuthenticated: false,
      isLoggingIn: false,

      getCurrentServer: () => {
        const { servers, currentServerId } = get()
        return servers.find((s) => s.id === currentServerId) ?? null
      },

      addServer: (server) => {
        const full: NavidromeServer = { ...server, id: makeId() }
        set((state) => {
          // substitui servidor existente com a mesma url+username
          const filtered = state.servers.filter(
            (s) => !(s.url === full.url && s.username === full.username),
          )
          return {
            servers: [...filtered, full],
            currentServerId: full.id,
            isAuthenticated: true,
          }
        })
        return full
      },

      login: async (url, username, password) => {
        const normalized = normalizeUrl(url)
        set({ isLoggingIn: true })
        try {
          await subsonicRequest(
            { url: normalized, username, password },
            'ping',
            {},
            { skipAuthStore: true },
          )
          get().addServer({ name: new URL(normalized).host, url: normalized, username, password })
          set({ isAuthenticated: true })
        } finally {
          set({ isLoggingIn: false })
        }
      },

      logout: () => {
        set({ currentServerId: null, isAuthenticated: false })
      },

      removeServer: (id) => {
        set((state) => {
          const servers = state.servers.filter((s) => s.id !== id)
          const currentServerId =
            state.currentServerId === id ? (servers[0]?.id ?? null) : state.currentServerId
          return { servers, currentServerId, isAuthenticated: !!currentServerId }
        })
      },

      switchServer: async (id) => {
        const server = get().servers.find((s) => s.id === id)
        if (!server) return
        await subsonicRequest(
          { url: server.url, username: server.username, password: server.password },
          'ping',
          {},
          { skipAuthStore: true },
        )
        set({ currentServerId: id, isAuthenticated: true })
      },
    }),
    {
      name: 'navidrome-auth',
      partialize: (state) => ({
        servers: state.servers,
        currentServerId: state.currentServerId,
        // mantém a sessão autenticada entre recarregamentos se havia servidor selecionado
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)

/** Trata erros 40 (credenciais inválidas) e 50 (sessão inválida). */
export function handleSubsonicError(error: unknown): boolean {
  const code = (error as { subsonicCode?: number })?.subsonicCode
  if (code === 40 || code === 50) {
    useAuthStore.getState().logout()
    return true
  }
  return false
}
