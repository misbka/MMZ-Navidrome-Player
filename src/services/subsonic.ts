import axios, { type AxiosInstance } from 'axios'
import { md5 } from '@/lib/md5'
import { randomSalt } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type {
  Album,
  AlbumID3,
  AlbumListType,
  Artist,
  ArtistID3,
  ArtistInfo2,
  Playlist,
  SearchResult3,
  Song,
  SubsonicResponse,
} from '@/types/subsonic'

const API_VERSION = '1.16.1'
const CLIENT_NAME = 'navidrome-electron'

export interface ServerCredentials {
  url: string
  username: string
  password: string
}

export class SubsonicApiError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.name = 'SubsonicApiError'
    this.code = code
  }
}

const instances = new Map<string, AxiosInstance>()

/** Serializa arrays como parâmetros repetidos (ex: songId=a&songId=b), como exige a API Subsonic. */
function serializeParams(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      for (const v of value) search.append(key, String(v))
    } else {
      search.append(key, String(value))
    }
  }
  return search.toString()
}

function getInstance(credentials: ServerCredentials): AxiosInstance {
  const key = credentials.url
  let inst = instances.get(key)
  if (!inst) {
    inst = axios.create({
      baseURL: `${credentials.url}/rest`,
      timeout: 20000,
      paramsSerializer: { serialize: serializeParams },
    })
    instances.set(key, inst)
  }
  return inst
}

function getCredentials(explicit?: ServerCredentials): ServerCredentials {
  if (explicit) return explicit
  const server = useAuthStore.getState().getCurrentServer()
  if (!server) throw new SubsonicApiError(0, 'Nenhum servidor configurado')
  return { url: server.url, username: server.username, password: server.password }
}

/** md5(password + salt) */
function makeAuthParams(password: string) {
  const salt = randomSalt(12)
  return { t: md5(password + salt), s: salt }
}

interface RequestOptions {
  skipAuthStore?: boolean
}

/** Faz uma requisição genérica a /rest/<method> e retorna o payload de "subsonic-response". */
export async function subsonicRequest<T = unknown>(
  explicitCredentials: ServerCredentials | undefined,
  method: string,
  params: Record<string, string | number | boolean | string[] | undefined> = {},
  options: RequestOptions = {},
): Promise<T> {
  const credentials = getCredentials(explicitCredentials)
  const { t, s } = makeAuthParams(credentials.password)
  const query: Record<string, string | number | boolean | string[] | undefined> = {
    u: credentials.username,
    t,
    s,
    v: API_VERSION,
    c: CLIENT_NAME,
    f: 'json',
    ...params,
  }

  try {
    const { data } = await getInstance(credentials).get<SubsonicResponse<T & { error?: { code: number; message: string } }>>(
      `/${method}`,
      { params: query },
    )
    const envelope = data?.['subsonic-response']
    if (envelope?.status === 'failed' && envelope.error) {
      const err = new SubsonicApiError(envelope.error.code, envelope.error.message)
      if (!options.skipAuthStore && (err.code === 40 || err.code === 50)) {
        useAuthStore.getState().logout()
      }
      throw err
    }
    return (envelope ?? {}) as T
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data?.['subsonic-response']?.error
      if (apiError) {
        const err = new SubsonicApiError(apiError.code, apiError.message)
        if (!options.skipAuthStore && (err.code === 40 || err.code === 50)) {
          useAuthStore.getState().logout()
        }
        throw err
      }
      throw new SubsonicApiError(0, `Falha de rede: ${error.message}`)
    }
    throw error
  }
}

function unwrap<T>(payload: unknown, key: string): T {
  const p = payload as Record<string, unknown>
  return (p?.[key] ?? null) as T
}

// ---------------------------------------------------------------------------
// Ping / auth
// ---------------------------------------------------------------------------

export async function ping(): Promise<{ status: string; version?: string }> {
  const res = await subsonicRequest<Record<string, unknown>>(undefined, 'ping')
  return {
    status: (res?.status as string) ?? 'ok',
    version: res?.version as string | undefined,
  }
}

// ---------------------------------------------------------------------------
// Álbuns / artistas
// ---------------------------------------------------------------------------

export async function getAlbumList2(
  type: AlbumListType = 'newest',
  size = 50,
  offset = 0,
  extra: { fromYear?: number; toYear?: number; genre?: string } = {},
): Promise<Album[]> {
  const res = await subsonicRequest<Record<string, unknown>>(undefined, 'getAlbumList2', {
    type,
    size,
    offset,
    ...extra,
  })
  return (unwrap<{ album?: Album[] }>(res, 'albumList2')?.album ?? []) as Album[]
}

export async function getAlbum(id: string): Promise<AlbumID3 | null> {
  const res = await subsonicRequest<Record<string, unknown>>(undefined, 'getAlbum', { id })
  return unwrap<AlbumID3>(res, 'album')
}

export async function getArtist(id: string): Promise<ArtistID3 | null> {
  const res = await subsonicRequest<Record<string, unknown>>(undefined, 'getArtist', { id })
  return unwrap<ArtistID3>(res, 'artist')
}

export async function getArtists(): Promise<Artist[]> {
  const res = await subsonicRequest<Record<string, unknown>>(undefined, 'getArtists')
  const index = unwrap<{ index?: Array<{ artist?: Artist[] }> }>(res, 'artists')?.index ?? []
  return index.flatMap((i) => i.artist ?? [])
}

