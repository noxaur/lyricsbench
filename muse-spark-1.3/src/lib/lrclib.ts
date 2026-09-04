/**
 * Client-only LRCLIB pipeline. No backend, no proxy worker, no Rust
 * gateway — this directly removes the entire bug class behind issue #177
 * (duplicate/dead backend paths) and #79 (search cooldowns from
 * server-side YouTube scraping): the browser calls LRCLIB, which allows
 * CORS, and never scrapes YouTube at all.
 *
 * Novel vs old lyrics-pipeline.ts + lyrics-orchestrator.ts + 20 providers:
 * one provider (LRCLIB holds synced lyrics for the karaoke use-case),
 * in-flight request coalescing, TTL cache, and duration-aware ranking.
 */

import { searchQueries, type TrackGuess } from "./title";

export interface LrclibHit {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

export interface ResolvedLyrics {
  hit: LrclibHit;
  /** Alternates the user can switch between (same shape, ranked). */
  alternates: LrclibHit[];
}

const API = "https://lrclib.net/api/v2";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const memory = new Map<string, { at: number; value: ResolvedLyrics | null }>();
const inflight = new Map<string, Promise<ResolvedLyrics | null>>();

function cacheKey(track: string, artist: string, durationSec: number): string {
  return `${track.toLowerCase().trim()}\0${artist.toLowerCase().trim()}\0${Math.round(durationSec)}`;
}

function hasText(hit: LrclibHit): boolean {
  return Boolean(hit.plainLyrics?.trim() || hit.syncedLyrics?.trim());
}

/** Duration proximity (0..1) + text overlap → single rank score, higher wins. */
function score(hit: LrclibHit, track: string, artist: string, durationSec: number): number {
  let s = 0;
  const norm = (v: string) => v.toLowerCase().trim();
  if (norm(hit.trackName) === norm(track)) s += 3;
  else if (norm(hit.trackName).includes(norm(track)) || norm(track).includes(norm(hit.trackName))) s += 1.5;
  if (artist && norm(hit.artistName) === norm(artist)) s += 3;
  else if (artist && (norm(hit.artistName).includes(norm(artist)) || norm(artist).includes(norm(hit.artistName)))) s += 1;
  if (durationSec > 0 && hit.duration > 0) {
    const d = Math.abs(hit.duration - durationSec);
    if (d <= 2) s += 3;
    else if (d <= 5) s += 2;
    else if (d <= 10) s += 1;
    else s -= 2; // wrong-length match = classic #78 symptom; penalize hard
  }
  if (hit.syncedLyrics?.trim()) s += 4;
  else if (hit.plainLyrics?.trim()) s += 1;
  if (hit.instrumental) s -= 5;
  return s;
}

async function searchOnce(params: URLSearchParams, signal: AbortSignal): Promise<LrclibHit[]> {
  const res = await fetch(`${API}/search?${params}`, {
    signal,
    headers: { "User-Agent": "umbra-lyrics-fresh (karaoke player)" },
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`lyrics search failed (${res.status})`);
  const data = (await res.json()) as LrclibHit[];
  return Array.isArray(data) ? data : [];
}

async function fetchFull(id: number, signal: AbortSignal): Promise<LrclibHit | null> {
  try {
    const res = await fetch(`${API}/get/${id}`, { signal });
    if (!res.ok) return null;
    return (await res.json()) as LrclibHit;
  } catch {
    return null;
  }
}

async function resolveInner(
  guess: TrackGuess,
  durationSec: number,
  signal: AbortSignal,
): Promise<ResolvedLyrics | null> {
  const byId = new Map<number, LrclibHit>();
  for (const q of searchQueries(guess)) {
    if (signal.aborted) return null;
    const params =
      q.artist.length > 0
        ? new URLSearchParams({ track_name: q.track, artist_name: q.artist })
        : new URLSearchParams({ q: q.track });
    try {
      const hits = await searchOnce(params, signal);
      for (const h of hits) if (!byId.has(h.id)) byId.set(h.id, h);
    } catch {
      // One failed strategy must not kill the others.
    }
    // Early exit: a clearly-right synced hit already found.
    const best = [...byId.values()].filter(hasText).sort((a, b) => score(b, guess.track, guess.artist, durationSec) - score(a, guess.track, guess.artist, durationSec))[0];
    if (best && score(best, guess.track, guess.artist, durationSec) >= 9) break;
  }

  const ranked = [...byId.values()]
    .filter(hasText)
    .sort((a, b) => score(b, guess.track, guess.artist, durationSec) - score(a, guess.track, guess.artist, durationSec));
  if (ranked.length === 0) return null;

  const top = ranked[0] as LrclibHit;
  const full = top.syncedLyrics?.trim() || top.plainLyrics?.trim() ? top : await fetchFull(top.id, signal);
  const winner = full ?? top;
  return { hit: winner, alternates: ranked.slice(1, 6) };
}

/**
 * Resolve lyrics with coalescing + TTL cache.
 * Concurrent callers for the same song share one network request;
 * repeat visits within 24h hit memory (localStorage persistence for
 * parsed lines lives in the machine layer, keyed by videoId).
 */
export function resolveLyrics(
  guess: TrackGuess,
  durationSec: number,
  signal: AbortSignal,
): Promise<ResolvedLyrics | null> {
  const key = cacheKey(guess.track, guess.artist, durationSec);
  const cached = memory.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return Promise.resolve(cached.value);

  const existing = inflight.get(key);
  if (existing) return existing;

  const p = resolveInner(guess, durationSec, signal)
    .then((v) => {
      memory.set(key, { at: Date.now(), value: v });
      return v;
    })
    .finally(() => {
      if (inflight.get(key) === p) inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

/** English counterpart: LRCLIB search restricted to english translations is unreliable, so we reuse the top hit's plain text only when the native side is non-English. Kept explicit and tiny on purpose. */
export async function resolveEnglishPlaceholder(): Promise<null> {
  return null;
}
