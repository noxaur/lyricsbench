export type LyricWord = {
  text: string;
  startMs: number;
  endMs: number;
};

export type LyricLine = {
  startMs: number;
  endMs: number;
  text: string;
  sectionLabel?: string;
  kind?: "lyric" | "section";
  words?: LyricWord[];
};

export type LyricStageMode = "idle" | "intro" | "lyric" | "gap" | "outro";

export type ParsedLyrics = {
  lines: LyricLine[];
  synced: boolean;
  autoTimed?: boolean;
  aligned?: boolean;
  suggestedOffsetMs?: number;
};

export type LyricDisplayMode = "native" | "romaji" | "english" | "native-romaji" | "both" | "all";

export type LyricsProviderId =
  | "lrclib"
  | "musixmatch"
  | "genius"
  | "lyrics-ovh"
  | "megalobiz"
  | "musicbrainz"
  | "letras"
  | "lyricstranslate"
  | "animelyrics"
  | "vagalume"
  | "lyricswiki"
  | "songmeanings"
  | "petitlyrics"
  | "chartlyrics"
  | "transcription";

export const LYRICS_PROVIDER_LABELS: Record<LyricsProviderId, string> = {
  lrclib: "LRCLIB",
  musixmatch: "Musixmatch",
  genius: "Genius",
  "lyrics-ovh": "lyrics.ovh",
  megalobiz: "Megalobiz",
  musicbrainz: "MusicBrainz",
  letras: "Letras.mus.br",
  lyricstranslate: "LyricsTranslate",
  animelyrics: "AnimeLyrics",
  vagalume: "Vagalume",
  lyricswiki: "Lyrics Wiki",
  songmeanings: "SongMeanings",
  petitlyrics: "PetitLyrics",
  chartlyrics: "ChartLyrics",
  transcription: "Transcribed",
};

export type LyricsResult = {
  id: number | string;
  providerId: LyricsProviderId;
  plainLyrics: string | null;
  syncedLyrics: string | null;
  trackName?: string;
  artistName?: string;
  durationMs?: number;
};
