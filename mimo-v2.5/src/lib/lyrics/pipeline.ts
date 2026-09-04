import type { LyricsResult, LyricsProviderId } from "@/types/lyrics";
import type { LyricsProvider } from "./providers/types";
import { providers } from "./providers/registry";
import { rankResults } from "./ranking";

export type PipelineOptions = {
  artist: string;
  track: string;
  durationMs?: number;
  signal?: AbortSignal;
};

export type PipelineEvent =
  | { type: "step"; provider: LyricsProviderId; phase: "searching" | "done" }
  | { type: "result"; result: LyricsResult }
  | { type: "done"; best: LyricsResult | null; all: LyricsResult[] };

// Staged search: first wave runs immediately, second wave after delay
const FIRST_WAVE: LyricsProviderId[] = ["lrclib", "musixmatch"];
const SECOND_WAVE_DELAY_MS = 1500;

export async function runLyricsPipeline(
  options: PipelineOptions,
  onEvent: (event: PipelineEvent) => void,
): Promise<void> {
  const { artist, track, durationMs, signal } = options;
  const allResults: LyricsResult[] = [];
  let bestResult: LyricsResult | null = null;

  const notify = (event: PipelineEvent) => {
    if (!signal?.aborted) onEvent(event);
  };

  const searchProvider = async (provider: LyricsProvider) => {
    notify({ type: "step", provider: provider.id, phase: "searching" });
    try {
      const results = await provider.search({ artist, track, durationMs, signal });
      for (const result of results) {
        allResults.push(result);
        notify({ type: "result", result });
      }
    } catch {}
    notify({ type: "step", provider: provider.id, phase: "done" });
  };

  // First wave: LRCLIB + Musixmatch
  const firstWave = providers.filter((p) => FIRST_WAVE.includes(p.id));
  const firstWaveResults = await Promise.allSettled(
    firstWave.map((p) => searchProvider(p)),
  );

  // Check if we got a definitive synced result from first wave
  const syncedFirstWave = allResults.filter((r) => r.syncedLyrics);
  if (syncedFirstWave.length > 0) {
    bestResult = rankResults(syncedFirstWave, { artist, track, durationMs })[0];
    notify({ type: "done", best: bestResult, all: allResults });
    return;
  }

  // Second wave: remaining providers (after delay if first wave had results)
  const secondWave = providers.filter((p) => !FIRST_WAVE.includes(p.id));
  const secondWaveDelay = allResults.length > 0 ? SECOND_WAVE_DELAY_MS : 0;

  if (secondWaveDelay > 0) {
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, secondWaveDelay);
      signal?.addEventListener("abort", () => { clearTimeout(timer); resolve(undefined); });
    });
  }

  if (signal?.aborted) {
    notify({ type: "done", best: bestResult, all: allResults });
    return;
  }

  await Promise.allSettled(secondWave.map((p) => searchProvider(p)));

  // Rank all results
  const ranked = rankResults(allResults, { artist, track, durationMs });
  bestResult = ranked[0] ?? null;

  notify({ type: "done", best: bestResult, all: ranked });
}
