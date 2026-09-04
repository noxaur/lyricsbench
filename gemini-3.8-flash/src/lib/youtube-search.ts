import type { SongSearchHit } from "../types/song"
import { SAMPLE_SONGS } from "./sample-songs"

export function extractVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Direct 11-char YouTube ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed
  }

  // youtu.be/<id>
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
  if (shortMatch) return shortMatch[1]

  // youtube.com/watch?v=<id>
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
  if (watchMatch) return watchMatch[1]

  // youtube.com/embed/<id>
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/)
  if (embedMatch) return embedMatch[1]

  // music.youtube.com/watch?v=<id>
  const musicMatch = trimmed.match(/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/)
  if (musicMatch) return musicMatch[1]

  return null
}

export function isUrl(input: string): boolean {
  return /^https?:\/\//i.test(input.trim())
}

/**
 * Searches iTunes and LRCLIB in parallel for reliable, fast song metadata with cover art.
 * Never hangs indefinitely.
 */
export async function searchSongs(
  query: string,
  options: { signal?: AbortSignal; limit?: number } = {},
): Promise<SongSearchHit[]> {
  const q = query.trim()
  if (!q || q.length < 2) return []

  const limit = options.limit ?? 10
  const hits: SongSearchHit[] = []
  const seenKeys = new Set<string>()

  // 1. Check local sample songs first
  for (const sample of SAMPLE_SONGS) {
    if (
      sample.title.toLowerCase().includes(q.toLowerCase()) ||
      sample.artist.toLowerCase().includes(q.toLowerCase()) ||
      sample.track.toLowerCase().includes(q.toLowerCase())
    ) {
      hits.push({
        videoId: sample.videoId,
        title: sample.title,
        artist: sample.artist,
        track: sample.track,
        thumbnail: sample.thumbnail,
        durationSec: sample.durationSec,
        source: "sample",
      })
      seenKeys.add(`${sample.artist.toLowerCase()}:${sample.track.toLowerCase()}`)
    }
  }

  // 2. Direct Video ID match
  const extracted = extractVideoId(q)
  if (extracted) {
    hits.unshift({
      videoId: extracted,
      title: `YouTube Video (${extracted})`,
      artist: "YouTube",
      track: `Video ${extracted}`,
      thumbnail: `https://i.ytimg.com/vi/${extracted}/hqdefault.jpg`,
      source: "youtube",
    })
    return hits
  }

  // 3. Query iTunes API (Fast, CORS friendly, High-res artwork)
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=${limit}`
    const itunesPromise = fetch(itunesUrl, { signal: options.signal }).then(async (res) => {
      if (!res.ok) return []
      const data = (await res.json()) as {
        results?: Array<{
          trackName?: string
          artistName?: string
          artworkUrl100?: string
          trackTimeMillis?: number
        }>
      }
      return data.results || []
    }).catch(() => [])

    // 4. Query LRCLIB API in parallel
    const lrclibUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`
    const lrclibPromise = fetch(lrclibUrl, { signal: options.signal }).then(async (res) => {
      if (!res.ok) return []
      const data = (await res.json()) as Array<{
        id: number
        trackName?: string
        artistName?: string
        duration?: number
        syncedLyrics?: string
      }>
      return data || []
    }).catch(() => [])

    const [itunesResults, lrclibResults] = await Promise.all([itunesPromise, lrclibPromise])

    for (const item of itunesResults) {
      if (!item.trackName || !item.artistName) continue
      const key = `${item.artistName.toLowerCase()}:${item.trackName.toLowerCase()}`
      if (seenKeys.has(key)) continue
      seenKeys.add(key)

      hits.push({
        videoId: "", // Will search / play with query or matching sample
        title: `${item.artistName} - ${item.trackName}`,
        artist: item.artistName,
        track: item.trackName,
        thumbnail: item.artworkUrl100?.replace("100x100bb", "300x300bb"),
        durationSec: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : undefined,
        source: "itunes",
      })
      if (hits.length >= limit) break
    }

    for (const item of lrclibResults) {
      if (!item.trackName || !item.artistName) continue
      const key = `${item.artistName.toLowerCase()}:${item.trackName.toLowerCase()}`
      if (seenKeys.has(key)) continue
      seenKeys.add(key)

      hits.push({
        videoId: "",
        title: `${item.artistName} - ${item.trackName}`,
        artist: item.artistName,
        track: item.trackName,
        durationSec: item.duration ? Math.round(item.duration) : undefined,
        source: "lrclib",
      })
      if (hits.length >= limit) break
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") throw err
  }

  return hits
}

export async function fetchYouTubeOEmbed(videoId: string): Promise<{
  title: string
  authorName: string
  thumbnailUrl: string
} | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    const res = await fetch(url)
    if (res.ok) {
      const data = (await res.json()) as {
        title?: string
        author_name?: string
        thumbnail_url?: string
      }
      return {
        title: data.title || "",
        authorName: data.author_name || "",
        thumbnailUrl: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      }
    }
  } catch {
    // fallback
  }
  return null
}
