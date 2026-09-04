import type { LyricsProviderId, LyricsResult } from "@/types/lyrics";

export type LyricsProvider = {
  id: LyricsProviderId;
  name: string;
  search(query: { artist: string; track: string; durationMs?: number; signal?: AbortSignal }): Promise<LyricsResult[]>;
};

export type ProviderSearchOptions = {
  artist: string;
  track: string;
  durationMs?: number;
  signal?: AbortSignal;
};
