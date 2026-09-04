export type LyricWord = {
  text: string
  startMs: number
  endMs: number
}

export type LyricLine = {
  startMs: number
  endMs: number
  text: string
  kind?: "lyric" | "section"
  sectionLabel?: string
  words?: LyricWord[]
}

export type ParsedLyrics = {
  lines: LyricLine[]
  synced: boolean
  autoTimed: boolean
}

export type LyricsHit = {
  id: number | string
  source: "lrclib" | "lyrics.ovh" | "pasted"
  trackName: string
  artistName: string
  durationSec: number
  instrumental: boolean
  plainLyrics: string | null
  syncedLyrics: string | null
}

export type LyricsResolveResult =
  | {
      status: "found"
      hit: LyricsHit
      alternates: LyricsHit[]
      confidence: number
    }
  | { status: "instrumental"; hit: LyricsHit }
  | { status: "empty"; message: string }

export type DisplayMode = "native" | "english" | "both"

export type SongSearchHit = {
  videoId: string
  title: string
  channel: string
  durationSec: number | null
  thumbnail: string
}

export type TrackMeta = {
  videoId: string
  title: string
  artist: string
  track: string
}

export type RecentSong = TrackMeta & { playedAt: number }

export type PlaylistTrack = TrackMeta & { addedAt: number }

export type Playlist = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  tracks: PlaylistTrack[]
}
