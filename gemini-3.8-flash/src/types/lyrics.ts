export type LyricWord = {
  text: string
  startMs: number
  endMs: number
}

export type LyricLine = {
  id?: string
  startMs: number
  endMs: number
  text: string
  words?: LyricWord[]
  romajiText?: string
  englishText?: string
  sectionLabel?: string
  kind?: "lyric" | "section"
}

export type ParsedLyrics = {
  lines: LyricLine[]
  synced: boolean
  autoTimed: boolean
  suggestedOffsetMs?: number
  providerId?: string
  rawText?: string
}

export type LyricsResult = {
  id: number | string
  providerId: "lrclib" | "custom" | "transcription" | "genius" | "fallback"
  plainLyrics?: string | null
  syncedLyrics?: string | null
  trackName?: string
  artistName?: string
  albumName?: string
  duration?: number
}

export type LyricsAlternate = {
  providerId: string
  trackName?: string
  artistName?: string
  lineCount: number
  synced: boolean
  lyricsResult: LyricsResult
}

export type DisplayMode = "native" | "romaji" | "english" | "both"
