/**
 * LRC parser — correct by construction.
 *
 * The bug it replaces (#78 "wrongly matched lyrics timestamps"): the old
 * parser handled ONE timestamp per line, so repeat-chorus lines like
 *   [00:12.00][00:45.00]chorus words
 * kept only the first tag and dropped the repeat. It also ignored the
 * `[offset:+/-ms]` file header, shifting every line.
 *
 * Novel approach: tokenize ALL leading tags per line first, then fan out
 * one LyricLine per timestamp. Offset is applied once at the end.
 */

export interface LyricWord {
  text: string;
  startMs: number;
  endMs: number;
}

export interface LyricLine {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  sectionLabel?: string;
  words?: LyricWord[];
}

export interface ParsedLyrics {
  lines: LyricLine[];
  /** true when at least one line came from a real timestamp */
  synced: boolean;
  /** true when timing was estimated (plain lyrics fallback) */
  autoTimed: boolean;
}

const TAG = /\[(\d{1,3}):(\d{2})(?:[.:](\d{2,3}))?\]/g;
const OFFSET_TAG = /^\[offset:\s*([+-]?\d+)\s*\]$/i;
const META_TAG = /^\[(ar|ti|al|au|length|by|re|ve|la|tool|id|key|bpm|offset|language)\s*:/i;
// Inline enhanced-LRC word tags: <mm:ss.xx>
const WORD_TAG = /<(\d{1,3}):(\d{2})(?:[.:](\d{2,3}))?>/g;
const SECTION_ONLY = /^\s*[\(\[（「【](intro|verse|chorus|hook|bridge|pre-?chorus|post-?chorus|outro|interlude|solo|instrumental|break|refrain|part|chapter)[^)\]）」】]*[\)\]）」】]?\s*$/i;

function fracToMs(frac: string | undefined): number {
  if (!frac) return 0;
  if (frac.length === 2) return Number(frac) * 10;
  return Number(frac.padEnd(3, "0").slice(0, 3));
}

function toMs(min: string, sec: string, frac: string | undefined): number {
  return Number(min) * 60_000 + Number(sec) * 1000 + fracToMs(frac);
}

function stripWordTags(text: string): string {
  return text.replace(WORD_TAG, "").replace(/\s+/g, " ").trim();
}

function parseInlineWords(text: string, lineStart: number, lineEnd: number): LyricWord[] | undefined {
  const marks: Array<{ at: number; index: number }> = [];
  let m: RegExpExecArray | null;
  WORD_TAG.lastIndex = 0;
  while ((m = WORD_TAG.exec(text)) !== null) {
    marks.push({ at: toMs(m[1] as string, m[2] as string, m[3]), index: m.index });
  }
  if (marks.length === 0) return undefined;
  const plain = stripWordTags(text);
  const tokens = plain.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return undefined;
  // Map k word-marks onto n tokens: interpolate when counts differ.
  const words: LyricWord[] = tokens.map((token, i) => {
    const a = marks[Math.min(i, marks.length - 1)] as { at: number };
    const b = marks[Math.min(i + 1, marks.length - 1)] as { at: number };
    const startMs = i < marks.length ? a.at : Math.round(a.at + ((lineEnd - a.at) * i) / tokens.length);
    const endMs = i + 1 < marks.length ? b.at : i === tokens.length - 1 ? lineEnd : Math.round(a.at + ((lineEnd - a.at) * (i + 1)) / tokens.length);
    return { text: token, startMs: Math.max(lineStart, startMs), endMs: Math.max(startMs, endMs) };
  });
  return words;
}

let lineSeq = 0;

