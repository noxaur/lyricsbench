// Novel: direct LRCLIB fetch, no Rust gateway, no 10-provider proxy chain.
// Simple, cache-friendly, and honest about failures.
// Old had 16 providers, aggregated scraper, chartlyrics etc with high flake rate.
// This version tries LRCLIB get -> search -> plain fallback, with LRU memory + localStorage cache.

import type { ParsedLyrics } from "./lrc"
import { parseLrc, parsePlain } from "./lrc"

export type LrclibTrack = {
  id: number
  trackName: string
  artistName: string
  duration: number
  plainLyrics: string | null
  syncedLyrics: string | null
  instrumental: boolean
}

type CacheEntry = { at: number; data: LrclibTrack[] }

const MEM_CACHE = new Map<string, CacheEntry>()
const LS_KEY = "umbra-lrclib-cache-v2"
const TTL_MS = 1000 * 60 * 60 * 24 // 24h

function cacheKey(artist: string, track: string, duration: number): string {
  return `${artist.toLowerCase()}|${track.toLowerCase()}|${Math.round(duration / 5) * 5}`
}

function readLS(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}
function writeLS(map: Record<string, CacheEntry>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(map)) } catch {}
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(url, { signal, headers: { "Accept": "application/json" } })
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json() as Promise<T>
}

export async function searchLrclib(artist: string, track: string, signal?: AbortSignal): Promise<LrclibTrack[]> {
  const key = cacheKey(artist, track, 0)
  const mem = MEM_CACHE.get(key)
  if (mem && Date.now() - mem.at < TTL_MS) return mem.data
  const ls = readLS()
  if (ls[key] && Date.now() - ls[key].at < TTL_MS) {
    MEM_CACHE.set(key, ls[key])
    return ls[key].data
  }

  const params = new URLSearchParams({ track_name: track, artist_name: artist })
  // try get with strict match first
  try {
    const exact = await fetchJson<LrclibTrack>(`https://lrclib.net/api/get?${params.toString()}`, signal)
    if (exact && (exact.plainLyrics || exact.syncedLyrics)) {
      const arr = [exact]
      const entry = { at: Date.now(), data: arr }
      MEM_CACHE.set(key, entry)
      writeLS({ ...readLS(), [key]: entry })
      return arr
    }
  } catch { /* fallback to search */ }

  try {
    const results = await fetchJson<LrclibTrack[]>(`https://lrclib.net/api/search?${params.toString()}`, signal)
    const filtered = (results || []).slice(0, 8)
    const entry = { at: Date.now(), data: filtered }
    MEM_CACHE.set(key, entry)
    writeLS({ ...readLS(), [key]: entry })
    return filtered
  } catch {
    return []
  }
}

export type LyricsOutcome = "found" | "not_found" | "instrumental" | "error"

export async function resolveLyrics(opts: {
  artist: string
  track: string
  durationSec: number
  signal?: AbortSignal
}): Promise<{ outcome: LyricsOutcome; parsed: ParsedLyrics | null; source: LrclibTrack | null; message: string }> {
  const { artist, track, durationSec, signal } = opts
  if (!track.trim()) return { outcome: "error", parsed: null, source: null, message: "Missing track name" }

  const results = await searchLrclib(artist, track, signal)
  // rank by duration proximity and having synced lyrics
  const ranked = [...results].sort((a, b) => {
    const aSynced = a.syncedLyrics ? 0 : 1
    const bSynced = b.syncedLyrics ? 0 : 1
    if (aSynced !== bSynced) return aSynced - bSynced
    const ad = Math.abs((a.duration ?? 0) - durationSec)
    const bd = Math.abs((b.duration ?? 0) - durationSec)
    return ad - bd
  })

  for (const tr of ranked) {
    if (tr.instrumental) return { outcome: "instrumental", parsed: null, source: tr, message: "Instrumental track" }
    const rawSynced = tr.syncedLyrics?.trim()
    const rawPlain = tr.plainLyrics?.trim()
    if (rawSynced) {
      const p = parseLrc(rawSynced, durationSec * 1000)
      if (p && p.lines.length > 0) return { outcome: "found", parsed: p, source: tr, message: "Synced lyrics" }
    }
    if (rawPlain) {
      const p = parsePlain(rawPlain, durationSec * 1000)
      if (p.lines.length > 0) return { outcome: "found", parsed: { ...p, autoTimed: true }, source: tr, message: "Plain lyrics — estimated timing" }
    }
  }

  if (ranked.length === 0) return { outcome: "not_found", parsed: null, source: null, message: "No lyrics found on LRCLIB" }
  return { outcome: "not_found", parsed: null, source: null, message: "No usable lyrics" }
}
