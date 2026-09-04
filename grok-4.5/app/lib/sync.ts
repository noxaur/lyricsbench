import type { LyricLine, StagePhase, StageState } from "./types"

/** Short pauses keep the previous line lit. Longer gaps enter the gap phase. */
export const HOLD_MS = 2800

function isVocal(line: LyricLine | undefined): line is LyricLine {
  return Boolean(line && line.kind !== "section" && line.text.trim())
}

function lastStartedIndex(lines: LyricLine[], timeMs: number): number {
  let lo = 0
  let hi = lines.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (lines[mid].startMs <= timeMs) lo = mid + 1
    else hi = mid - 1
  }
  let idx = lo - 1
  while (idx >= 0 && !isVocal(lines[idx])) idx -= 1
  return idx
}

function nextVocal(lines: LyricLine[], from: number): LyricLine | undefined {
  for (let i = from + 1; i < lines.length; i++) {
    if (isVocal(lines[i])) return lines[i]
  }
  return undefined
}

export function getActiveLineIndex(lines: LyricLine[], timeMs: number, offsetMs = 0): number {
  if (lines.length === 0) return -1
  const t = timeMs + offsetMs
  const first = lines.find(isVocal)
  if (!first || t < first.startMs) return -1
  return lastStartedIndex(lines, t)
}

/**
 * Phase machine for the lyric stage.
 *
 * - preamble: before first vocal — show an intro cue, no fake wipe
 * - active: inside the line window — wipe only when word tags exist
 * - hold: past endMs but next line is close — keep line lit, progress = 1
 * - gap: long instrumental — keep index for scroll, but stop wiping
 */
export function getStageState(lines: LyricLine[], timeMs: number, offsetMs = 0): StageState {
  const t = timeMs + offsetMs
  const first = lines.find(isVocal)
  if (!first || lines.length === 0) {
    return { activeIndex: -1, phase: "preamble", progress: 0, wordIndex: -1, wipe: false }
  }
  if (t < first.startMs) {
    return { activeIndex: -1, phase: "preamble", progress: 0, wordIndex: -1, wipe: false }
  }

  const activeIndex = lastStartedIndex(lines, t)
  if (activeIndex < 0) {
    return { activeIndex: -1, phase: "preamble", progress: 0, wordIndex: -1, wipe: false }
  }

  const line = lines[activeIndex]
  const next = nextVocal(lines, activeIndex)
  const hasWords = Boolean(line.words?.length)

  if (t <= line.endMs) {
    if (!hasWords) {
      return { activeIndex, phase: "active", progress: 1, wordIndex: -1, wipe: false }
    }
    return wordState(line, t, activeIndex)
  }

  const untilNext = next ? next.startMs - t : Number.POSITIVE_INFINITY
  const phase: StagePhase = untilNext <= HOLD_MS ? "hold" : "gap"
  return {
    activeIndex,
    phase,
    progress: 1,
    wordIndex: hasWords ? (line.words!.length - 1) : -1,
    wipe: false,
  }
}

function wordState(line: LyricLine, t: number, activeIndex: number): StageState {
  const words = line.words!
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    if (t < word.startMs) {
      return {
        activeIndex,
        phase: "active",
        progress: i / words.length,
        wordIndex: Math.max(0, i - 1),
        wipe: true,
      }
    }
    if (t < word.endMs) {
      const dur = word.endMs - word.startMs
      const wp = dur > 0 ? (t - word.startMs) / dur : 1
      return {
        activeIndex,
        phase: "active",
        progress: (i + wp) / words.length,
        wordIndex: i,
        wipe: true,
      }
    }
  }
  return {
    activeIndex,
    phase: "active",
    progress: 1,
    wordIndex: words.length - 1,
    wipe: true,
  }
}