/** Parse synced LRC. Returns empty lines when input has no usable timestamps. */
export function parseLrc(input: string, durationMs = 0): ParsedLyrics {
  const rawLines = input.split("\n");
  let fileOffset = 0;
  const pending: Array<{ startMs: number; text: string }> = [];

  for (const raw of rawLines) {
    const line = raw.trim();
    if (!line) continue;
    const off = line.match(OFFSET_TAG);
    if (off) {
      fileOffset = Number(off[1]);
      continue;
    }
    if (META_TAG.test(line)) continue;

    TAG.lastIndex = 0;
    const stamps: number[] = [];
    let m: RegExpExecArray | null;
    let lastEnd = 0;
    while ((m = TAG.exec(line)) !== null) {
      // Only leading tags count; a tag after lyric text is not a timestamp.
      const between = line.slice(lastEnd, m.index);
      if (lastEnd > 0 && between.trim()) break;
      stamps.push(toMs(m[1] as string, m[2] as string, m[3]));
      lastEnd = m.index + m[0].length;
    }
    if (stamps.length === 0) continue;
    const text = stripWordTags(line.slice(lastEnd));
    if (!text) continue; // timestamp-only separator lines carry no lyric
    for (const startMs of stamps) pending.push({ startMs: startMs + fileOffset, text });
  }

  pending.sort((a, b) => a.startMs - b.startMs);
  // De-dupe identical (startMs, text) pairs that sloppy files repeat.
  const deduped = pending.filter(
    (l, i) => i === 0 || l.startMs !== pending[i - 1]?.startMs || l.text !== pending[i - 1]?.text,
  );

  const lines: LyricLine[] = deduped.map((l, i) => {
    const next = deduped[i + 1];
    const endMs =
      next && next.startMs > l.startMs
        ? next.startMs
        : durationMs > l.startMs
          ? durationMs
          : l.startMs + 5_000;
    const sectionMatch = l.text.match(SECTION_ONLY);
    const words = parseInlineWords(l.text, l.startMs, endMs);
    return {
      id: `lrc-${lineSeq++}-${l.startMs}`,
      startMs: Math.max(0, l.startMs),
      endMs: Math.max(l.startMs, endMs),
      text: l.text,
      ...(sectionMatch?.[1] ? { sectionLabel: sectionMatch[1].toLowerCase() } : {}),
      ...(words ? { words } : {}),
    };
  });

  return { lines, synced: lines.length > 0, autoTimed: false };
}

/**
 * Plain-lyrics fallback with WEIGHTED timing (novel vs old equal-slice):
 * each line gets duration proportional to its character count, with a
 * 1.2s intro lead-in and 2s outro tail so the first line doesn't flash
 * at 0:00 on long tracks.
 */
export function parsePlain(input: string, durationMs: number): ParsedLyrics {
  const texts = input
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !META_TAG.test(l) && !OFFSET_TAG.test(l));
  if (texts.length === 0 || durationMs <= 0) return { lines: [], synced: false, autoTimed: false };

  const INTRO_MS = 1_200;
  const OUTRO_MS = 2_000;
  const usable = Math.max(durationMs - INTRO_MS - OUTRO_MS, texts.length * 800);
  const weights = texts.map((t) => Math.max(t.length, 4));
  const total = weights.reduce((a, b) => a + b, 0);

  let cursor = INTRO_MS;
  const lines: LyricLine[] = texts.map((text, i) => {
    const span = (usable * (weights[i] as number)) / total;
    const startMs = Math.round(cursor);
    cursor += span;
    const sectionMatch = text.match(SECTION_ONLY);
    return {
      id: `plain-${lineSeq++}-${i}`,
      startMs,
      endMs: Math.round(i === texts.length - 1 ? durationMs - OUTRO_MS / 2 : cursor),
      text,
      ...(sectionMatch?.[1] ? { sectionLabel: sectionMatch[1].toLowerCase() } : {}),
    };
  });

  return { lines, synced: false, autoTimed: true };
}

/** Unified entry: try LRC first, fall back to weighted plain timing. */
export function parseLyricsText(input: string, durationMs: number): ParsedLyrics {
  const lrc = parseLrc(input, durationMs);
  if (lrc.lines.length > 0) return lrc;
  return parsePlain(input, durationMs);
}

export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
