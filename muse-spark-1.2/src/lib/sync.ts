// Novel sync engine: explicit stage states, no scrollIntoView chasing,
// per-word progress that returns discrete wordIndex for AT, and
// gap-aware stage that prevents S1 long wipe.

import type { LyricLine } from "./lrc"
import { getFirstStart, getLastEnd, isInGap, SOFT_GAP_HOLD_MS } from "./lrc"

export type StageMode = "idle" | "intro" | "lyric" | "gap" | "outro"

export type StageState = {
  mode: StageMode
  activeIndex: number // -1 if none
  wordIndex: number
  progress: number // 0..1 within active line
  gapLabel?: string
}

function isSingable(l?: LyricLine): boolean {
  return !!l && l.kind !== "section" && l.text.trim().length > 0
}

function findIndexAt(lines: LyricLine[], t: number): number {
  let lo = 0, hi = lines.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lines[mid].startMs <= t) lo = mid + 1
    else hi = mid - 1
  }
  return lo - 1
}

export function getActiveIndex(lines: LyricLine[], timeMs: number, offsetMs: number): number {
  const t = timeMs + offsetMs
  if (lines.length === 0) return -1
  const first = getFirstStart(lines)
  if (first !== null && t < first) return -1
  if (isInGap(lines, t)) return -1
  let idx = findIndexAt(lines, t)
  while (idx >= 0 && !isSingable(lines[idx])) idx--
  if (idx < 0) return -1
  const line = lines[idx]
  if (t >= line.startMs && t < line.endMs) return idx
  // soft hold: gap <= 900ms keeps previous line active
  const next = lines[idx + 1]
  if (next && t >= line.endMs && t < next.startMs && next.startMs - line.endMs <= SOFT_GAP_HOLD_MS) return idx
  if (idx === lines.length - 1 && t >= line.startMs) return idx
  return -1
}

export function getWordProgress(line: LyricLine, timeMs: number): { wordIndex: number; progress: number } {
  if (line.kind === "section" || !line.text.trim()) return { wordIndex: -1, progress: 0 }
  if (timeMs >= line.endMs) return { wordIndex: line.words ? line.words.length - 1 : 0, progress: 1 }
  if (line.words && line.words.length > 0) {
    for (let i = 0; i < line.words.length; i++) {
      const w = line.words[i]
      if (timeMs < w.startMs) return { wordIndex: Math.max(0, i - 1), progress: 0 }
      if (timeMs >= w.startMs && timeMs < w.endMs) {
        const d = w.endMs - w.startMs
        const p = d > 0 ? (timeMs - w.startMs) / d : 1
        return { wordIndex: i, progress: Math.min(1, Math.max(0, p)) }
      }
    }
    return { wordIndex: line.words.length - 1, progress: 1 }
  }
  const dur = line.endMs - line.startMs
  if (dur <= 0) return { wordIndex: 0, progress: timeMs >= line.startMs ? 1 : 0 }
  const p = (timeMs - line.startMs) / dur
  return { wordIndex: 0, progress: Math.min(1, Math.max(0, p)) }
}

export function getStageState(lines: LyricLine[], timeMs: number, offsetMs: number, durationMs = 0): StageState {
  const t = timeMs + offsetMs
  if (lines.length === 0) return { mode: "idle", activeIndex: -1, wordIndex: -1, progress: 0 }
  const first = getFirstStart(lines)
  if (first !== null && t < first) return { mode: "intro", activeIndex: -1, wordIndex: -1, progress: 0, gapLabel: "♪ Intro ♪" }
  if (isInGap(lines, t)) return { mode: "gap", activeIndex: -1, wordIndex: -1, progress: 0, gapLabel: "♪ Instrumental ♪" }
  const lastEnd = getLastEnd(lines)
  if (lastEnd !== null && t >= lastEnd) {
    const outroWindow = durationMs > 0 ? Math.min(20000, durationMs * 0.12) : 15000
    if (durationMs <= 0 || durationMs - t <= outroWindow) {
      return { mode: "outro", activeIndex: -1, wordIndex: -1, progress: 0, gapLabel: "♪ Outro ♪" }
    }
    return { mode: "idle", activeIndex: -1, wordIndex: -1, progress: 0 }
  }
  const active = getActiveIndex(lines, timeMs, offsetMs)
  if (active < 0) return { mode: "idle", activeIndex: -1, wordIndex: -1, progress: 0 }
  const { wordIndex, progress } = getWordProgress(lines[active], t)
  return { mode: "lyric", activeIndex: active, wordIndex, progress }
}
