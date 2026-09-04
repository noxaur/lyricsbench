import type { LyricsAlternate, LyricsResult, ParsedLyrics } from "../types/lyrics"
import { parseLrc, parsePlainLyrics } from "./lrc-parser"

const LRCLIB_BASE = "https://lrclib.net/api"
const REJECTED_LYRICS_KEY = "umbra-rejected-lyrics"

type LrclibItem = {
  id: number
  trackName: string
  artistName: string
  albumName?: string
  duration: number
  instrumental?: boolean
  plainLyrics?: string | null
  syncedLyrics?: string | null
}

export function cleanTrackTitle(title: string): { track: string; artist: string } {
  let clean = title
    // Remove (Official Video), [MV], (Audio), etc.
    .replace(/\s*[\(\[](?:Official\s*(?:Music\s*)?(?:Video|Audio|HD|4K|Visualizer|Lyric Video|Remastered|Performance)?|MV|Audio|Visualizer|Lyric Video|Lyrics)[\)\]]/gi, "")
    .replace(/\s*[\(\[]ft\.?[^\)\]]*[\)\]]/gi, "")
    .replace(/\s*[\(\[]feat\.?[^\)\]]*[\)\]]/gi, "")
    .replace(/\s*\|.*$/, "")
    .trim()

  // Check for "Artist - Title" pattern
  if (clean.includes(" - ")) {
    const parts = clean.split(" - ")
    return {
      artist: parts[0].trim(),
      track: parts.slice(1).join(" - ").trim(),
    }
  }

  // Check for "Artist: Title"
  if (clean.includes(": ")) {
    const parts = clean.split(": ")
    return {
      artist: parts[0].trim(),
      track: parts.slice(1).join(": ").trim(),
    }
  }

  return { artist: "", track: clean }
}

export function getRejectedLyrics(): Set<string> {
  try {
    const raw = localStorage.getItem(REJECTED_LYRICS_KEY)
    if (raw) {
      const arr = JSON.parse(raw) as string[]
      return new Set(arr)
    }
  } catch {
    // ignore
  }
  return new Set()
}

export function addRejectedLyric(identifier: string): void {
  try {
    const rejected = getRejectedLyrics()
    rejected.add(identifier)
    localStorage.setItem(REJECTED_LYRICS_KEY, JSON.stringify([...rejected]))
  } catch {
    // ignore
  }
}

export async function fetchLyricsFromLrclib(params: {
  track: string
  artist: string
  durationSec?: number
  signal?: AbortSignal
}): Promise<{ primary: LyricsResult | null; alternates: LyricsAlternate[] }> {
  const rejected = getRejectedLyrics()
  const { track, artist, durationSec, signal } = params

  const queries: Array<{ track_name?: string; artist_name?: string; q?: string }> = []

  if (track && artist) {
    queries.push({ track_name: track, artist_name: artist })
  }
  if (track) {
    queries.push({ q: `${artist} ${track}`.trim() })
    queries.push({ q: track })
  }

  const itemsMap = new Map<number, LrclibItem>()

  for (const q of queries) {
    try {
      const searchParams = new URLSearchParams()
      if (q.track_name) searchParams.set("track_name", q.track_name)
      if (q.artist_name) searchParams.set("artist_name", q.artist_name)
      if (q.q) searchParams.set("q", q.q)

      const res = await fetch(`${LRCLIB_BASE}/search?${searchParams.toString()}`, { signal })
      if (res.ok) {
        const results = (await res.json()) as LrclibItem[]
        for (const item of results) {
          if (item.plainLyrics || item.syncedLyrics) {
            itemsMap.set(item.id, item)
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") throw err
      // continue to next query
    }

    if (itemsMap.size >= 5) break
  }

  const validItems = [...itemsMap.values()].filter(
    (item) => !rejected.has(`lrclib-${item.id}`),
  )

  // Sort best candidate: prefer synced lyrics, then closest duration
  validItems.sort((a, b) => {
    if (a.syncedLyrics && !b.syncedLyrics) return -1
    if (!a.syncedLyrics && b.syncedLyrics) return 1

    if (durationSec && a.duration && b.duration) {
      const diffA = Math.abs(a.duration - durationSec)
      const diffB = Math.abs(b.duration - durationSec)
      return diffA - diffB
    }

    return 0
  })

  if (validItems.length === 0) {
    return { primary: null, alternates: [] }
  }

  const best = validItems[0]
  const primary: LyricsResult = {
    id: best.id,
    providerId: "lrclib",
    plainLyrics: best.plainLyrics,
    syncedLyrics: best.syncedLyrics,
    trackName: best.trackName,
    artistName: best.artistName,
    albumName: best.albumName,
    duration: best.duration,
  }

  const alternates: LyricsAlternate[] = validItems.map((item) => {
    const raw = item.syncedLyrics || item.plainLyrics || ""
    const lineCount = raw.split(/\r?\n/).filter(Boolean).length
    return {
      providerId: "lrclib",
      trackName: item.trackName,
      artistName: item.artistName,
      lineCount,
      synced: Boolean(item.syncedLyrics),
      lyricsResult: {
        id: item.id,
        providerId: "lrclib",
        plainLyrics: item.plainLyrics,
        syncedLyrics: item.syncedLyrics,
        trackName: item.trackName,
        artistName: item.artistName,
        albumName: item.albumName,
        duration: item.duration,
      },
    }
  })

  return { primary, alternates }
}

export function parseLyricsResult(
  result: LyricsResult | null,
  durationSec = 0,
  manualOffsetMs = 0,
): ParsedLyrics {
  if (!result) {
    return { lines: [], synced: false, autoTimed: false }
  }

  if (result.syncedLyrics && result.syncedLyrics.trim()) {
    const parsed = parseLrc(result.syncedLyrics, durationSec, manualOffsetMs)
    return { ...parsed, providerId: result.providerId }
  }

  if (result.plainLyrics && result.plainLyrics.trim()) {
    const parsed = parsePlainLyrics(result.plainLyrics, durationSec)
    return { ...parsed, providerId: result.providerId }
  }

  return { lines: [], synced: false, autoTimed: false }
}
