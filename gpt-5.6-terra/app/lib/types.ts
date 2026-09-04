export type LyricWord = {
  text: string
  startMs: number
  endMs?: number
}

export type LyricLine = {
  id: string
  startMs: number
  endMs: number
  text: string
  words?: LyricWord[]
}

export type ParsedLyrics = {
  lines: LyricLine[]
  synced: boolean
  autoTimed: boolean
  title?: string
  artist?: string
  offsetMs: number
}

export type TrackMetadata = {
  title: string
  artist: string
  durationSec?: number
  source?: string
}

export type LyricsPayload = {
  status: "found" | "empty" | "instrumental"
  source?: string
  syncedLyrics?: string | null
  plainLyrics?: string | null
  trackName?: string
  artistName?: string
  message?: string
}

export type SearchHit = {
  videoId: string
  title: string
  channel: string
  durationSec: number | null
  thumbnail: string
}
