import type { LyricLine, LyricWord, ParsedLyrics } from "./types"

const LRC_STAMP = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d{2,3}))?\]/g
const LRC_OFFSET = /^\[offset:\s*([+-]?\d+)\s*\]$/i
const LRC_META = /^\[(?:ar|ti|al|by|au|length|re|ve|la|tool|id|key|bpm|sign|language):\s*/i
const SECTION_RE = /^\[(verse|chorus|bridge|intro|outro|pre-?chorus|hook|refrain|interlude|instrumental)[^\]]*\]$/i
const WORD_TAG = /<(\d{2}):(\d{2})\.(\d{2,3})>([^<]*)/g
const GAP_CAP_MS = 2500
const MAX_LINE_MS = 5500

function fracMs(frac?: string): number {
  if (!frac) return 0
  return frac.length === 2 ? Number(frac) * 10 : Number(frac)
}

function stampToMs(min: string, sec: string, hour: string | undefined, frac: string | undefined): number {
  if (hour) {
    return Number(min) * 3_600_000 + Number(sec) * 60_000 + Number(hour) * 1000 + fracMs(frac)
  }
  return Number(min) * 60_000 + Number(sec) * 1000 + fracMs(frac)
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
    const next = lines.slice(i + 1).find((l) => l.kind !== "section" && l.text.trim())
    if (!next) return line
    const gap = next.startMs - line.startMs
    const naturalEnd = next.startMs
    if (naturalEnd - line.startMs <= MAX_LINE_MS + GAP_CAP_MS) {
      return { ...line, endMs: Math.min(naturalEnd, line.startMs + MAX_LINE_MS) }
    }
    // Long instrumental ahead: cap the wipe window, leave a real gap for the phase machine.
    const capped = line.startMs + Math.min(Math.max(gap * 0.2, 1400), MAX_LINE_MS)
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
  const collected: Array<{ startMs: number; text: string; section?: string }> = []

  for (const row of rows) {
    const offset = row.match(LRC_OFFSET)
    if (offset) {
      fileOffset = Number(offset[1])
      continue
    }
    if (LRC_META.test(row)) continue
    if (SECTION_RE.test(row)) {
      const label = row.replace(/^\[|\]$/g, "")
      collected.push({ startMs: collected.at(-1)?.startMs ?? 0, text: "", section: label })
      continue
    }

    const stamps: number[] = []
    let cursor = 0
    LRC_STAMP.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = LRC_STAMP.exec(row)) !== null) {
      if (match.index !== cursor) break
      stamps.push(stampToMs(match[1], match[2], match[3], match[4]) + fileOffset)
      cursor = match.index + match[0].length
    }
    if (stamps.length === 0) continue
    const text = row.slice(cursor).trim()
    if (!text) continue
    for (const startMs of stamps) collected.push({ startMs: Math.max(0, startMs), text })
  }

  collected.sort((a, b) => a.startMs - b.startMs || (a.section ? -1 : 1))
  let lines: LyricLine[] = collected.map((entry, i) => {
    if (entry.section) {
      return {
        startMs: entry.startMs,
        endMs: entry.startMs,
        text: "",
        kind: "section" as const,
        sectionLabel: entry.section,
      }
    }
    const next = collected.slice(i + 1).find((e) => !e.section)
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
  return { lines, synced: lines.some((l) => l.kind !== "section"), autoTimed: false }
}

function lineWeight(text: string): number {
  const cjk = text.match(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/g)?.length ?? 0
  const rest = text.replace(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/g, "").length
  return Math.max(1, cjk * 1.6 + rest)
}

/**
 * Auto-time plain lyrics with paragraph pauses and shared chorus durations.
 * Blank lines borrow pause budget from the vocal window. Identical lines
 * (typical chorus repeats) share the same per-line span.
 */
export function parsePlainLyrics(raw: string, durationMs: number): ParsedLyrics {
  const paragraphs = raw
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .reduce<string[][]>((acc, row) => {
      if (!row.trim() || LRC_META.test(row.trim()) || LRC_OFFSET.test(row.trim())) {
        if (acc.length && acc[acc.length - 1].length) acc.push([])
        return acc
      }
      if (SECTION_RE.test(row.trim())) return acc
      if (!acc.length) acc.push([])
      acc[acc.length - 1].push(row.trim())
      return acc
    }, [])
    .filter((p) => p.length > 0)

  const rows = paragraphs.flat()
  if (rows.length === 0) return { lines: [], synced: false, autoTimed: false }

  const duration = durationMs > 0 ? durationMs : rows.length * 2800 + 8000
  const introMs = Math.min(duration * 0.08, 12_000)
  const outroMs = Math.min(duration * 0.05, 8_000)
  const pauseBudget = Math.min(duration * 0.08, paragraphs.length * 1800)
  const pauseEach = paragraphs.length > 1 ? pauseBudget / (paragraphs.length - 1) : 0
  const vocalMs = Math.max(duration - introMs - outroMs - pauseBudget, rows.length * 1200)

  // Chorus sharing: identical text gets the same span (median of weight-based spans).
  const weights = rows.map(lineWeight)
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  const rawSpan = weights.map((w) => Math.min(11_000, Math.max(1200, (w / totalWeight) * vocalMs)))
  const byText = new Map<string, number[]>()
  rows.forEach((text, i) => {
    const key = text.toLowerCase()
    const list = byText.get(key) ?? []
    list.push(rawSpan[i])
    byText.set(key, list)
  })
  const shared = new Map<string, number>()
  for (const [key, spans] of byText) {
    spans.sort((a, b) => a - b)
    shared.set(key, spans[Math.floor(spans.length / 2)])
  }

  let cursor = introMs
  const lines: LyricLine[] = []
  let rowIndex = 0
  for (let p = 0; p < paragraphs.length; p++) {
    if (p > 0) cursor += pauseEach
    for (const text of paragraphs[p]) {
      const span = shared.get(text.toLowerCase()) ?? rawSpan[rowIndex]
      const startMs = Math.round(cursor)
      const endMs = Math.round(cursor + span)
      lines.push({ startMs, endMs, text, kind: "lyric" })
      cursor += span
      rowIndex += 1
    }
  }

  return { lines, synced: false, autoTimed: true }
}

export function parseLyricsText(raw: string, durationMs: number): ParsedLyrics | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const lrc = parseLrc(trimmed, durationMs)
  if (lrc.lines.some((l) => l.kind !== "section" && l.text.trim())) return lrc
  const plain = parsePlainLyrics(trimmed, durationMs)
  return plain.lines.length > 0 ? plain : null
}
