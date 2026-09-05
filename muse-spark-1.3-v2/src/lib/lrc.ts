/**
 * LRC parser v2 — deterministic, overlap-repairing, section-aware.
 *
 * v2 vs v1: v1 used a global incrementing counter for line IDs (unstable
 * across re-parses → React key churn when cache and network both resolve),
 * and left overlapping timestamps untouched (a sloppy file could show two
 * lines "active" at once). v2 derives IDs deterministically from
 * (startMs, text) via djb2, clamps negative starts AFTER the file offset,
 * repairs overlaps by clamping the previous line's end, honours hour tags
 * ([hh:mm:ss.xx]) and [length:], and marks bracket headers / pure-symbol
 * lines as sections (never "singable", never seek targets for gaps).
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
  /** True for "[Chorus]" headers and "♪♪" separators — not singable. */
  isSection: boolean;
  words?: LyricWord[];
}

export interface ParsedLyrics {
  lines: LyricLine[];
  synced: boolean;
  autoTimed: boolean;
}

// [mm:ss.xx] plus optional hour prefix [hh:mm:ss.xx]
const TAG = /\[((\d+):)?(\d{1,3}):(\d{2})(?:[.:](\d{2,3}))?\]/g;
const OFFSET_TAG = /^\[offset:\s*([+-]?\d+)\s*\]$/i;
const LENGTH_TAG = /^\[length:\s*(?:(\d+):)?(\d{1,3}):(\d{2}(?:[.:]\d{2,3})?)\s*\]$/i;
const META_TAG =
  /^\[(ar|ti|al|au|length|by|re|ve|la|tool|id|key|bpm|offset|language)\s*:/i;
const WORD_TAG = /<((\d+):)?(\d{1,3}):(\d{2})(?:[.:](\d{2,3}))?>/g;
const SECTION_BRACKET =
  /^\s*[\(\[（「【](intro|verse|chorus|hook|bridge|pre-?chorus|post-?chorus|outro|interlude|solo|instrumental|break|refrain|part|chapter|verse \d+|chorus \d+)[^)\]）」】]*[\)\]）」】]?\s*$/i;
const SYMBOL_ONLY = /^\s*[♪♫♩♬~*·.。…\-–—\s]+$/;

function fracToMs(frac: string | undefined): number {
  if (!frac) return 0;
  const clean = frac.replace(/[.:]/, "");
  if (clean.length === 2) return Number(clean) * 10;
  return Number(clean.padEnd(3, "0").slice(0, 3));
}

function tagToMs(hours: string | undefined, min: string, sec: string, frac: string | undefined): number {
  const h = hours === undefined || hours === "" ? 0 : Number(hours);
  return h * 3600_000 + Number(min) * 60_000 + Number(sec) * 1000 + fracToMs(frac);
}

function stripWordTags(text: string): string {
  return text.replace(WORD_TAG, "").replace(/\s+/g, " ").trim();
}

export function isSectionText(text: string): boolean {
  if (SECTION_BRACKET.test(text)) return true;
  if (text.length > 0 && text.length <= 12 && SYMBOL_ONLY.test(text)) return true;
  return false;
}

export function isSingable(line: LyricLine): boolean {
  return !line.isSection && line.text.trim().length > 0;
}

/** Deterministic id: djb2(startMs:text) — stable across parses. */
export function lineId(startMs: number, text: string): string {
  let h = 5381;
  const s = `${startMs}:${text}`;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + (s.charCodeAt(i) | 0)) | 0;
  return `l${(h >>> 0).toString(36)}-${startMs}`;
}

function parseInlineWords(
  text: string,
  lineStart: number,
  lineEnd: number,
): LyricWord[] | undefined {
  const marks: number[] = [];
  let m: RegExpExecArray | null;
  WORD_TAG.lastIndex = 0;
  while ((m = WORD_TAG.exec(text)) !== null) {
    marks.push(tagToMs(m[2], m[3] as string, m[4] as string, m[5]));
  }
  if (marks.length === 0) return undefined;
  const plain = stripWordTags(text);
  const tokens = plain.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return undefined;
  return tokens.map((token, i) => {
    const a = marks[Math.min(i, marks.length - 1)] as number;
    const b = marks[Math.min(i + 1, marks.length - 1)] as number;
    const startMs =
      i < marks.length ? a : Math.round(a + ((lineEnd - a) * i) / tokens.length);
    const endMs =
      i + 1 < marks.length ? b : i === tokens.length - 1 ? lineEnd : Math.round(a + ((lineEnd - a) * (i + 1)) / tokens.length);
    return {
      text: token,
      startMs: Math.max(lineStart, startMs),
      endMs: Math.max(Math.max(lineStart, startMs), endMs),
    };
  });
}

