import type { LyricsHit, LyricsResolveResult, SongSearchHit } from "./types"

export async function fetchOembed(videoId: string, signal?: AbortSignal) {
  const res = await fetch(`/api/oembed?videoId=${encodeURIComponent(videoId)}`, { signal })
  if (!res.ok) return null
  return (await res.json()) as { title: string; author: string }
}

export async function searchSongs(query: string, signal?: AbortSignal): Promise<SongSearchHit[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal })
  if (!res.ok) throw new Error("Search failed")
  const data = (await res.json()) as { hits: SongSearchHit[] }
  return data.hits ?? []
}

export async function resolveSpotify(
  input: string,
  signal?: AbortSignal,
): Promise<{ videoId: string; artist: string; track: string } | { error: string }> {
  const res = await fetch(`/api/spotify?q=${encodeURIComponent(input)}`, { signal })
  const data = (await res.json()) as { videoId?: string; artist?: string; track?: string; error?: string }
  if (!res.ok || !data.videoId) return { error: data.error || "Couldn't match this Spotify track on YouTube" }
  return { videoId: data.videoId, artist: data.artist ?? "", track: data.track ?? "" }
}

export async function resolveLyricsRequest(
  params: { artist: string; track: string; durationSec: number; title?: string },
  signal?: AbortSignal,
): Promise<LyricsResolveResult> {
  const q = new URLSearchParams({
    artist: params.artist,
    track: params.track,
    duration: String(Math.round(params.durationSec) || 0),
  })
  if (params.title) q.set("title", params.title)
  const res = await fetch(`/api/lyrics?${q}`, { signal })
  if (!res.ok) throw new Error("Lyrics lookup failed")
  return (await res.json()) as LyricsResolveResult
}

export async function translateLines(lines: string[], sourceLang: string, signal?: AbortSignal): Promise<string[]> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lines, sourceLang }),
    signal,
  })
  if (!res.ok) return []
  const data = (await res.json()) as { lines?: string[] }
  return data.lines ?? []
}

export function lyricsBody(hit: LyricsHit): string {
  return hit.syncedLyrics?.trim() || hit.plainLyrics?.trim() || ""
}
