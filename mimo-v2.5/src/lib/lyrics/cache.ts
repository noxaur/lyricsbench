import type { LyricsResult, LyricLine } from "@/types/lyrics";
import type { LyricsProviderId } from "@/types/lyrics";

const CACHE_PREFIX = "umbra-lyrics-cache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type LyricsCacheEntry = {
  videoId: string;
  lines: LyricLine[];
  synced: boolean;
  autoTimed?: boolean;
  providerId: LyricsProviderId;
  englishLines?: string[];
  englishStatus?: "ready" | "loading" | "failed" | "skipped" | null;
  cachedAt: number;
};

function getCacheKey(videoId: string): string {
  return `${CACHE_PREFIX}:${videoId}`;
}

export function getLyricsCache(videoId: string): LyricsCacheEntry | null {
  try {
    const raw = localStorage.getItem(getCacheKey(videoId));
    if (!raw) return null;
    const entry = JSON.parse(raw) as LyricsCacheEntry;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(getCacheKey(videoId));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

export function setLyricsCache(entry: LyricsCacheEntry): void {
  try {
    localStorage.setItem(getCacheKey(entry.videoId), JSON.stringify({ ...entry, cachedAt: Date.now() }));
  } catch {}
}

export function clearLyricsCache(videoId: string): void {
  try {
    localStorage.removeItem(getCacheKey(videoId));
  } catch {}
}
