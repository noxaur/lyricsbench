import { pickBestCandidate, isStrongMatch, scoreCandidate } from "./match"
import { simplifyTrackName, stripDecorativeTitle } from "./titles"
import type { LyricsHit, LyricsResolveResult } from "./types"

const LRCLIB = "https://lrclib.net/api"
const CLIENT = "Umbra/2.0 (https://github.com/noxaur/umbra-lyrics)"

type LrcLibRow = {
  id: number
  trackName?: string
  artistName?: string
  duration?: number
  instrumental?: boolean
  plainLyrics?: string | null
  syncedLyrics?: string | null
}

function headers(): HeadersInit {
  return { "User-Agent": CLIENT, Accept: "application/json" }
}

function lyricsText(hit: LyricsHit): string {
  const raw = hit.syncedLyrics?.trim() || hit.plainLyrics?.trim() || ""
  return raw.replace(/\[[\d:.]+\]/g, "").replace(/<\d{2}:\d{2}\.\d{2,3}>/g, "").trim()
}

function isJunk(hit: LyricsHit): boolean {
  const text = lyricsText(hit)
  if (!text) return true
  const lines = text.split("\n").filter((line) => line.trim())
  if (lines.length < 4 || text.length < 80) return true
  if (/\brickroll/i.test(text)) return true
  return false
}

function toHit(row: LrcLibRow, source: LyricsHit["source"] = "lrclib"): LyricsHit {
  return {
    id: row.id,
    source,
    trackName: row.trackName ?? "",
    artistName: row.artistName ?? "",
    durationSec: row.duration ?? 0,
    instrumental: Boolean(row.instrumental),
    plainLyrics: row.plainLyrics ?? null,
    syncedLyrics: row.syncedLyrics ?? null,
  }
}

async function lrclibGet(artist: string, track: string, durationSec: number): Promise<LyricsHit | null> {
  const q = new URLSearchParams({
    artist_name: artist,
    track_name: track,
  })
  if (durationSec > 0) q.set("duration", String(Math.round(durationSec)))
  const res = await fetch(`${LRCLIB}/get?${q}`, { headers: headers() })
  if (!res.ok) return null
  const row = (await res.json()) as LrcLibRow
  if (!row?.id) return null
  return toHit(row)
}

async function lrclibSearch(params: URLSearchParams): Promise<LyricsHit[]> {
  const res = await fetch(`${LRCLIB}/search?${params}`, { headers: headers() })
  if (!res.ok) return []
  const rows = (await res.json()) as LrcLibRow[]
  if (!Array.isArray(rows)) return []
  return rows.map((row) => toHit(row))
}

async function lyricsOvh(artist: string, track: string): Promise<LyricsHit | null> {
  const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(track)}`
  const res = await fetch(url, { headers: { Accept: "application/json" } })
  if (!res.ok) return null
  const data = (await res.json()) as { lyrics?: string }
  if (!data.lyrics?.trim()) return null
  return {
    id: `ovh:${artist}:${track}`,
    source: "lyrics.ovh",
    trackName: track,
    artistName: artist,
    durationSec: 0,
    instrumental: false,
    plainLyrics: data.lyrics,
    syncedLyrics: null,
  }
}

function searchVariants(artist: string, track: string): URLSearchParams[] {
  const stripped = stripDecorativeTitle(track)
  const simple = simplifyTrackName(track)
  const queries: Array<Record<string, string>> = [
    { track_name: track, artist_name: artist },
    { track_name: stripped, artist_name: artist },
    { track_name: simple, artist_name: artist },
    { q: `${artist} ${track}` },
    { q: `${artist} ${simple}` },
  ]
  const seen = new Set<string>()
  const out: URLSearchParams[] = []
  for (const query of queries) {
    if (!query.track_name && !query.q) continue
    const params = new URLSearchParams(query)
    const key = params.toString()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(params)
  }
  return out
}

export async function resolveLyrics(input: {
  artist: string
  track: string
  durationSec: number
  extraCandidates?: Array<{ artist: string; track: string }>
}): Promise<LyricsResolveResult> {
  const artist = input.artist.trim()
  const track = input.track.trim()
  if (!track) return { status: "empty", message: "Need a track name to look up lyrics" }

  const pool = new Map<string, LyricsHit>()
  const add = (hit: LyricsHit | null) => {
    if (!hit || isJunk(hit)) return
    pool.set(String(hit.id), hit)
  }

  const exact = await lrclibGet(artist, track, input.durationSec).catch(() => null)
  if (exact && !isJunk(exact) && isStrongMatch(exact, input.durationSec, artist, track)) {
    return { status: "found", hit: exact, alternates: [], confidence: 0 }
  }
  add(exact)

  const names = [{ artist, track }, ...(input.extraCandidates ?? [])]
  const searches: Promise<LyricsHit[]>[] = []
  for (const name of names) {
    for (const params of searchVariants(name.artist, name.track)) {
      searches.push(lrclibSearch(params).catch(() => []))
    }
  }

  const settled = await Promise.all(searches)
  for (const batch of settled) for (const hit of batch) add(hit)

  const all = [...pool.values()]
  const best = pickBestCandidate(all, input.durationSec, artist, track)

  if (best?.instrumental && !best.syncedLyrics && !best.plainLyrics) {
    return { status: "instrumental", hit: best }
  }

  if (best && (best.syncedLyrics?.trim() || best.plainLyrics?.trim())) {
    const alternates = all
      .filter((hit) => String(hit.id) !== String(best.id) && (hit.syncedLyrics || hit.plainLyrics))
      .sort((a, b) => scoreCandidate(a, input.durationSec, artist, track) - scoreCandidate(b, input.durationSec, artist, track))
      .slice(0, 5)
    return {
      status: "found",
      hit: best,
      alternates,
      confidence: scoreCandidate(best, input.durationSec, artist, track),
    }
  }

  const ovh = await lyricsOvh(artist, track).catch(() => null)
  if (ovh) {
    return { status: "found", hit: ovh, alternates: [], confidence: 60 }
  }

  return { status: "empty", message: "No lyrics in LRCLIB for this track" }
}
