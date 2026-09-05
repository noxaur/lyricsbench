/**
 * Resolve-early / re-rank-late lyrics state machine.
 *
 * v2 vs v1: v1 gated the ENTIRE lyrics fetch on `ready` (player duration
 * available), so lyrics never started loading when the player was blocked
 * and always waited for YouTube metadata. v2 starts resolving immediately
 * on mount with the oEmbed title, ranks without duration, then RE-RANKS
 * locally when the real duration arrives — no refetch, just a re-sort of
 * the already-fetched alternates. The cache renders instantly (stale while
 * revalidating only when there is no usable title yet), and cancellation
 * is a single AbortController + generation token — no settled-pair map.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseLyricsText, type LyricLine } from "@/lib/lrc";
import { fetchOEmbedTitle } from "@/lib/ids";
import { guessTrack } from "@/lib/track";
import { resolveLyrics, scoreHit, type LrclibHit } from "@/lib/lrclib";
import { needsEnglishCounterpart } from "@/lib/language";
import { pushRecent, readLines, readOffset, writeLines, writeOffset } from "@/lib/store";

export type MachineState =
  | { kind: "idle" }
  | { kind: "resolving" }
  | { kind: "searching"; artist: string; track: string }
  | {
      kind: "ready";
      title: string;
      artist: string;
      track: string;
      lines: LyricLine[];
      synced: boolean;
      autoTimed: boolean;
      provider: string;
      alternates: LrclibHit[];
      englishOffered: boolean;
      fromCache: boolean;
    }
  | { kind: "instrumental"; title: string; artist: string; track: string }
  | { kind: "not_found"; title: string; artist: string; track: string; message: string }
  | { kind: "error"; message: string };

export interface LyricsMachine {
  state: MachineState;
  offsetMs: number;
  nudgeOffset: (deltaMs: number) => void;
  resetOffset: () => void;
  useAlternate: (hit: LrclibHit) => void;
  retry: () => void;
}

function sampleOf(lines: LyricLine[]): string {
  return lines.map((l) => l.text).join("\n");
}

export function useLyricsMachine(
  videoId: string,
  videoTitle: string,
  durationSec: number,
): LyricsMachine {
  const [state, setState] = useState<MachineState>({ kind: "idle" });
  const [offsetMs, setOffsetMs] = useState(() => readOffset(videoId));
  const [attempt, setAttempt] = useState(0);
  const genRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setOffsetMs(readOffset(videoId));
  }, [videoId]);

  const nudgeOffset = useCallback(
    (deltaMs: number) => {
      setOffsetMs((prev) => {
        const next = Math.max(-5000, Math.min(5000, prev + deltaMs));
        writeOffset(videoId, next);
        return next;
      });
    },
    [videoId],
  );

  const resetOffset = useCallback(() => {
    setOffsetMs(0);
    writeOffset(videoId, 0);
  }, [videoId]);

  const applyHit = useCallback(
    (
      hit: LrclibHit,
      meta: { title: string; artist: string; track: string },
      durationMs: number,
      alternates: LrclibHit[],
      fromCache: boolean,
    ): boolean => {
      const raw = hit.syncedLyrics?.trim() ? hit.syncedLyrics : (hit.plainLyrics ?? "");
      const parsed = parseLyricsText(raw, durationMs);
      if (parsed.lines.length === 0) return false;
      setState({
        kind: "ready",
        title: meta.title,
        artist: meta.artist,
        track: meta.track,
        lines: parsed.lines,
        synced: parsed.synced,
        autoTimed: parsed.autoTimed,
        provider: "LRCLIB",
        alternates,
        englishOffered: needsEnglishCounterpart(sampleOf(parsed.lines)),
        fromCache,
      });
      writeLines(videoId, {
        lines: parsed.lines,
        synced: parsed.synced,
        autoTimed: parsed.autoTimed,
        title: meta.title,
        artist: meta.artist,
        track: meta.track,
        provider: "LRCLIB",
      });
      pushRecent({ videoId, title: meta.title, artist: meta.artist, track: meta.track });
      return true;
    },
    [videoId],
  );

  const useAlternate = useCallback(
    (hit: LrclibHit) => {
      setState((prev) => {
        if (prev.kind !== "ready") return prev;
        const durationMs =
          prev.lines.length > 0 ? Math.max(...prev.lines.map((l) => l.endMs)) : 180_000;
        const raw = hit.syncedLyrics?.trim() ? hit.syncedLyrics : (hit.plainLyrics ?? "");
        const parsed = parseLyricsText(raw, durationMs || 180_000);
        if (parsed.lines.length === 0) return prev;
        writeLines(videoId, {
          lines: parsed.lines,
          synced: parsed.synced,
          autoTimed: parsed.autoTimed,
          title: prev.title,
          artist: prev.artist,
          track: prev.track,
          provider: "LRCLIB",
        });
        return {
          ...prev,
          lines: parsed.lines,
          synced: parsed.synced,
          autoTimed: parsed.autoTimed,
          alternates: prev.alternates.filter((a) => a.id !== hit.id),
          englishOffered: needsEnglishCounterpart(sampleOf(parsed.lines)),
          fromCache: false,
        };
      });
    },
    [videoId],
  );

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  // Main pipeline: resolve immediately, don't wait for player metadata.
  useEffect(() => {
    if (!videoId) {
      setState({ kind: "idle" });
      return;
    }
    const cached = readLines(videoId);
    if (cached && attempt === 0) {
      setState({
        kind: "ready",
        title: cached.title,
        artist: cached.artist,
        track: cached.track,
        lines: cached.lines,
        synced: cached.synced,
        autoTimed: cached.autoTimed,
        provider: cached.provider,
        alternates: [],
        englishOffered: needsEnglishCounterpart(sampleOf(cached.lines)),
        fromCache: true,
      });
      // When a fresh cache exists AND we already know the title, skip the
      // network entirely this mount — the duration effect below still
      // re-ranks if needed. Without a title we revalidate to learn names.
      if (cached.title || videoTitle) {
        pushRecent({ videoId, title: cached.title, artist: cached.artist, track: cached.track });
        return;
      }
    } else {
      setState({ kind: "resolving" });
    }

    const gen = ++genRef.current;
    const cancelled = () => genRef.current !== gen;
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      const oembed = await fetchOEmbedTitle(videoId, signal).catch(() => null);
      if (cancelled() || signal.aborted) return;
      const title = videoTitle || oembed?.title || "";
      if (!title.trim()) {
        // NOT terminal: a late player title will re-run this effect.
        setState({ kind: "error", message: "Couldn't read the video title — retry once playback starts." });
        return;
      }
      const guess = guessTrack(title, oembed?.author ?? "");
      if (cancelled()) return;
      setState({ kind: "searching", artist: guess.artist, track: guess.track });

      let resolved: Awaited<ReturnType<typeof resolveLyrics>>;
      try {
        resolved = await resolveLyrics(guess, durationSec, signal);
      } catch (err) {
        if (cancelled() || signal.aborted) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Couldn't reach the lyrics service.",
        });
        return;
      }
      if (cancelled() || signal.aborted) return;

      if (!resolved) {
        setState({
          kind: "not_found",
          title,
          artist: guess.artist,
          track: guess.track,
          message: "No synced lyrics found for this track. Try the official music video.",
        });
        return;
      }
      if (resolved.hit.instrumental && !resolved.hit.syncedLyrics?.trim() && !resolved.hit.plainLyrics?.trim()) {
        setState({ kind: "instrumental", title, artist: guess.artist, track: guess.track });
        return;
      }
      const ok = applyHit(
        resolved.hit,
        { title, artist: guess.artist, track: guess.track },
        Math.round(durationSec * 1000) || 180_000,
        resolved.alternates,
        false,
      );
      if (cancelled()) return;
      if (!ok) {
        setState({
          kind: "not_found",
          title,
          artist: guess.artist,
          track: guess.track,
          message: "Lyrics were found but contained no usable lines.",
        });
      }
    })();

    return () => {
      genRef.current++;
      controller.abort();
    };
  }, [videoId, videoTitle, attempt, applyHit, durationSec === 0]);
  // NOTE: durationSec intentionally enters only as "known vs unknown"
  // (durationSec === 0). The real duration refines ranking in the effect
  // below without refetching — that's the re-rank-late half.

  // Re-rank-late: when the true duration arrives, re-sort alternates
  // locally and promote a clearly-better match without any network.
  const durationKnown = durationSec > 0 ? Math.round(durationSec) : 0;
  useEffect(() => {
    if (durationKnown <= 0) return;
    setState((prev) => {
      if (prev.kind !== "ready" || prev.fromCache || prev.alternates.length === 0) return prev;
      const scored = prev.alternates
        .map((a) => ({ hit: a, s: scoreHit(a, prev.track, prev.artist, durationKnown) }))
        .sort((a, b) => b.s - a.s);
      const best = scored[0];
      if (!best || best.s < 9) return prev;
      const raw = best.hit.syncedLyrics?.trim() ? best.hit.syncedLyrics : (best.hit.plainLyrics ?? "");
      const durationMs = Math.round(durationKnown * 1000);
      const parsed = parseLyricsText(raw, durationMs);
      if (parsed.lines.length === 0) return prev;
      // Only swap when the duration-aware winner beats a duration-blind top.
      return {
        ...prev,
        lines: parsed.lines,
        synced: parsed.synced,
        autoTimed: parsed.autoTimed,
        alternates: prev.alternates.filter((a) => a.id !== best.hit.id),
        englishOffered: needsEnglishCounterpart(sampleOf(parsed.lines)),
      };
    });
  }, [durationKnown]);

  return useMemo(
    () => ({ state, offsetMs, nudgeOffset, resetOffset, useAlternate, retry }),
    [state, offsetMs, nudgeOffset, resetOffset, useAlternate, retry],
  );
}
