import type { LoaderFunctionArgs } from "react-router"
import type { LyricsPayload } from "~/lib/types"

const LRCLIB = "https://lrclib.net/api"

type LrcLibRecord = {
  id?: number
  trackName?: string
  artistName?: string
  albumName?: string
  duration?: number
  instrumental?: boolean
  plainLyrics?: string | null
  syncedLyrics?: string | null
}

function clean(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function tokenOverlap(left: string, right: string) {
  const a = new Set(clean(left).split(" ").filter(Boolean))
  const b = new Set(clean(right).split(" ").filter(Boolean))
  if (!a.size || !b.size) return 0
  let shared = 0
  for (const token of a) if (b.has(token)) shared++
  return shared / Math.max(a.size, b.size)
}

function score(record: LrcLibRecord, title: string, artist: string) {
  const titleScore = tokenOverlap(record.trackName ?? "", title)
  const artistScore = artist ? tokenOverlap(record.artistName ?? "", artist) : 0.45
  const timingBonus = record.syncedLyrics?.trim() ? 0.12 : 0
  const textBonus = record.plainLyrics?.trim() || record.syncedLyrics?.trim() ? 0.08 : -1
  return titleScore * 0.64 + artistScore * 0.24 + timingBonus + textBonus
}

function textLooksUsable(value: string | null | undefined) {
  if (!value) return false
  const withoutTags = value.replace(/\[[^\]]+\]|<[^>]+>/g, "").trim()
  return withoutTags.length >= 24 && withoutTags.split("\n").filter(Boolean).length >= 2
}

function toPayload(record: LrcLibRecord): LyricsPayload {
  return {
    status: record.instrumental && !record.plainLyrics && !record.syncedLyrics ? "instrumental" : "found",
    source: "LRCLIB",
    syncedLyrics: textLooksUsable(record.syncedLyrics) ? record.syncedLyrics : null,
    plainLyrics: textLooksUsable(record.plainLyrics) ? record.plainLyrics : null,
    trackName: record.trackName,
    artistName: record.artistName,
  }
}

async function getJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 9_000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Umbra-Lyrics/3.0 (lyrics player; contact: github.com/noxaur/umbra-lyrics)",
      },
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const title = (url.searchParams.get("title") ?? "").trim().slice(0, 180)
  const artist = (url.searchParams.get("artist") ?? "").trim().slice(0, 160)
  if (title.length < 2) return Response.json({ status: "empty", message: "A track name is needed" } satisfies LyricsPayload)

  try {
    const candidates: LrcLibRecord[] = []
    if (artist) {
      const exactParams = new URLSearchParams({ track_name: title, artist_name: artist })
      const exact = await getJson<LrcLibRecord>(`${LRCLIB}/get?${exactParams}`)
      if (exact) candidates.push(exact)
    }
    const q = [artist, title].filter(Boolean).join(" ")
    const matches = await getJson<LrcLibRecord[]>(`${LRCLIB}/search?${new URLSearchParams({ q })}`)
    if (Array.isArray(matches)) candidates.push(...matches)

    const unique = [...new Map(candidates.filter((candidate) => candidate.id).map((candidate) => [candidate.id, candidate])).values()]
    const useful = unique.filter((candidate) => candidate.instrumental || textLooksUsable(candidate.syncedLyrics) || textLooksUsable(candidate.plainLyrics))
    useful.sort((left, right) => score(right, title, artist) - score(left, title, artist))
    const best = useful[0]
    if (!best) {
      return Response.json({ status: "empty", message: "No lyric sheet was found in LRCLIB" } satisfies LyricsPayload)
    }
    return Response.json(toPayload(best), {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
    })
  } catch {
    return Response.json({ status: "empty", message: "The lyric service is unreachable right now" } satisfies LyricsPayload, { status: 502 })
  }
}
