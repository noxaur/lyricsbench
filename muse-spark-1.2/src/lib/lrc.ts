// Novel LRC pipeline: single file, explicit error union, word-level support,
// capped gap handling to fix S1 slow-wipe bug.
// Old spread parsing across 4 files (lrc-parser, calibration, gap-detection, plain-timing) -> now unified.

export type LyricWord = { text: string; startMs: number; endMs: number }
export type LyricLine = {
  startMs: number
  endMs: number
  text: string
  words?: LyricWord[]
  sectionLabel?: string
  kind: "lyric" | "section"
}

export type ParsedLyrics = {
  lines: LyricLine[]
  synced: boolean
  autoTimed: boolean
  suggestedOffsetMs?: number
}

// --- constants ---
const GAP_CAP_MS = 8_000 // cap each line to max 8s to prevent long instrumental wipe (S1)
const GAP_THRESHOLD_MS = 6_000 // gaps larger than this -> gap placeholder, not held highlight
export const SOFT_GAP_HOLD_MS = 900

// --- regex ---
const LRC_OFFSET_RE = /^\[offset:\s*([+-]?\d+)\s*\]$/i
const LRC_META_RE = /^\[(?:ti|ar|al|by|offset|length|re|ve):/i
const LRC_TS_RE = /\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]/g
const WORD_TS_RE = /<(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?>/g

function parseFrac(f: string): number {
  return f.length === 2 ? Number(f) * 10 : Number(f)
}

function parseWordMs(min: string, sec: string, frac?: string): number {
  return Number(min) * 60_000 + Number(sec) * 1000 + (frac ? parseFrac(frac) : 0)
}

function extractEnhancedWords(text: string, fallbackStart: number, fallbackEnd: number): { cleaned: string; words: LyricWord[] } | null {
  const matches = [...text.matchAll(WORD_TS_RE)]
  if (matches.length === 0) return null
  // Example: "<00:01.20>hello <00:01.50>world"
  const parts: Array<{ text: string; startMs: number }> = []
  let lastIdx = 0
  let lastMs = fallbackStart
  for (const m of matches) {
    const full = m[0]
    const idx = m.index ?? 0
    const before = text.slice(lastIdx, idx).trim()
    // text before this timestamp belongs to previous word? Actually enhanced LRC puts ts before word.
    // We'll attach following text as word.
    void before
    const ms = parseWordMs(m[1], m[2], m[3])
    lastMs = ms
    lastIdx = idx + full.length
    // collect word text until next timestamp
    const nextIdx = text.indexOf("<", lastIdx)
    const wordText = (nextIdx === -1 ? text.slice(lastIdx) : text.slice(lastIdx, nextIdx)).trim()
    if (wordText) parts.push({ text: wordText, startMs: lastMs })
    if (nextIdx === -1) break
    lastIdx = nextIdx // will be handled next loop, but we already consumed; simpler: let loop handle
  }
  // If no words extracted, fallback
  if (parts.length === 0) return null
  const cleaned = parts.map((p) => p.text).join(" ")
  const words: LyricWord[] = parts.map((p, i) => ({
    text: p.text,
    startMs: p.startMs,
    endMs: i + 1 < parts.length ? parts[i + 1].startMs : fallbackEnd,
  }))
  return { cleaned, words }
}

function capEndTimes(lines: LyricLine[]): LyricLine[] {
  return lines.map((l, i) => {
    if (l.kind === "section") return l
    const next = lines[i + 1]
    if (!next || next.kind === "section") return l
    const capped = Math.min(next.startMs, l.startMs + GAP_CAP_MS)
    if (capped < l.endMs) return { ...l, endMs: capped }
    // also ensure gap threshold: if next is far, don't extend to next, cap at start+ GAP_CAP
    if (next.startMs - l.startMs > GAP_CAP_MS) {
      return { ...l, endMs: l.startMs + GAP_CAP_MS }
    }
    return l
  })
}

export function parseLrc(raw: string, durationMs = 0): ParsedLyrics | null {
  const linesRaw = raw.split("\n").map((l) => l.trim()).filter(Boolean)
  let offsetMs = 0
  const entries: Array<{ startMs: number; text: string }> = []

  for (const line of linesRaw) {
    const off = line.match(LRC_OFFSET_RE)
    if (off) { offsetMs = Number(off[1]); continue }
    if (LRC_META_RE.test(line)) continue
    // extract all timestamps on line (multiple timestamps -> multiple entries with same text)
    const timestamps = [...line.matchAll(LRC_TS_RE)]
    if (timestamps.length === 0) continue
    const text = line.replace(LRC_TS_RE, "").trim()
    // skip empty instrumental lines? keep if we want gap, but old kept only non-empty for vocal; we keep for timing but filter later
    for (const m of timestamps) {
      const ms = parseWordMs(m[1], m[2], m[3])
      entries.push({ startMs: ms, text })
    }
  }

  if (entries.length === 0) return null

  entries.sort((a, b) => a.startMs - b.startMs)

  // apply offset (LRC offset is inverted: positive offset means lyrics earlier)
  const shifted = entries.map((e) => ({ ...e, startMs: Math.max(0, e.startMs - offsetMs) }))

  // build LyricLine[] with endMs = next.startMs, section detection
  const lines: LyricLine[] = []
  for (let i = 0; i < shifted.length; i++) {
    const cur = shifted[i]
    const next = shifted[i + 1]
    const trimmed = cur.text.trim()
    // Detect section labels like "[Chorus]" or "Chorus:" inside brackets - treat as section if only label
    const isSection = /^[\[\(【].*[\]\)】]$/.test(trimmed) && trimmed.length < 30
    if (isSection) {
      lines.push({ startMs: cur.startMs, endMs: cur.startMs, text: "", sectionLabel: trimmed.replace(/^[\[\(【]|[\]\)】]$/g, "").trim(), kind: "section" })
      continue
    }
    if (!trimmed) continue
    const endMs = next ? next.startMs : durationMs > 0 ? durationMs : cur.startMs + 5_000
    // Try enhanced words
    const enhanced = extractEnhancedWords(cur.text, cur.startMs, endMs)
    if (enhanced) {
      lines.push({ startMs: cur.startMs, endMs, text: enhanced.cleaned, words: enhanced.words, kind: "lyric" })
    } else {
      lines.push({ startMs: cur.startMs, endMs, text: trimmed, kind: "lyric" })
    }
  }

  let calibrated = capEndTimes(lines)
  // finalize word timings clamp
  calibrated = calibrated.map((l) => {
    if (!l.words?.length) return l
    const words = l.words.map((w) => ({ ...w }))
    for (let i = 0; i < words.length - 1; i++) words[i].endMs = Math.min(words[i + 1].startMs, l.endMs)
    words[words.length - 1].endMs = l.endMs
    return { ...l, words }
  })

  // calibrate intro if first vocal is very late (>25% duration) -> suggest offset
  let suggested: number | undefined
  if (durationMs > 0 && calibrated.length > 0) {
    const firstVocal = calibrated.find((l) => l.kind === "lyric")
    if (firstVocal && firstVocal.startMs > durationMs * 0.25) {
      const cap = Math.min(durationMs * 0.12, firstVocal.startMs * 0.35)
      const shift = firstVocal.startMs - cap
      if (shift > 800) suggested = -Math.round(Math.min(5000, shift * 0.4))
    }
    // also if last vocal starts after 97% duration, scale
    const lastVocal = [...calibrated].reverse().find((l) => l.kind === "lyric")
    if (lastVocal && lastVocal.startMs > durationMs * 0.97) {
      const scale = (durationMs * 0.97) / lastVocal.startMs
      calibrated = calibrated.map((l) => ({
        ...l,
        startMs: Math.round(l.startMs * scale),
        endMs: Math.round(l.endMs * scale),
        words: l.words?.map((w) => ({ ...w, startMs: Math.round(w.startMs * scale), endMs: Math.round(w.endMs * scale) })),
      }))
    }
  }

  if (calibrated.length === 0) return null
  return { lines: calibrated, synced: true, autoTimed: false, suggestedOffsetMs: suggested }
}

export function parsePlain(text: string, durationMs: number): ParsedLyrics {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  const flat: string[] = []
  for (const p of paragraphs) {
    for (const line of p.split("\n")) {
      const t = line.trim()
      if (t) flat.push(t)
    }
  }
  if (flat.length === 0) return { lines: [], synced: false, autoTimed: false }

  // Novel: weight-based timing vs old even splits. Short lines get less time.
  const weights = flat.map((l) => Math.max(1, l.split(/\s+/).length))
  const totalW = weights.reduce((a, b) => a + b, 0)
  const dur = durationMs > 0 ? durationMs : flat.length * 3000
  const intro = Math.min(dur * 0.08, 4000)
  const outro = Math.min(dur * 0.05, 2000)
  const singable = Math.max(1000, dur - intro - outro)

  let cursor = intro
  const lines: LyricLine[] = flat.map((t, i) => {
    const w = weights[i] / totalW
    const len = Math.round(singable * w)
    const start = Math.round(cursor)
    const end = i === flat.length - 1 ? Math.round(cursor + len) : Math.round(cursor + len)
    cursor += len
    return { startMs: start, endMs: end, text: t, kind: "lyric" as const }
  })

  return { lines, synced: false, autoTimed: true }
}

export function prepareLyricsText(raw: string): string {
  return raw.replace(/\r/g, "").trim()
}

// Gap helpers used by sync engine
export function isInGap(lines: LyricLine[], timeMs: number): boolean {
  // if gap > threshold between lines and not in soft hold, treat as gap
  for (let i = 0; i < lines.length - 1; i++) {
    const cur = lines[i]
    const next = lines[i + 1]
    if (cur.kind === "section" || next.kind === "section") continue
    if (timeMs >= cur.endMs && timeMs < next.startMs) {
      const gap = next.startMs - cur.endMs
      if (gap > GAP_THRESHOLD_MS) return true
      if (gap > SOFT_GAP_HOLD_MS && timeMs >= cur.endMs + SOFT_GAP_HOLD_MS) return true
      return false
    }
  }
  return false
}

export function getFirstStart(lines: LyricLine[]): number | null {
  const v = lines.find((l) => l.kind === "lyric" && l.text.trim())
  return v ? v.startMs : null
}

export function getLastEnd(lines: LyricLine[]): number | null {
  if (lines.length === 0) return null
  const vocals = lines.filter((l) => l.kind === "lyric")
  if (vocals.length === 0) return null
  return vocals[vocals.length - 1].endMs
}
