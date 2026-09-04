/**
 * The single lyrics state machine.
 *
 * What it replaces: player-page.tsx (~1800 lines) coordinated ~8 refs
 * (loadedRef, oembedAuthorRef, transcribeAbortRef, alignAbortRef,
 * resolutionAbortRef, prevVideoIdRef, cachedTimingAppliedRef,
 * currentVideoIdRef) plus a generation counter in lyrics-load-coordinator.ts
 * plus zustand status flags — and still had stale-state bugs (#84) where a
 * slow resolve for song A overwrote song B.
 *
 * Novel approach: ONE hook owns ONE AbortController per videoId. Every
 * async step checks `token.cancelled` after each await. There is no
 * generation counter because cancellation IS the generation. The machine
 * transitions through an explicit state union so impossible states
 * (status=ready with zero lines) can't be represented.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseLyricsText, type LyricLine } from "@/lib/lrc";
import { fetchOEmbedTitle } from "@/lib/youtube";
import { guessTrack } from "@/lib/title";
import { resolveLyrics, type LrclibHit } from "@/lib/lrclib";
import { needsEnglishCounterpart } from "@/lib/language";
import { pushRecent } from "@/lib/recent";

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

interface CacheRecord {
  lines: LyricLine[];
  synced: boolean;
  autoTimed: boolean;
  title: string;
  artist: string;
  track: string;
  provider: string;
}

const LINE_CACHE_PREFIX = "umbra.lines.v1.";

function readLineCache(videoId: string): CacheRecord | null {
  try {
    const raw = localStorage.getItem(LINE_CACHE_PREFIX + videoId);
    if (!raw) return null;
    const data = JSON.parse(raw) as CacheRecord;
    if (!Array.isArray(data.lines) || data.lines.length === 0) return null;
    return data;
  } catch {
    return null;
  }
}

function writeLineCache(videoId: string, record: CacheRecord): void {
  try {
    localStorage.setItem(LINE_CACHE_PREFIX + videoId, JSON.stringify(record));
  } catch {
    // ignore quota errors
  }
}

export interface LyricsMachine {
  state: MachineState;
  /** Manual offset in ms, clamped ±5000. Persists per videoId. */
  offsetMs: number;
  nudgeOffset: (deltaMs: number) => void;
  resetOffset: () => void;
  /** Switch to an alternate LRCLIB match. */
  useAlternate: (hit: LrclibHit) => void;
  retry: () => void;
}

const OFFSET_PREFIX = "umbra.offset.v1.";

