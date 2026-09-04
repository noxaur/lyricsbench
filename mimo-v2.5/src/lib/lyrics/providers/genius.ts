import type { LyricsProvider } from "./types";

const PROXY_BASE = "/api";

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const geniusProvider: LyricsProvider = {
  id: "genius",
  name: "Genius",

  async search({ artist, track, signal }) {
    try {
      const params = new URLSearchParams({ artist, track });
      const data = await fetchJson(`${PROXY_BASE}/lyrics/genius?${params}`, signal) as Record<string, unknown>;
      if (data.lyrics) {
        return [
          {
            id: (data.id as number | string) ?? `genius-${artist}-${track}`,
            providerId: "genius" as const,
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
