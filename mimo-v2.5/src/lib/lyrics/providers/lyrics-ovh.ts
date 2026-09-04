import type { LyricsProvider } from "./types";

const PROXY_BASE = "/api";

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const lyricsOvhProvider: LyricsProvider = {
  id: "lyrics-ovh",
  name: "lyrics.ovh",

  async search({ artist, track, signal }) {
    try {
      const data = await fetchJson(
        `${PROXY_BASE}/lyrics/ovh/${encodeURIComponent(artist)}/${encodeURIComponent(track)}`,
        signal,
      ) as Record<string, unknown>;
      const lyricsData = data.lyrics as Record<string, unknown> | undefined;
      if (lyricsData?.lyrics) {
        return [
          {
            id: `ovh-${artist}-${track}`,
            providerId: "lyrics-ovh" as const,
            plainLyrics: (lyricsData.lyrics as string) ?? null,
            syncedLyrics: null,
            trackName: (lyricsData.track_name as string) ?? undefined,
            artistName: (lyricsData.artist_name as string) ?? undefined,
          },
        ];
      }
    } catch {}
    return [];
  },
};
