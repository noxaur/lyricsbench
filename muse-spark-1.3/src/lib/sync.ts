/**
 * Pure lyric-sync functions. No React, no store — trivially testable.
 *
 * Novel vs previous generation: the old sync-engine spread gap logic across
 * gap-detection.ts + sync-engine.ts with slightly different "is in gap"
 * definitions, so the stage could show "Instrumental" while the highlight
 * still marked a line active. Here there is ONE definition of active.
 */

import type { LyricLine } from "./lrc";

export const SOFT_GAP_HOLD_MS = 1_500;
export const HARD_GAP_MS = 8_000;

export type StageMode = "idle" | "intro" | "lyric" | "gap" | "outro";

export interface StageState {
  mode: StageMode;
  activeIndex: number;
  wordIndex: number;
  wordProgress: number;
  gapLabel: string | null;
}

function isSingable(line: LyricLine | undefined): line is LyricLine {
  return Boolean(line && line.text.trim().length > 0);
}

/** Binary search: last index with startMs <= t. -1 when none. */
export function indexAtTime(lines: LyricLine[], t: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const line = lines[mid] as LyricLine;
    if (line.startMs <= t) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

/**
 * Single source of truth for "which line is active at t (incl. offset)".
 * - Before first singable line → -1 (caller shows intro)
 * - Inside [startMs, endMs) of a singable line → its index
 * - Within SOFT_GAP_HOLD_MS after a line ends → hold that line (karaoke feel)
 * - Otherwise → -1 (caller shows gap/outro)
 */
export function activeIndexAt(lines: LyricLine[], timeMs: number, offsetMs: number): number {
  if (lines.length === 0) return -1;
  const t = timeMs + offsetMs;
  const idx = indexAtTime(lines, t);
  if (idx < 0) return -1;

  // Walk back over section labels / empties to the singable line.
  let singable = idx;
  while (singable >= 0 && !isSingable(lines[singable])) singable--;
  if (singable < 0) return -1;
  const line = lines[singable] as LyricLine;

  if (t < line.startMs) return -1;
  if (t < line.endMs) return singable;
  // Hold briefly so short instrumental breaths don't blank the stage.
  // The final line uses the same window, then releases so the stage can
  // show outro/idle instead of a stuck highlight.
  if (t - line.endMs <= SOFT_GAP_HOLD_MS) return singable;
  return -1;
}

/** 0..1 progress of the karaoke wipe for the active line. */
export function lineProgress(line: LyricLine, timeMs: number, offsetMs: number): number {
  const t = timeMs + offsetMs;
  const span = line.endMs - line.startMs;
  if (span <= 0) return t >= line.startMs ? 1 : 0;
  return Math.min(1, Math.max(0, (t - line.startMs) / span));
}

/** Word-level progress when the line carries word timings. */
export function wordProgressAt(
  line: LyricLine,
  timeMs: number,
  offsetMs: number,
): { wordIndex: number; progress: number } {
  const t = timeMs + offsetMs;
  const words = line.words;
  if (!words || words.length === 0) return { wordIndex: -1, progress: lineProgress(line, timeMs, offsetMs) };
  if (t >= line.endMs) return { wordIndex: words.length - 1, progress: 1 };
  for (let i = 0; i < words.length; i++) {
    const w = words[i] as { startMs: number; endMs: number };
    if (t < w.startMs) return { wordIndex: Math.max(0, i - 1), progress: 0 };
    if (t < w.endMs) {
      const span = w.endMs - w.startMs;
      return { wordIndex: i, progress: span > 0 ? (t - w.startMs) / span : 1 };
    }
  }
  return { wordIndex: words.length - 1, progress: 1 };
}

export function stageAt(
  lines: LyricLine[],
  timeMs: number,
  offsetMs: number,
  durationMs = 0,
): StageState {
  const idle: StageState = { mode: "idle", activeIndex: -1, wordIndex: -1, wordProgress: 0, gapLabel: null };
  if (lines.length === 0) return idle;
  const t = timeMs + offsetMs;

  const first = lines.find(isSingable);
  if (first && t < first.startMs) {
    return { ...idle, mode: "intro", gapLabel: "♪ Intro ♪" };
  }

  const active = activeIndexAt(lines, timeMs, offsetMs);
  if (active >= 0) {
    const line = lines[active] as LyricLine;
    const { wordIndex, progress } = wordProgressAt(line, timeMs, offsetMs);
    return { mode: "lyric", activeIndex: active, wordIndex, wordProgress: progress, gapLabel: null };
  }

  const last = [...lines].reverse().find(isSingable);
  if (last && t >= last.endMs) {
    const outroWindow = durationMs > 0 ? Math.min(20_000, durationMs * 0.12) : 15_000;
    if (durationMs <= 0 || durationMs - t <= outroWindow) {
      return { ...idle, mode: "outro", gapLabel: "♪ Outro ♪" };
    }
    return idle;
  }

  // Genuine mid-song gap: label by length so short breaths read differently.
  const idx = indexAtTime(lines, t);
  const next = idx + 1 < lines.length ? (lines[idx + 1] as LyricLine) : null;
  const prev = idx >= 0 ? (lines[idx] as LyricLine) : null;
  const gapLen = prev && next ? next.startMs - prev.endMs : 0;
  return {
    ...idle,
    mode: "gap",
    gapLabel: gapLen >= HARD_GAP_MS ? "♪ Instrumental ♪" : "♪",
  };
}
