import type { LyricsResult, LyricsProviderId } from "@/types/lyrics";

export type RankOptions = {
  durationMs?: number;
  artist: string;
  track: string;
};

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const words = na.split(/\s+/);
  const target = nb.split(/\s+/);
  let matches = 0;
  for (const w of words) {
    if (target.includes(w)) matches++;
  }
  return matches / Math.max(words.length, target.length);
}

function countLines(text: string | null): number {
  if (!text) return 0;
  return text.split("\n").filter((l) => l.trim()).length;
}

const PROVIDER_PRIORITY: Record<LyricsProviderId, number> = {
  lrclib: 10,
  musixmatch: 9,
  genius: 8,
  "lyrics-ovh": 7,
  megalobiz: 6,
  musicbrainz: 5,
  letras: 4,
  lyricstranslate: 3,
  animelyrics: 3,
  vagalume: 3,
  lyricswiki: 2,
  songmeanings: 2,
  petitlyrics: 2,
  chartlyrics: 1,
  transcription: 0,
};

export function rankResults(results: LyricsResult[], options: RankOptions): LyricsResult[] {
  return [...results].sort((a, b) => {
    const scoreA = computeScore(a, options);
    const scoreB = computeScore(b, options);
    return scoreB - scoreA;
  });
}

function computeScore(result: LyricsResult, options: RankOptions): number {
  let score = 0;

  // Provider priority
  score += (PROVIDER_PRIORITY[result.providerId] ?? 0) * 10;

  // Synced lyrics strongly preferred
  if (result.syncedLyrics) score += 50;

  // Track name similarity
  if (result.trackName) {
    score += similarity(result.trackName, options.track) * 30;
  }

  // Artist name similarity
  if (result.artistName) {
    score += similarity(result.artistName, options.artist) * 20;
  }

  // Duration match (if available)
  if (result.durationMs && options.durationMs) {
    const diff = Math.abs(result.durationMs - options.durationMs);
    if (diff < 5000) score += 20;
    else if (diff < 15000) score += 10;
  }

  // Line count bonus (prefer reasonable line counts)
  const lineCount = countLines(result.syncedLyrics ?? result.plainLyrics);
  if (lineCount >= 5 && lineCount <= 200) score += 5;

  return score;
}