function lengthTagToMs(text: string): number | null {
  const m = text.match(LENGTH_TAG);
  if (!m) return null;
  const hours = m[1] === undefined ? 0 : Number(m[1]);
  const min = Number(m[2]);
  const secFrac = m[3] as string;
  const secParts = secFrac.split(/[.:]/);
  const sec = Number(secParts[0]);
  const frac = secParts[1];
  if (![hours, min, sec].every(Number.isFinite)) return null;
  return hours * 3600_000 + min * 60_000 + sec * 1000 + fracToMs(frac);
}

/** Parse synced LRC. Empty lines when input has no usable timestamps. */
export function parseLrc(input: string, durationMs = 0): ParsedLyrics {
  const source = input.replace(/^﻿/, "");
  let fileOffset = 0;
  let fileLength = 0;
  const pending: Array<{ startMs: number; text: string }> = [];

  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const off = line.match(OFFSET_TAG);
    if (off) {
      fileOffset = Number(off[1]);
      continue;
    }
    const len = lengthTagToMs(line);
    if (len !== null) {
      fileLength = len;
      continue;
    }
    if (META_TAG.test(line)) continue;

    TAG.lastIndex = 0;
    const stamps: number[] = [];
    let m: RegExpExecArray | null;
    let lastEnd = 0;
    let leading = true;
    while ((m = TAG.exec(line)) !== null) {
      const between = line.slice(lastEnd, m.index);
      if (!leading || (lastEnd > 0 && between.trim())) break;
      leading = true;
      stamps.push(tagToMs(m[2], m[3] as string, m[4] as string, m[5]));
      lastEnd = m.index + m[0].length;
    }
    if (stamps.length === 0) continue;
    const text = stripWordTags(line.slice(lastEnd));
    if (!text) continue;
    for (const s of stamps) {
      const shifted = s + fileOffset;
      pending.push({ startMs: Math.max(0, shifted), text });
    }
  }

  pending.sort((a, b) => a.startMs - b.startMs);
  const deduped = pending.filter(
    (l, i) => i === 0 || l.startMs !== pending[i - 1]?.startMs || l.text !== pending[i - 1]?.text,
  );

  const effectiveDuration = durationMs > 0 ? durationMs : fileLength;
  const lines: LyricLine[] = deduped.map((l, i) => {
    const next = deduped[i + 1];
    let endMs =
      next && next.startMs > l.startMs
        ? next.startMs
        : effectiveDuration > l.startMs
          ? effectiveDuration
          : l.startMs + 4000;
    endMs = Math.max(l.startMs, endMs);
    const section = isSectionText(l.text);
    const words = section ? undefined : parseInlineWords(l.text, l.startMs, endMs);
    return {
      id: lineId(l.startMs, l.text),
      startMs: l.startMs,
      endMs,
      text: l.text,
      isSection: section,
      ...(words ? { words } : {}),
    };
  });

  // Overlap repair: a line starting before the previous one ends truncates it.
  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1] as LyricLine;
    const cur = lines[i] as LyricLine;
    if (cur.startMs < prev.endMs) prev.endMs = cur.startMs;
  }

  return { lines, synced: lines.length > 0, autoTimed: false };
}

/**
 * Plain-lyrics fallback with adaptive intro/outro: the lead-in scales with
 * track length (3% clamped 0.8–3s) so 2-minute songs don't wait 3s and
 * 8-minute epics don't flash line 1 at 0:00. Weight = char count.
 */
export function parsePlain(input: string, durationMs: number): ParsedLyrics {
  const texts = input
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^﻿/, ""))
    .filter((l) => l.length > 0 && !META_TAG.test(l) && !OFFSET_TAG.test(l) && lengthTagToMs(l) === null);
  if (texts.length === 0 || durationMs <= 0) return { lines: [], synced: false, autoTimed: false };

  const intro = Math.round(Math.min(3000, Math.max(800, durationMs * 0.03)));
  const outro = Math.round(Math.min(4000, Math.max(1000, durationMs * 0.04)));
  const usable = Math.max(durationMs - intro - outro, texts.length * 600);
  const weights = texts.map((t) => Math.max(t.length, 4));
  const total = weights.reduce((a, b) => a + b, 0);

  let cursor = intro;
  const lines: LyricLine[] = texts.map((text, i) => {
    const span = (usable * (weights[i] as number)) / total;
    const startMs = Math.round(cursor);
    cursor += span;
    return {
      id: lineId(startMs, `plain:${text}`),
      startMs,
      endMs: Math.round(i === texts.length - 1 ? durationMs - outro / 2 : cursor),
      text,
      isSection: isSectionText(text),
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
