/**
 * One typed storage layer for the whole player.
 *
 * v2 vs v1: v1 scattered four unrelated key prefixes across machine.ts,
 * play.tsx and recent.ts with no TTL and no quota handling — the lyrics
 * cache grew forever and a full localStorage silently broke recents too.
 * v2 keeps a single `umbra.v2.*` namespace, version-stamps the lyrics
 * cache (v1 payloads are ignored, not misparsed), expires lines after 30
 * days, and evicts the whole lyrics namespace once on quota errors.
 */

import type { LyricLine } from "./lrc";

export interface CachedLines {
  v: 2;
  at: number;
  lines: LyricLine[];
  synced: boolean;
  autoTimed: boolean;
  title: string;
  artist: string;
  track: string;
  provider: string;
}

export interface RecentSong {
  videoId: string;
  title: string;
  artist: string;
  track: string;
  playedAt: number;
}

export interface PlayerPrefs {
  videoHidden: boolean;
  showTimes: boolean;
}

const LINES_PREFIX = "umbra.v2.lines.";
const LINES_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const OFFSET_PREFIX = "umbra.v2.offset.";
const RECENT_KEY = "umbra.v2.recent";
const PREFS_KEY = "umbra.v2.prefs";
const RECENT_MAX = 30;

function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function del(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function evictLinesNamespace(): void {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(LINES_PREFIX)) doomed.push(k);
    }
    for (const k of doomed) localStorage.removeItem(k);
  } catch {
    // ignore
  }
}

export function readLines(videoId: string): CachedLines | null {
  try {
    const raw = get(LINES_PREFIX + videoId);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedLines;
    if (data.v !== 2 || !Array.isArray(data.lines) || data.lines.length === 0) return null;
    if (Date.now() - data.at > LINES_TTL_MS) {
      del(LINES_PREFIX + videoId);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function writeLines(videoId: string, record: Omit<CachedLines, "v" | "at">): void {
  const payload = JSON.stringify({ ...record, v: 2, at: Date.now() });
  if (set(LINES_PREFIX + videoId, payload)) return;
  evictLinesNamespace();
  set(LINES_PREFIX + videoId, payload);
}

export function readOffset(videoId: string): number {
  const raw = get(OFFSET_PREFIX + videoId);
  const n = raw ? Number(raw) : 0;
  if (!Number.isFinite(n)) return 0;
  return Math.max(-5000, Math.min(5000, Math.round(n)));
}

export function writeOffset(videoId: string, ms: number): void {
  const clamped = Math.max(-5000, Math.min(5000, Math.round(ms)));
  if (clamped === 0) del(OFFSET_PREFIX + videoId);
  else set(OFFSET_PREFIX + videoId, String(clamped));
}

export function readRecent(): RecentSong[] {
  try {
    const raw = get(RECENT_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as RecentSong[];
    return Array.isArray(data) ? data.filter((s) => typeof s?.videoId === "string") : [];
  } catch {
    return [];
  }
}

export function pushRecent(song: Omit<RecentSong, "playedAt">): RecentSong[] {
  const next = [{ ...song, playedAt: Date.now() }, ...readRecent().filter((s) => s.videoId !== song.videoId)].slice(
    0,
    RECENT_MAX,
  );
  set(RECENT_KEY, JSON.stringify(next));
  return next;
}

export function clearRecent(): void {
  del(RECENT_KEY);
}

export function recentLabel(song: RecentSong): string {
  const track = song.track || song.title;
  return song.artist ? `${song.artist} — ${track}` : track;
}

export function readPrefs(): PlayerPrefs {
  try {
    const raw = get(PREFS_KEY);
    if (!raw) return { videoHidden: false, showTimes: false };
    const data = JSON.parse(raw) as Partial<PlayerPrefs>;
    return {
      videoHidden: data.videoHidden === true,
      showTimes: data.showTimes === true,
    };
  } catch {
    return { videoHidden: false, showTimes: false };
  }
}

export function writePrefs(prefs: PlayerPrefs): void {
  set(PREFS_KEY, JSON.stringify(prefs));
}