export async function getArtistInfo2(id: string): Promise<ArtistInfo2 | null> {
  const res = await subsonicRequest<Record<string, unknown>>(undefined, 'getArtistInfo2', {
    id,
    count: true,
  })
  return unwrap<ArtistInfo2>(res, 'artistInfo2')
}

export async function search3(
  query: string,
  artistCount = 20,
  albumCount = 20,
  songCount = 30,
): Promise<SearchResult3> {
  const res = await subsonicRequest<Record<string, unknown>>(undefined, 'search3', {
    query,
    artistCount,
    albumCount,
    songCount,
  })
  const r = unwrap<SearchResult3>(res, 'searchResult3')
  return { artist: r?.artist ?? [], album: r?.album ?? [], song: r?.song ?? [] }
}

// ---------------------------------------------------------------------------
// Playlists
// ---------------------------------------------------------------------------

export async function getPlaylists(): Promise<Playlist[]> {
  const res = await subsonicRequest<Record<string, unknown>>(undefined, 'getPlaylists')
  return unwrap<{ playlist?: Playlist[] }>(res, 'playlists')?.playlist ?? []
}

export async function getPlaylist(id: string): Promise<Playlist | null> {
  const res = await subsonicRequest<Record<string, unknown>>(undefined, 'getPlaylist', { id })
  return unwrap<Playlist>(res, 'playlist')
}

export async function createPlaylist(
  name: string,
  comment?: string,
  songIds: string[] = [],
): Promise<void> {
  await subsonicRequest(undefined, 'createPlaylist', {
    name,
    comment,
    songId: songIds.length ? songIds : undefined,
  })
}

export async function updatePlaylist(
  playlistId: string,
  opts: {
    name?: string
    comment?: string
    songIdToAdd?: string
    songIndexToRemove?: number
  } = {},
): Promise<void> {
  await subsonicRequest(undefined, 'updatePlaylist', {
    playlistId,
    name: opts.name,
    comment: opts.comment,
    songIdToAdd: opts.songIdToAdd,
    songIndexToRemove: opts.songIndexToRemove,
  })
}

export async function deletePlaylist(id: string): Promise<void> {
  await subsonicRequest(undefined, 'deletePlaylist', { id })
}

// ---------------------------------------------------------------------------
// Star / favoritos
// ---------------------------------------------------------------------------

export async function star(id: string): Promise<void> {
  await subsonicRequest(undefined, 'star', { id })
}

export async function unstar(id: string): Promise<void> {
  await subsonicRequest(undefined, 'unstar', { id })
}

/** Star para álbuns/artistas (mesmo endpoint, ids distintos). */
export const starAlbum = star
export const unstarAlbum = unstar
export const starArtist = star
export const unstarArtist = unstar

// ---------------------------------------------------------------------------
// Scrobble / song
// ---------------------------------------------------------------------------

export async function scrobble(id: string, time?: number, submission = true): Promise<void> {
  await subsonicRequest(undefined, 'scrobble', { id, time, submission })
}

export async function getSong(id: string): Promise<Song | null> {
  const res = await subsonicRequest<Record<string, unknown>>(undefined, 'getSong', { id })
  return unwrap<Song>(res, 'song')
}

export async function getRandomSongs(size = 50): Promise<Song[]> {
  const res = await subsonicRequest<Record<string, unknown>>(undefined, 'getRandomSongs', { size })
  return unwrap<{ song?: Song[] }>(res, 'randomSongs')?.song ?? []
}

export async function getStarred2(): Promise<{ song?: Song[]; album?: Album[]; artist?: Artist[] }> {
  const res = await subsonicRequest<Record<string, unknown>>(undefined, 'getStarred2')
  return unwrap(res, 'starred2') ?? {}
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

/** Cache de credenciais por URL para manter as URLs de imagem/stream estáveis entre renders. */
const authCache = new Map<string, { t: string; s: string }>()

function getCachedAuthParams(url: string, password: string): { t: string; s: string } {
  let entry = authCache.get(url)
  if (!entry) {
    entry = makeAuthParams(password)
    authCache.set(url, entry)
  }
  return entry
}

/** Monta a URL completa de getCoverArt já autenticada. */
export function getCoverArtUrl(id: string | undefined, size = 300): string | null {
  if (!id) return null
  const server = useAuthStore.getState().getCurrentServer()
  if (!server) return null
  const { t, s } = getCachedAuthParams(server.url, server.password)
  const params = new URLSearchParams({
    id,
    size: String(size),
    u: server.username,
    t,
    s,
    v: API_VERSION,
    c: CLIENT_NAME,
    f: 'json',
  })
  return `${server.url}/rest/getCoverArt?${params.toString()}`
}

/** Monta a URL completa de stream (autenticada por token). */
export function getStreamUrl(id: string): string | null {
  if (!id) return null
  const server = useAuthStore.getState().getCurrentServer()
  if (!server) return null
  const { t, s } = getCachedAuthParams(server.url, server.password)
  const params = new URLSearchParams({
    id,
    u: server.username,
    t,
    s,
    v: API_VERSION,
    c: CLIENT_NAME,
  })
  return `${server.url}/rest/stream?${params.toString()}`
}
