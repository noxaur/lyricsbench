/**
 * Client-only LRCLIB pipeline with instrumental-first detection.
 *
 * v2 vs v1: v1 filtered out hits without lyric text BEFORE ranking, so an
 * instrumental track (LRCLIB returns { instrumental: true, plainLyrics: null,
 * syncedLyrics: null }) vanished into "not found" instead of the honest
 * "instrumental" state. v2 ranks ALL hits by name+duration first: when the
 * best name/duration match is instrumental with no text, it returns the
 * instrumental state directly. Text ranking then uses token-overlap
 * (Jaccard) instead of substring includes, which mis-ranked
 * "Love" vs "Lovely Day" style near-misses.
 */

import { searchQueries, tokenOverlap, type TrackGuess } from "./track";

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
  alternates: LrclibHit[];
}

const API = "https://lrclib.net/api/v2";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const FETCH_TIMEOUT_MS = 10_000;

const memory = new Map<string, { at: number; value: ResolvedLyrics | null }>();
const inflight = new Map<string, Promise<ResolvedLyrics | null>>();

function cacheKey(track: string, artist: string, durationSec: number): string {
  return `${track.toLowerCase().trim()}\0${artist.toLowerCase().trim()}\0${Math.round(durationSec)}`;
}

function hasText(hit: LrclibHit): boolean {
  return Boolean(hit.plainLyrics?.trim() || hit.syncedLyrics?.trim());
}

function nameScore(hit: LrclibHit, track: string, artist: string): number {
  let s = 0;
  const eq = (a: string, b: string) => a.toLowerCase().trim() === b.toLowerCase().trim();
  if (eq(hit.trackName, track)) s += 3;
  else s += tokenOverlap(hit.trackName, track) * 2;
  if (artist) {
    if (eq(hit.artistName, artist)) s += 3;
    else s += tokenOverlap(hit.artistName, artist) * 2;
  }
  return s;
}

function durationScore(hit: LrclibHit, durationSec: number): number {
  if (!(durationSec > 0) || !(hit.duration > 0)) return 0;
  const d = Math.abs(hit.duration - durationSec);
  if (d <= 2) return 3;
  if (d <= 5) return 2;
  if (d <= 12) return 1;
  return -3;
}

/** Full rank for text hits: name + duration + synced bonus. */
export function scoreHit(hit: LrclibHit, track: string, artist: string, durationSec: number): number {
  let s = nameScore(hit, track, artist) + durationScore(hit, durationSec);
  if (hit.syncedLyrics?.trim()) s += 4;
  else if (hit.plainLyrics?.trim()) s += 1;
  if (hit.instrumental) s -= 6;
  return s;
}

async function fetchWithTimeout(url: string, signal: AbortSignal, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

async function searchOnce(params: URLSearchParams, signal: AbortSignal): Promise<LrclibHit[]> {
  const res = await fetchWithTimeout(`${API}/search?${params}`, signal, {
    headers: { "User-Agent": "umbra-lyrics-v2 (karaoke player)" },
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`lyrics search failed (${res.status})`);
  const data = (await res.json()) as LrclibHit[];
  return Array.isArray(data) ? data : [];
}

async function fetchFull(id: number, signal: AbortSignal): Promise<LrclibHit | null> {
  try {
    const res = await fetchWithTimeout(`${API}/get/${id}`, signal);
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
    const textBest = [...byId.values()]
      .filter(hasText)
      .sort((a, b) => scoreHit(b, guess.track, guess.artist, durationSec) - scoreHit(a, guess.track, guess.artist, durationSec))[0];
    if (textBest && scoreHit(textBest, guess.track, guess.artist, durationSec) >= 10) break;
  }

  const all = [...byId.values()];
  if (all.length === 0) return null;

  // Instrumental-first: does the best NAME match claim instrumental?
  const byName = [...all].sort(
    (a, b) =>
      nameScore(b, guess.track, guess.artist) +
      durationScore(b, durationSec) -
      (nameScore(a, guess.track, guess.artist) + durationScore(a, durationSec)),
  );
  const nameBest = byName[0] as LrclibHit;
  if (
    nameBest.instrumental &&
    !hasText(nameBest) &&
    nameScore(nameBest, guess.track, guess.artist) >= 4
  ) {
    return { hit: nameBest, alternates: [] };
  }

  const ranked = all
    .filter(hasText)
    .sort((a, b) => scoreHit(b, guess.track, guess.artist, durationSec) - scoreHit(a, guess.track, guess.artist, durationSec));
  if (ranked.length === 0) {
    const anyInstr = all.find((h) => h.instrumental);
    if (anyInstr) return { hit: anyInstr, alternates: [] };
    return null;
  }

  const top = ranked[0] as LrclibHit;
  const full = top.syncedLyrics?.trim() || top.plainLyrics?.trim() ? top : await fetchFull(top.id, signal);
  const winner = full ?? top;
  return { hit: winner, alternates: ranked.slice(1, 6) };
}

/**
 * Resolve lyrics with coalescing + TTL cache. Concurrent callers share one
 * request; repeat visits within 24h hit memory (parsed-line persistence
 * lives in the store layer, keyed by videoId).
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
