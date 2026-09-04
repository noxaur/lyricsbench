import type { LyricLine, LyricWord, ParsedLyrics } from "~/lib/types"

const STAMP = /\[([0-9]{1,3}(?::[0-9]{1,2}){1,2}(?:[.,][0-9]{1,3})?)\]/g
const WORD_STAMP = /<([0-9]{1,3}(?::[0-9]{1,2}){1,2}(?:[.,][0-9]{1,3})?)>([^<]*)/g

/** Parse the time forms commonly emitted by LRC and enhanced LRC writers. */
export function parseTimestamp(value: string): number | null {
  const parts = value.trim().replace(",", ".").split(":")
  if (parts.length < 2 || parts.length > 3) return null

  const numeric = (input: string) => {
    const result = Number(input)
    return Number.isFinite(result) && result >= 0 ? result : null
  }

  const last = numeric(parts.at(-1) ?? "")
  if (last === null) return null

  if (parts.length === 2) {
    const minutes = numeric(parts[0])
    if (minutes === null || last >= 60) return null
    return Math.round((minutes * 60 + last) * 1000)
  }

  const first = numeric(parts[0])
  const middle = numeric(parts[1])
  if (first === null || middle === null || middle >= 60) return null

  // [01:02:50] is often minute:second:centisecond. A fractional final
  // segment is unambiguously hour:minute:second.fraction.
  const finalPart = parts[2]
  if (!/[.,]/.test(finalPart) && /^\d{2}$/.test(finalPart) && last < 100) {
    return Math.round((first * 60 + middle + last / 100) * 1000)
  }
  if (last >= 60) return null
  return Math.round((first * 3600 + middle * 60 + last) * 1000)
}

function tag(line: string, name: string) {
  const match = line.match(new RegExp(`^\\[${name}\\s*:\\s*(.*?)\\]\\s*$`, "i"))
  return match?.[1]?.trim()
}

function enhancedWords(text: string, offsetMs: number): LyricWord[] | undefined {
  const words: LyricWord[] = []
  for (const found of text.matchAll(WORD_STAMP)) {
    const startMs = parseTimestamp(found[1])
    const word = found[2]
    if (startMs === null || !word) continue
    words.push({ text: word, startMs: Math.max(0, startMs + offsetMs) })
  }
  if (words.length < 2) return undefined
  return words.map((word, index) => ({
    ...word,
    endMs: words[index + 1]?.startMs,
  }))
}

function attachEnds(lines: Array<Omit<LyricLine, "endMs">>, durationMs: number) {
  return lines.map((line, index) => {
    const following = lines[index + 1]?.startMs
    const durationFallback = Math.min(durationMs || Infinity, line.startMs + 6_500)
    // A tiny guard keeps an adjacent line from finishing before it starts.
    const endMs = following ? Math.max(line.startMs + 80, following - 35) : durationFallback
    return { ...line, endMs: Math.max(line.startMs + 80, endMs) }
  })
}

/**
 * Parse an LRC file without assuming a particular provider's formatting.
 * It intentionally expands multi-stamped lines instead of losing a repeated
 * chorus, and keeps non-word-timed files useful through line-level progress.
 */
export function parseLrc(raw: string, durationMs = 0): ParsedLyrics {
  let offsetMs = 0
  let title: string | undefined
  let artist: string | undefined
  const lines: Array<Omit<LyricLine, "endMs"> & { order: number }> = []
  let order = 0

  for (const sourceLine of raw.replace(/\r/g, "").split("\n")) {
    const offset = tag(sourceLine, "offset")
    if (offset !== undefined) {
      const parsed = Number(offset)
      if (Number.isFinite(parsed)) offsetMs = Math.round(parsed)
      continue
    }
    title ??= tag(sourceLine, "ti")
    artist ??= tag(sourceLine, "ar")

    const stamps = [...sourceLine.matchAll(STAMP)]
    if (stamps.length === 0) continue
    const body = sourceLine.replace(STAMP, "").trim()
    if (!body) continue
    const words = enhancedWords(body, offsetMs)
    const text = body.replace(WORD_STAMP, "$2").replace(/\s+/g, " ").trim()
    if (!text) continue

    for (const stamp of stamps) {
      const start = parseTimestamp(stamp[1])
      if (start === null) continue
      lines.push({
        id: `${Math.max(0, start + offsetMs)}-${order}`,
        startMs: Math.max(0, start + offsetMs),
        text,
        words,
        order: order++,
      })
    }
  }

  const sorted = lines
    .sort((a, b) => a.startMs - b.startMs || a.order - b.order)
    .map(({ order: _order, ...line }) => line)
  const deduped = sorted.filter((line, index) => {
    const previous = sorted[index - 1]
    return !previous || previous.startMs !== line.startMs || previous.text !== line.text
  })

  return {
    lines: attachEnds(deduped, durationMs),
    synced: deduped.length > 0,
    autoTimed: false,
    title,
    artist,
    offsetMs,
  }
}

/** Make a plain transcription readable rather than pretending it is perfectly synced. */
export function parsePlainLyrics(raw: string, durationMs: number): ParsedLyrics {
  const textLines = raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  if (textLines.length === 0) {
    return { lines: [], synced: false, autoTimed: false, offsetMs: 0 }
  }

  const safeDuration = Math.max(durationMs, textLines.length * 2_500)
  const start = Math.min(7_000, Math.round(safeDuration * 0.055))
  const end = Math.max(start + textLines.length * 1_600, safeDuration - Math.min(7_000, safeDuration * 0.055))
  const weights = textLines.map((line) => Math.max(1, Array.from(line).length / 12))
  const totalWeight = weights.reduce((total, weight) => total + weight, 0)
  let cursor = start
  const rawLines: Array<Omit<LyricLine, "endMs">> = textLines.map((text, index) => {
    const line = { id: `plain-${index}`, startMs: Math.round(cursor), text }
    cursor += ((end - start) * weights[index]) / totalWeight
    return line
  })

  return {
    lines: attachEnds(rawLines, safeDuration),
    synced: false,
    autoTimed: true,
    offsetMs: 0,
  }
}

export function currentLineIndex(lines: LyricLine[], timeMs: number) {
  let low = 0
  let high = lines.length - 1
  let result = -1
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    if (lines[middle].startMs <= timeMs) {
      result = middle
      low = middle + 1
    } else {
      high = middle - 1
    }
  }
  return result
}

export function lineProgress(line: LyricLine | undefined, timeMs: number) {
  if (!line) return 0
  const span = Math.max(1, line.endMs - line.startMs)
  return Math.max(0, Math.min(1, (timeMs - line.startMs) / span))
}
