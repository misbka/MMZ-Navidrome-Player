// Tipos da API Subsonic (subset usado pelo player)
// https://www.subsonic.org/pages/api.jsp

export interface SubsonicError {
  code: number
  message: string
}

export interface SubsonicResponse<T = unknown> {
  'subsonic-response'?: T & {
    status?: 'ok' | 'failed'
    version?: string
    error?: SubsonicError
  }
  error?: SubsonicError
}

export interface Child {
  id: string
  parent?: string
  isDir?: boolean
  title?: string
  album?: string
  artist?: string
  track?: number
  year?: number
  coverArt?: string
  size?: number
  contentType?: string
  suffix?: string
  duration?: number
  bitRate?: number
  path?: string
  isVideo?: boolean
  userRating?: number
  averageRating?: number
  playCount?: number
  discNumber?: number
  created?: string
  star?: string
  albumId?: string
  artistId?: string
  type?: string
  bookmarkPosition?: number
  originalHeight?: number
  originalWidth?: number
}

export type Song = Child & { id: string; title: string }
export type Album = Child & { id: string; name?: string; songCount?: number; song?: Song[] }
export interface Artist extends Child {
  id: string
  name: string
  albumCount?: number
  coverArt?: string
}

export interface ArtistInfo2 {
  biography?: string
  smallImageUrl?: string
  mediumImageUrl?: string
  largeImageUrl?: string
  externalArtistUrl?: string
  musicBrainzId?: string
  lastFmId?: string
}

export interface ArtistID3 {
  id: string
  name: string
  coverArt?: string
  artistImageUrl?: string
  albumCount?: number
  starred?: string
  userRating?: number
  averageRating?: number
  genre?: string
}

export interface AlbumID3 {
  id: string
  name: string
  artist?: string
  artistId?: string
  coverArt?: string
  songCount?: number
  duration?: number
  playCount?: number
  created?: string
  year?: number
  genre?: string
  starred?: string
  song?: Song[]
}

export interface Playlist {
  id: string
  name: string
  comment?: string
  owner?: string
  public?: boolean
  songCount?: number
  duration?: number
  created?: string
  changed?: string
  coverArt?: string
  entry?: Song[]
}

export interface SearchResult3 {
  artist?: Artist[]
  album?: Album[]
  song?: Song[]
}

export type AlbumListType =
  | 'newest'
  | 'frequent'
  | 'recent'
  | 'starred'
  | 'random'
  | 'alphabeticalByName'
  | 'byYear'
