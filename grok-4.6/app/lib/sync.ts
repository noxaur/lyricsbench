import type { LyricLine } from "./types"

export type StageState = {
  activeIndex: number
  progress: number
  wordIndex: number
}

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

/**
 * Keep the last started line until the next one begins.
 * Long instrumental gaps hold the previous lyric instead of blanking the stage.
 */
export function getActiveLineIndex(lines: LyricLine[], timeMs: number, offsetMs = 0): number {
  if (lines.length === 0) return -1
  const t = timeMs + offsetMs
  const first = lines.find(isVocal)
  if (!first || t < first.startMs) return -1
  return lastStartedIndex(lines, t)
}

export function getLineProgress(line: LyricLine, timeMs: number): number {
  if (timeMs >= line.endMs) return 1
  if (timeMs <= line.startMs) return 0
  const duration = line.endMs - line.startMs
  if (duration <= 0) return 1
  return Math.min(1, Math.max(0, (timeMs - line.startMs) / duration))
}

export function getStageState(lines: LyricLine[], timeMs: number, offsetMs = 0): StageState {
  const t = timeMs + offsetMs
  const activeIndex = getActiveLineIndex(lines, timeMs, offsetMs)
  if (activeIndex < 0) return { activeIndex: -1, progress: 0, wordIndex: -1 }

  const line = lines[activeIndex]
  const progress = getLineProgress(line, t)
  if (!line.words?.length) return { activeIndex, progress, wordIndex: 0 }

  for (let i = 0; i < line.words.length; i++) {
    const word = line.words[i]
    if (t < word.startMs) return { activeIndex, progress, wordIndex: Math.max(0, i - 1) }
    if (t < word.endMs) {
      const dur = word.endMs - word.startMs
      const wp = dur > 0 ? (t - word.startMs) / dur : 1
      const lineP = (i + wp) / line.words.length
      return { activeIndex, progress: lineP, wordIndex: i }
    }
  }
  return { activeIndex, progress: 1, wordIndex: line.words.length - 1 }
}
