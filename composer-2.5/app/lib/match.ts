import { stripDecorativeTitle } from "./titles"

export const DURATION_TOLERANCE_SEC = 12

export type Matchable = {
  trackName: string
  artistName: string
  duration?: number
  instrumental?: boolean
  plainLyrics?: string | null
  syncedLyrics?: string | null
}

export function normalizeForMatch(value: string): string {
  return stripDecorativeTitle(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function tokenJaccard(a: string, b: string): number {
  const aTokens = new Set(normalizeForMatch(a).split(" ").filter((t) => t.length > 1))
  const bTokens = new Set(normalizeForMatch(b).split(" ").filter((t) => t.length > 1))
  if (aTokens.size === 0 || bTokens.size === 0) return 0
  let overlap = 0
  for (const token of aTokens) if (bTokens.has(token)) overlap += 1
  return overlap / (aTokens.size + bTokens.size - overlap)
}

export function nameScore(found: string, wanted: string): number {
  if (!wanted.trim()) return 0
  const a = normalizeForMatch(wanted)
  const b = normalizeForMatch(found)
  if (a === b) return 0
  if (a && b && (a.includes(b) || b.includes(a))) return 4
  const j = tokenJaccard(wanted, found)
  if (j >= 0.85) return 2
  if (j >= 0.55) return 10
  if (j >= 0.35) return 22
  return 70
}

export function durationDelta(found: number | undefined, wanted: number): number {
  if (wanted <= 0 || found == null || found <= 0) return 0
  return Math.abs(found - wanted)
}

/**
 * Lower is better. Duration is the primary key: karaoke dies if the LRC
 * belongs to a different mix, so a 20s miss beats a fuzzy title hit.
 */
export function scoreCandidate(result: Matchable, durationSec: number, artist: string, track: string): number {
  const delta = durationDelta(result.duration, durationSec)
  let score = delta * 4
  if (delta > DURATION_TOLERANCE_SEC) score += 80
  score += nameScore(result.artistName, artist)
  score += nameScore(result.trackName, track)
  if (result.instrumental) score += 70
  if (!result.plainLyrics?.trim() && !result.syncedLyrics?.trim()) score += 200
  if (result.syncedLyrics?.trim()) score -= 35
  return score
}

export function pickBestCandidate<T extends Matchable>(
  results: T[],
  durationSec: number,
  artist: string,
  track: string,
): T | null {
  if (results.length === 0) return null
  const ranked = results
    .map((result) => ({ result, score: scoreCandidate(result, durationSec, artist, track) }))
    .sort((a, b) => a.score - b.score)
  return ranked[0]?.result ?? null
}

export function isStrongMatch(result: Matchable, durationSec: number, artist: string, track: string): boolean {
  if (!result.syncedLyrics?.trim()) return false
  if (result.instrumental) return false
  const delta = durationDelta(result.duration, durationSec)
  if (durationSec > 0 && delta > 8) return false
  return nameScore(result.artistName, artist) <= 10 && nameScore(result.trackName, track) <= 10
}
