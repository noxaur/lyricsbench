import type { LyricLine, LyricWord, ParsedLyrics } from "../types/lyrics"

const LRC_LINE_HOUR = /^\[(\d{2}):(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)$/
const LRC_LINE_FRAC = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/
const LRC_LINE_NO_FRAC = /^\[(\d{2}):(\d{2})\](.*)$/
const LRC_OFFSET = /^\[offset:\s*([+-]?\d+)\s*\]$/i
const LRC_METADATA = /^\[(?:ar|ti|al|by|au|length|re|ve|la|tool|id|key|bpm|sign|sender|recipient|product|language):\s*/i
const SECTION_HEADER = /^\s*\[(Intro|Verse|Chorus|Pre-Chorus|Bridge|Hook|Outro|Guitar Solo|Instrumental|Break|Drop|Refrain)[^\]]*\]\s*$/i

function parseFractionalMs(frac: string): number {
  return frac.length === 2 ? Number(frac) * 10 : Number(frac.slice(0, 3).padEnd(3, "0"))
}

function parseTimestamp(min: string, sec: string, frac: string): number {
  return Number(min) * 60_000 + Number(sec) * 1000 + parseFractionalMs(frac)
}

function parseLrcLine(line: string): { startMs: number; text: string } | null {
  let match = line.match(LRC_LINE_HOUR)
  if (match) {
    const [, hour, min, sec, frac, text] = match
    const ms = frac ? parseFractionalMs(frac) : 0
    return {
      startMs: Number(hour) * 3_600_000 + Number(min) * 60_000 + Number(sec) * 1000 + ms,
      text: text.trim(),
    }
  }

  match = line.match(LRC_LINE_FRAC)
  if (match) {
    const [, min, sec, frac, text] = match
    return { startMs: parseTimestamp(min, sec, frac), text: text.trim() }
  }

  match = line.match(LRC_LINE_NO_FRAC)
  if (match) {
    const [, min, sec, text] = match
    return { startMs: Number(min) * 60_000 + Number(sec) * 1000, text: text.trim() }
  }

  return null
}

/**
 * Parses enhanced LRC word timestamps:
 * e.g. `<00:12.30> Hello <00:13.00> world <00:14.20>`
 */
export function parseWordTimings(rawText: string, lineStartMs: number, lineEndMs: number): LyricWord[] {
  const wordRegex = /<(\d{2}):(\d{2})(?:\.(\d{2,3}))?>([^<]+)/g
  const words: LyricWord[] = []
  let match: RegExpExecArray | null

  while ((match = wordRegex.exec(rawText)) !== null) {
    const [, min, sec, frac, text] = match
    const startMs = parseTimestamp(min, sec, frac || "0")
    words.push({
      startMs,
      endMs: 0,
      text: text.trim(),
    })
  }

  if (words.length === 0) return []

  // Finalize end times
  for (let i = 0; i < words.length; i++) {
    if (i < words.length - 1) {
      words[i].endMs = words[i + 1].startMs
    } else {
      words[i].endMs = Math.max(lineEndMs, words[i].startMs + 400)
    }
  }

  return words
}

export function parseLrc(
  lrc: string,
  durationSec = 0,
  manualOffsetMs = 0,
): ParsedLyrics {
  if (!lrc || !lrc.trim()) {
    return { lines: [], synced: false, autoTimed: false, rawText: lrc }
  }

  const durationMs = durationSec * 1000
  const rawLines = lrc.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  let fileOffsetMs = 0
  const candidateLines: { startMs: number; text: string; sectionLabel?: string }[] = []

  for (const line of rawLines) {
    const offsetMatch = line.match(LRC_OFFSET)
    if (offsetMatch) {
      fileOffsetMs = Number(offsetMatch[1]) || 0
      continue
    }

    if (LRC_METADATA.test(line)) continue

    const sectionMatch = line.match(SECTION_HEADER)
    if (sectionMatch) {
      candidateLines.push({
        startMs: candidateLines.length > 0 ? candidateLines[candidateLines.length - 1].startMs : 0,
        text: "",
        sectionLabel: sectionMatch[1],
      })
      continue
    }

    const parsed = parseLrcLine(line)
    if (parsed) {
      candidateLines.push(parsed)
    }
  }

  if (candidateLines.length === 0) {
    // If no timestamps matched, treat as plain lyrics
    return parsePlainLyrics(lrc, durationSec)
  }

  // Sort chronologically
  candidateLines.sort((a, b) => a.startMs - b.startMs)

  const effectiveOffset = fileOffsetMs + manualOffsetMs
  const lines: LyricLine[] = []

  for (let i = 0; i < candidateLines.length; i++) {
    const cur = candidateLines[i]
    const next = candidateLines[i + 1]

    const startMs = Math.max(0, cur.startMs + effectiveOffset)
    let endMs = next
      ? Math.max(startMs + 500, next.startMs + effectiveOffset)
      : durationMs > startMs
      ? durationMs
      : startMs + 4500

    const words = parseWordTimings(cur.text, startMs, endMs)
    const cleanText = words.length > 0 ? words.map((w) => w.text).join(" ") : cur.text

    lines.push({
      id: `line-${i}-${startMs}`,
      startMs,
      endMs,
      text: cleanText,
      words: words.length > 0 ? words : undefined,
      sectionLabel: cur.sectionLabel,
      kind: cur.sectionLabel && !cleanText ? "section" : "lyric",
    })
  }

  return {
    lines,
    synced: true,
    autoTimed: false,
    suggestedOffsetMs: fileOffsetMs,
    rawText: lrc,
  }
}

export function parsePlainLyrics(text: string, durationSec = 0): ParsedLyrics {
  const rawLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (rawLines.length === 0) {
    return { lines: [], synced: false, autoTimed: false, rawText: text }
  }

  const durationMs = durationSec > 0 ? durationSec * 1000 : rawLines.length * 4000
  const lines: LyricLine[] = []
  const slice = durationMs / Math.max(rawLines.length, 1)

  rawLines.forEach((lineText, idx) => {
    const isSection = SECTION_HEADER.test(lineText)
    const startMs = Math.round(idx * slice)
    const endMs = Math.round((idx + 1) * slice)

    if (isSection) {
      const match = lineText.match(SECTION_HEADER)
      lines.push({
        id: `sec-${idx}`,
        startMs,
        endMs,
        text: "",
        sectionLabel: match ? match[1] : lineText.replace(/[\[\]]/g, ""),
        kind: "section",
      })
    } else {
      lines.push({
        id: `plain-${idx}`,
        startMs,
        endMs,
        text: lineText,
        kind: "lyric",
      })
    }
  })

  return {
    lines,
    synced: false,
    autoTimed: durationSec > 0,
    rawText: text,
  }
}
