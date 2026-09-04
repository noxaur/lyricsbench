import type { LyricsProvider } from "./types";

const PROXY_BASE = "/api";

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const musixmatchProvider: LyricsProvider = {
  id: "musixmatch",
  name: "Musixmatch",

  async search({ artist, track, signal }) {
    try {
      const params = new URLSearchParams({ artist, track });
      const data = await fetchJson(`${PROXY_BASE}/lyrics/musixmatch?${params}`, signal) as Record<string, unknown>;
      if (data.lyrics) {
        return [
          {
            id: (data.id as number | string) ?? `musixmatch-${artist}-${track}`,
            providerId: "musixmatch" as const,
            plainLyrics: (data.lyrics as string) ?? null,
            syncedLyrics: null,
            trackName: (data.trackName as string) ?? undefined,
            artistName: (data.artistName as string) ?? undefined,
          },
        ];
      }
    } catch {}
    return [];
  },
};
