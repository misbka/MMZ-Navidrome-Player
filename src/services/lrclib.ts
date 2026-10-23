/**
 * Serviço de letras LRCLib (https://lrclib.net)
 * Obs.: em navegadores o header User-Agent não pode ser setado manualmente;
 * quando rodando dentro do Electron (via IPC/bridge) garantimos o header correto.
 */

export interface LrcLine {
  time: number
  text: string
}

export interface LyricsResult {
  synced: LrcLine[] | null
  plain: string | null
}

export interface LrclibTrack {
  id: number
  trackName: string
  artistName: string
  albumName?: string
  duration?: number
  instrumental: boolean
  plainLyrics?: string | null
  syncedLyrics?: string | null
}

const USER_AGENT = 'NavidromeElectronPlayer/1.0'
const BASE_URL = 'https://lrclib.net/api'

/** Parseia texto LRC em linhas com tempo em segundos. */
export function parseLRC(syncedLyrics: string): LrcLine[] {
  // Aceita [mm:ss], [mm:ss.xx] e também [hh:mm:ss.xx] (comum em LRCs longos).
  const regex = /\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)/g
  const lines: LrcLine[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(syncedLyrics)) !== null) {
    const hours = match[1] ? parseInt(match[1], 10) : 0
    const minutes = parseInt(match[2]!, 10)
    const seconds = parseInt(match[3]!, 10)
    const fraction = match[4] ?? ''
    const text = (match[5] ?? '').trim()
    const ms = fraction ? parseInt(fraction.padEnd(3, '0'), 10) : 0
    const time = hours * 3600 + minutes * 60 + seconds + ms / 1000
    // ignora metadados [ar:] [ti:] etc (não casam com o regex) e timestamps sem texto
    if (!text && !fraction) continue
    lines.push({ time, text })
  }
  lines.sort((a, b) => a.time - b.time)
  return lines
}

function buildSearchParams(
  trackName: string,
  artistName: string,
  albumName?: string,
  duration?: number,
): URLSearchParams {
  const params = new URLSearchParams()
  params.set('track_name', trackName)
  params.set('artist_name', artistName)
  if (albumName) params.set('album_name', albumName)
  if (duration && duration > 0) params.set('duration', String(Math.round(duration)))
  return params
}

async function fetchJson<T>(url: string): Promise<T | null> {
  // Em navegadores o header User-Agent é controlado pelo próprio browser (e ignorado se setado).
  // No Electron o processo main pode reescrever o header via webRequest.
  const headers: Record<string, string> = { 'User-Agent': USER_AGENT }
  const res = await fetch(url, { headers })
  if (!res.ok) return null
  return (await res.json()) as T
}

function toLyricsResult(track: LrclibTrack | undefined | null): LyricsResult | null {
  if (!track) return null
  const synced = track.syncedLyrics ? parseLRC(track.syncedLyrics) : null
  const plain = track.plainLyrics ?? null
  if ((!synced || synced.length === 0) && !plain) return null
  return { synced: synced && synced.length > 0 ? synced : null, plain }
}

/** Busca letras no LRCLib. Retorna null se não encontrar. */
export async function searchLyrics(
  trackName: string,
  artistName: string,
  albumName?: string,
  duration?: number,
): Promise<LyricsResult | null> {
  try {
    const params = buildSearchParams(trackName, artistName, albumName, duration)
    const url = `${BASE_URL}/search?${params.toString()}`
    const results = await fetchJson<LrclibTrack[]>(url)
    if (!results || results.length === 0) return null
    // prefere resultado com letras sincronizadas
    const withSynced = results.find((r) => r.syncedLyrics)
    return toLyricsResult(withSynced ?? results[0])
  } catch {
    return null
  }
}

/** Busca exata (get-curiously) — usado como fallback. */
export async function getLyricsExact(
  trackName: string,
  artistName: string,
  albumName?: string,
  duration?: number,
): Promise<LyricsResult | null> {
  try {
    const params = buildSearchParams(trackName, artistName, albumName, duration)
    const url = `${BASE_URL}/get?${params.toString()}`
    const track = await fetchJson<LrclibTrack>(url)
    return toLyricsResult(track)
  } catch {
    return null
  }
}
