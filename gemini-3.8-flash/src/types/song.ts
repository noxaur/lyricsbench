export type SongSearchHit = {
  videoId: string
  title: string
  artist: string
  track: string
  channel?: string
  thumbnail?: string
  durationSec?: number
  source: "youtube" | "youtube-music" | "itunes" | "lrclib" | "sample"
}

export type TrackMetadata = {
  videoId: string
  title: string
  artist: string
  track: string
  album?: string
  durationSec?: number
  thumbnail?: string
}

export type RecentSong = TrackMetadata & {
  playedAt: number
  customOffsetMs?: number
}
