import type { LyricsProvider } from "./types";
import { lrclibProvider } from "./lrclib";
import { musixmatchProvider } from "./musixmatch";
import { geniusProvider } from "./genius";
import { lyricsOvhProvider } from "./lyrics-ovh";

// All registered providers — order defines priority for staged search
export const providers: LyricsProvider[] = [
  lrclibProvider,
  musixmatchProvider,
  geniusProvider,
  lyricsOvhProvider,
];

export function getProvider(id: string): LyricsProvider | undefined {
  return providers.find((p) => p.id === id);
}
