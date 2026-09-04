import type { LyricsProvider } from "./types";

const PROXY_BASE = "/api";

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const megalobizProvider: LyricsProvider = {
  id: "megalobiz",
  name: "Megalobiz",
  async search({ artist, track, signal }) {
    try {
      const params = new URLSearchParams({ artist, track });
      const data = await fetchJson(`${PROXY_BASE}/lyrics/megalobiz?${params}`, signal) as Record<string, unknown>;
      if (data.lyrics) {
        return [{ id: `megalobiz-${artist}-${track}`, providerId: "megalobiz" as const, plainLyrics: (data.lyrics as string) ?? null, syncedLyrics: null }];
      }
    } catch {}
    return [];
  },
};

export const musicbrainzProvider: LyricsProvider = {
  id: "musicbrainz",
  name: "MusicBrainz",
  async search({ artist, track, signal }) {
    try {
      const params = new URLSearchParams({ artist, track });
      const data = await fetchJson(`${PROXY_BASE}/lyrics/musicbrainz?${params}`, signal) as Record<string, unknown>;
      if (data.lyrics) {
        return [{ id: (data.id as number | string) ?? `mb-${artist}-${track}`, providerId: "musicbrainz" as const, plainLyrics: (data.lyrics as string) ?? null, syncedLyrics: null }];
      }
    } catch {}
    return [];
  },
};

export const letrasProvider: LyricsProvider = {
  id: "letras",
  name: "Letras.mus.br",
  async search({ artist, track, signal }) {
    try {
      const params = new URLSearchParams({ artist, track });
      const data = await fetchJson(`${PROXY_BASE}/lyrics/letras?${params}`, signal) as Record<string, unknown>;
      if (data.lyrics) {
        return [{ id: `letras-${artist}-${track}`, providerId: "letras" as const, plainLyrics: (data.lyrics as string) ?? null, syncedLyrics: null }];
      }
    } catch {}
    return [];
  },
};

export const lyricsTranslateProvider: LyricsProvider = {
  id: "lyricstranslate",
  name: "LyricsTranslate",
  async search({ artist, track, signal }) {
    try {
      const params = new URLSearchParams({ artist, track });
      const data = await fetchJson(`${PROXY_BASE}/lyrics/lyricstranslate?${params}`, signal) as Record<string, unknown>;
      if (data.lyrics) {
        return [{ id: `lt-${artist}-${track}`, providerId: "lyricstranslate" as const, plainLyrics: (data.lyrics as string) ?? null, syncedLyrics: null }];
      }
    } catch {}
    return [];
  },
};

export const animelyricsProvider: LyricsProvider = {
  id: "animelyrics",
  name: "AnimeLyrics",
  async search({ artist, track, signal }) {
    try {
      const params = new URLSearchParams({ artist, track });
      const data = await fetchJson(`${PROXY_BASE}/lyrics/animelyrics?${params}`, signal) as Record<string, unknown>;
      if (data.lyrics) {
        return [{ id: `anime-${artist}-${track}`, providerId: "animelyrics" as const, plainLyrics: (data.lyrics as string) ?? null, syncedLyrics: null }];
      }
    } catch {}
    return [];
  },
};

export const vagalumeProvider: LyricsProvider = {
  id: "vagalume",
  name: "Vagalume",
  async search({ artist, track, signal }) {
    try {
      const params = new URLSearchParams({ artist, track });
      const data = await fetchJson(`${PROXY_BASE}/lyrics/vagalume?${params}`, signal) as Record<string, unknown>;
      if (data.lyrics) {
        return [{ id: `vagalume-${artist}-${track}`, providerId: "vagalume" as const, plainLyrics: (data.lyrics as string) ?? null, syncedLyrics: null }];
      }
    } catch {}
    return [];
  },
};

export const lyricsWikiProvider: LyricsProvider = {
  id: "lyricswiki",
  name: "Lyrics Wiki",
  async search({ artist, track, signal }) {
    try {
      const params = new URLSearchParams({ artist, track });
      const data = await fetchJson(`${PROXY_BASE}/lyrics/lyricswiki?${params}`, signal) as Record<string, unknown>;
      if (data.lyrics) {
        return [{ id: `wiki-${artist}-${track}`, providerId: "lyricswiki" as const, plainLyrics: (data.lyrics as string) ?? null, syncedLyrics: null }];
      }
    } catch {}
    return [];
  },
};

export const songMeaningsProvider: LyricsProvider = {
  id: "songmeanings",
  name: "SongMeanings",
  async search({ artist, track, signal }) {
    try {
      const params = new URLSearchParams({ artist, track });
      const data = await fetchJson(`${PROXY_BASE}/lyrics/songmeanings?${params}`, signal) as Record<string, unknown>;
      if (data.lyrics) {
        return [{ id: `sm-${artist}-${track}`, providerId: "songmeanings" as const, plainLyrics: (data.lyrics as string) ?? null, syncedLyrics: null }];
      }
    } catch {}
    return [];
  },
};

export const petitLyricsProvider: LyricsProvider = {
  id: "petitlyrics",
  name: "PetitLyrics",
  async search({ artist, track, signal }) {
    try {
      const params = new URLSearchParams({ artist, track });
      const data = await fetchJson(`${PROXY_BASE}/lyrics/petitlyrics?${params}`, signal) as Record<string, unknown>;
      if (data.lyrics) {
        return [{ id: `petit-${artist}-${track}`, providerId: "petitlyrics" as const, plainLyrics: (data.lyrics as string) ?? null, syncedLyrics: null }];
      }
    } catch {}
    return [];
  },
};

export const chartLyricsProvider: LyricsProvider = {
  id: "chartlyrics",
  name: "ChartLyrics",
  async search({ artist, track, signal }) {
    try {
      const params = new URLSearchParams({ artist, track });
      const data = await fetchJson(`${PROXY_BASE}/lyrics/chartlyrics?${params}`, signal) as Record<string, unknown>;
      if (data.lyrics) {
        return [{ id: `chart-${artist}-${track}`, providerId: "chartlyrics" as const, plainLyrics: (data.lyrics as string) ?? null, syncedLyrics: null }];
      }
    } catch {}
    return [];
  },
};
