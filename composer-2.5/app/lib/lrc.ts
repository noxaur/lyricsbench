import type { LyricLine, LyricWord, ParsedLyrics } from "./types"

const LRC_STAMP = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d{2,3}))?\]/g
const LRC_OFFSET = /^\[offset:\s*([+-]?\d+)\s*\]$/i
const LRC_META = /^\[(?:ar|ti|al|by|au|length|re|ve|la|tool|id|key|bpm|sign|language):\s*/i
const WORD_TAG = /<(\d{2}):(\d{2})\.(\d{2,3})>([^<]*)/g
const GAP_CAP_MS = 2500
const MAX_LINE_MS = 5500

function fracMs(frac?: string): number {
  if (!frac) return 0
  return frac.length === 2 ? Number(frac) * 10 : Number(frac)
}

/**
 * Parse LRC timestamps. Handles [mm:ss], [mm:ss.xx], [mm:ss:cs], and [hh:mm:ss.xx].
 * The third colon group is centiseconds when the minute field is < 60 and there is no
 * fractional part; otherwise it is seconds in an [hh:mm:ss] stamp.
 */
function stampToMs(min: string, sec: string, third: string | undefined, frac: string | undefined): number {
  const minutes = Number(min)
  const seconds = Number(sec)
  const f = fracMs(frac)

  if (third !== undefined) {
    const t = Number(third)
    if (frac !== undefined) {
      return minutes * 3_600_000 + seconds * 60_000 + t * 1000 + f
    }
    if (minutes > 59) {
      return minutes * 3_600_000 + seconds * 60_000 + t * 1000 + f
    }
    return minutes * 60_000 + seconds * 1000 + t * 10 + f
  }

  return minutes * 60_000 + seconds * 1000 + f
}

function parseEnhancedWords(text: string, lineEnd: number): { text: string; words?: LyricWord[] } {
  if (!/<\d{2}:\d{2}\.\d{2,3}>/.test(text)) return { text: text.trim() }
  const words: LyricWord[] = []
  WORD_TAG.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = WORD_TAG.exec(text)) !== null) {
    const startMs = Number(match[1]) * 60_000 + Number(match[2]) * 1000 + fracMs(match[3])
    const word = match[4].trim()
    if (word) words.push({ text: word, startMs, endMs: startMs + 400 })
  }
  if (words.length === 0) return { text: text.replace(/<\d{2}:\d{2}\.\d{2,3}>/g, "").trim() }
  for (let i = 0; i < words.length - 1; i++) words[i].endMs = words[i + 1].startMs
  words[words.length - 1].endMs = lineEnd
  return { text: words.map((w) => w.text).join(" "), words }
}

function capEnds(lines: LyricLine[]): LyricLine[] {
  return lines.map((line, i) => {
    if (line.kind === "section" || !line.text.trim()) return line
    const next = lines.slice(i + 1).find((l) => l.kind !== "section")
    if (!next) return line
    const gap = next.startMs - line.endMs
    if (gap <= GAP_CAP_MS) return { ...line, endMs: next.startMs }
    const capped = line.startMs + Math.min(Math.max(gap * 0.45, 1200), MAX_LINE_MS)
    return { ...line, endMs: capped }
  })
}

function scaleIfNeeded(lines: LyricLine[], durationMs: number): LyricLine[] {
  if (durationMs <= 0 || lines.length === 0) return lines
  const last = [...lines].reverse().find((l) => l.kind !== "section" && l.text.trim())
  if (!last) return lines
  if (last.startMs <= durationMs) return lines
  const scale = (durationMs * 0.97) / Math.max(last.startMs, 1)
  return lines.map((line) => ({
    ...line,
    startMs: Math.round(line.startMs * scale),
    endMs: Math.round(line.endMs * scale),
    words: line.words?.map((w) => ({
      ...w,
      startMs: Math.round(w.startMs * scale),
      endMs: Math.round(w.endMs * scale),
    })),
  }))
}

export function parseLrc(raw: string, durationMs = 0): ParsedLyrics {
  const rows = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  let fileOffset = 0
  const collected: Array<{ startMs: number; text: string }> = []

  for (const row of rows) {
    const offset = row.match(LRC_OFFSET)
    if (offset) {
      fileOffset = Number(offset[1])
      continue
    }
    if (LRC_META.test(row)) continue

    const stamps: number[] = []
    let cursor = 0
    LRC_STAMP.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = LRC_STAMP.exec(row)) !== null) {
      if (match.index !== cursor) break
      const startMs = stampToMs(match[1], match[2], match[3], match[4])
      stamps.push(startMs + fileOffset)
      cursor = match.index + match[0].length
    }
    if (stamps.length === 0) continue
    const text = row.slice(cursor).trim()
    if (!text) continue
    for (const startMs of stamps) collected.push({ startMs: Math.max(0, startMs), text })
  }

  collected.sort((a, b) => a.startMs - b.startMs)
  let lines: LyricLine[] = collected.map((entry, i) => {
    const next = collected[i + 1]
    const endMs = next ? next.startMs : durationMs > 0 ? durationMs : entry.startMs + 5000
    const parsed = parseEnhancedWords(entry.text, endMs)
    return {
      startMs: entry.startMs,
      endMs,
      text: parsed.text,
      kind: "lyric" as const,
      words: parsed.words,
    }
  })

  lines = scaleIfNeeded(lines, durationMs)
  lines = capEnds(lines)
  return { lines, synced: lines.length > 0, autoTimed: false }
}

function lineWeight(text: string): number {
  const cjk = text.match(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/g)?.length ?? 0
  const rest = text.replace(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/g, "").length
  return Math.max(1, cjk * 1.6 + rest)
}

export function parsePlainLyrics(raw: string, durationMs: number): ParsedLyrics {
  const rows = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !LRC_META.test(l) && !LRC_OFFSET.test(l))
  if (rows.length === 0) return { lines: [], synced: false, autoTimed: false }

  const vocalMs = Math.max(durationMs * 0.87, rows.length * 1400)
  const introMs = durationMs > 0 ? Math.min(durationMs * 0.08, 12_000) : 1500
  const weights = rows.map(lineWeight)
  const total = weights.reduce((sum, w) => sum + w, 0)
  let cursor = introMs
  const lines: LyricLine[] = rows.map((text, i) => {
    const span = Math.min(11_000, Math.max(1200, (weights[i] / total) * vocalMs))
    const startMs = Math.round(cursor)
    const endMs = Math.round(cursor + span)
    cursor += span
    return { startMs, endMs, text, kind: "lyric" as const }
  })
  return { lines, synced: false, autoTimed: true }
}

export function parseLyricsText(raw: string, durationMs: number): ParsedLyrics | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const lrc = parseLrc(trimmed, durationMs)
  if (lrc.lines.length > 0) return lrc
  const plain = parsePlainLyrics(trimmed, durationMs)
  return plain.lines.length > 0 ? plain : null
}