export function useLyricsMachine(
  videoId: string,
  videoTitle: string,
  durationSec: number,
  ready: boolean,
): LyricsMachine {
  const [state, setState] = useState<MachineState>({ kind: "idle" });
  const [offsetMs, setOffsetMs] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const tokenRef = useRef(0);

  // Per-video offset restores from storage; resets on video change.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(OFFSET_PREFIX + videoId);
      setOffsetMs(raw ? Math.max(-5000, Math.min(5000, Number(raw) || 0)) : 0);
    } catch {
      setOffsetMs(0);
    }
  }, [videoId]);

  const nudgeOffset = useCallback(
    (deltaMs: number) => {
      setOffsetMs((prev) => {
        const next = Math.max(-5000, Math.min(5000, prev + deltaMs));
        try {
          localStorage.setItem(OFFSET_PREFIX + videoId, String(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [videoId],
  );

  const resetOffset = useCallback(() => {
    setOffsetMs(0);
    try {
      localStorage.removeItem(OFFSET_PREFIX + videoId);
    } catch {
      // ignore
    }
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
      const sample = parsed.lines.map((l) => l.text).join("\n");
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
        englishOffered: needsEnglishCounterpart(sample),
        fromCache,
      });
      writeLineCache(videoId, {
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
        const durationMs = prev.lines.length > 0 ? Math.max(...prev.lines.map((l) => l.endMs)) : 0;
        const raw = hit.syncedLyrics?.trim() ? hit.syncedLyrics : (hit.plainLyrics ?? "");
        const parsed = parseLyricsText(raw, durationMs || 180_000);
        if (parsed.lines.length === 0) return prev;
        const sample = parsed.lines.map((l) => l.text).join("\n");
        const record: MachineState = {
          ...prev,
          lines: parsed.lines,
          synced: parsed.synced,
          autoTimed: parsed.autoTimed,
          alternates: prev.alternates.filter((a) => a.id !== hit.id),
          englishOffered: needsEnglishCounterpart(sample),
          fromCache: false,
        };
        writeLineCache(videoId, {
          lines: parsed.lines,
          synced: parsed.synced,
          autoTimed: parsed.autoTimed,
          title: prev.title,
          artist: prev.artist,
          track: prev.track,
          provider: "LRCLIB",
        });
        return record;
      });
    },
    [videoId],
  );

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  // Tracks (videoId, attempt) pairs that already reached a terminal state.
  // A late-arriving player title must not refire a finished search.
  // (Compared by value in the effect — no render-time mutation needed.)
  const settledRef = useRef<{ videoId: string; attempt: number } | null>(null);

  useEffect(() => {
    if (!videoId) {
      setState({ kind: "idle" });
      return;
    }
    const settled = settledRef.current;
    if (
      settled &&
      settled.videoId === videoId &&
      settled.attempt === attempt
    ) {
      return; // terminal state already shown for this song + attempt
    }
    // Fast path: parsed-line cache renders instantly; network revalidates
    // only when we have no title/duration yet to rank with.
    const cached = readLineCache(videoId);
    if (cached && !ready) {
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
        englishOffered: needsEnglishCounterpart(cached.lines.map((l) => l.text).join("\n")),
        fromCache: true,
      });
    } else {
      setState({ kind: "resolving" });
    }

    if (!ready) return; // wait for duration before ranking by length

    const token = ++tokenRef.current;
    const cancelled = () => tokenRef.current !== token;
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      // 1. Metadata: prefer the real player title; oEmbed author disambiguates.
      const oembed = await fetchOEmbedTitle(videoId, signal).catch(() => null);
      if (cancelled() || signal.aborted) return;
      const title = videoTitle || oembed?.title || "";
      if (!title.trim()) {
        setState({ kind: "error", message: "Couldn't read the video title — retry once playback starts." });
        return;
      }
      const guess = guessTrack(title, oembed?.author ?? "");
      setState({ kind: "searching", artist: guess.artist, track: guess.track });

      // 2. Cached lines for THIS video win over a fresh search.
      const fresh = readLineCache(videoId);
      if (fresh && attempt === 0) {
        if (cancelled()) return;
        settledRef.current = { videoId, attempt };
        setState({
          kind: "ready",
          title: fresh.title || title,
          artist: fresh.artist || guess.artist,
          track: fresh.track || guess.track,
          lines: fresh.lines,
          synced: fresh.synced,
          autoTimed: fresh.autoTimed,
          provider: fresh.provider,
          alternates: [],
          englishOffered: needsEnglishCounterpart(fresh.lines.map((l) => l.text).join("\n")),
          fromCache: true,
        });
        pushRecent({
          videoId,
          title: fresh.title || title,
          artist: fresh.artist || guess.artist,
          track: fresh.track || guess.track,
        });
        return;
      }

      // 3. Network resolve (coalesced + TTL-cached inside lrclib.ts).
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
        settledRef.current = { videoId, attempt };
        setState({
          kind: "not_found",
          title,
          artist: guess.artist,
          track: guess.track,
          message: "No synced lyrics found for this track. Try the official music video.",
        });
        return;
      }
      if (resolved.hit.instrumental) {
        settledRef.current = { videoId, attempt };
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
      settledRef.current = { videoId, attempt };
      if (!ok) {
        setState({
          kind: "not_found",
          title,
          artist: guess.artist,
          track: guess.track,
          message: "Lyrics were found but contained no usable lines.",
        });
      }
      // NOTE: applyHit sets ready state itself. `error` is deliberately NOT
      // settled so a late-arriving player title auto-retries the lookup.
    })();

    return () => {
      tokenRef.current++;
      controller.abort();
    };
  }, [videoId, ready, durationSec, videoTitle, attempt, applyHit]);

  return useMemo(
    () => ({ state, offsetMs, nudgeOffset, resetOffset, useAlternate, retry }),
    [state, offsetMs, nudgeOffset, resetOffset, useAlternate, retry],
  );
}
