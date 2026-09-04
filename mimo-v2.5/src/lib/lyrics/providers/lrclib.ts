import type { LyricsProvider } from "./types";
import type { LyricsResult } from "@/types/lyrics";

const LRCLIB_BASE = "https://lrclib.net/api";

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal, headers: { "User-Agent": "umbra-lyrics/2.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const lrclibProvider: LyricsProvider = {
  id: "lrclib",
  name: "LRCLIB",

  async search({ artist, track, durationMs, signal }) {
    const results: LyricsResult[] = [];

    // Try by artist + track name first
    try {
      const params = new URLSearchParams({ artist_name: artist, track_name: track });
      if (durationMs) params.set("duration", String(Math.round(durationMs / 1000)));
      const data = await fetchJson(`${LRCLIB_BASE}/get?${params}`, signal) as Record<string, unknown>;
      if (data.syncedLyrics || data.plainLyrics) {
        results.push({
          id: data.id as number,
          providerId: "lrclib",
          plainLyrics: (data.plainLyrics as string) ?? null,
          syncedLyrics: (data.syncedLyrics as string) ?? null,
          trackName: (data.trackName as string) ?? undefined,
          artistName: (data.artistName as string) ?? undefined,
          durationMs: typeof data.duration === "number" ? (data.duration as number) * 1000 : undefined,
        });
      }
    } catch {}

    // Also try search endpoint for broader matches
    try {
      const params = new URLSearchParams({ q: `${artist} ${track}` });
      const data = await fetchJson(`${LRCLIB_BASE}/search?${params}`, signal) as Array<Record<string, unknown>>;
      for (const item of data.slice(0, 3)) {
        if (results.some((r) => r.id === item.id)) continue;
        if (item.syncedLyrics || item.plainLyrics) {
          results.push({
            id: item.id as number,
            providerId: "lrclib",
            plainLyrics: (item.plainLyrics as string) ?? null,
            syncedLyrics: (item.syncedLyrics as string) ?? null,
            trackName: (item.trackName as string) ?? undefined,
            artistName: (item.artistName as string) ?? undefined,
            durationMs: typeof item.duration === "number" ? (item.duration as number) * 1000 : undefined,
          });
        }
      }
    } catch {}

    return results;
  },
};
