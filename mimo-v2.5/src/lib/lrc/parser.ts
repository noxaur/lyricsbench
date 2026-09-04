import type { LyricLine, LyricWord, ParsedLyrics } from "@/types/lyrics";

const LRC_LINE_HOUR = /^\[(\d{2}):(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)$/;
const LRC_LINE_FRAC = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/;
const LRC_LINE_NO_FRAC = /^\[(\d{2}):(\d{2})\](.*)$/;
const LRC_OFFSET = /^\[offset:\s*([+-]?\d+)\s*\]$/i;
const LRC_METADATA = /^\[(?:ar|ti|al|by|au|length|re|ve|la|tool|id|key|bpm|sign|sender|recipient|product|language):\s*/i;
const SECTION_TAG = /^\[(verse|chorus|bridge|pre-chorus|post-chorus|outro|intro|interlude|hook|refrain|coda|tag)\s*(\d*)\]\s*(.*)$/i;

function parseFractionalMs(frac: string): number {
  return frac.length === 2 ? Number(frac) * 10 : Number(frac);
}

function parseTimestamp(min: string, sec: string, frac: string): number {
  return Number(min) * 60_000 + Number(sec) * 1000 + parseFractionalMs(frac);
}

function parseLrcLine(line: string): { startMs: number; text: string } | null {
  let match = line.match(LRC_LINE_HOUR);
  if (match) {
    const [, hour, min, sec, frac, text] = match;
    const ms = frac ? parseFractionalMs(frac) : 0;
    return { startMs: Number(hour) * 3_600_000 + Number(min) * 60_000 + Number(sec) * 1000 + ms, text };
  }
  match = line.match(LRC_LINE_FRAC);
  if (match) {
    const [, min, sec, frac, text] = match;
    return { startMs: parseTimestamp(min, sec, frac), text };
  }
  match = line.match(LRC_LINE_NO_FRAC);
  if (match) {
    const [, min, sec, text] = match;
    return { startMs: Number(min) * 60_000 + Number(sec) * 1000, text };
  }
  return null;
}

function parseSectionTag(text: string): { isSection: true; label: string } | null {
  const match = text.trim().match(SECTION_TAG);
  if (!match) return null;
  const [, type, num] = match;
  const label = `${type.charAt(0).toUpperCase() + type.slice(1)}${num ? ` ${num}` : ""}`;
  return { isSection: true, label };
}

function parseEnhancedLrcWords(text: string, lineStartMs: number, lineEndMs: number): LyricWord[] {
  const wordRegex = /<(\d{2}):(\d{2})\.(\d{2,3})>([^<]+)/g;
  const words: LyricWord[] = [];
  let lastEndMs = lineStartMs;
  let match;

  while ((match = wordRegex.exec(text)) !== null) {
    const [, min, sec, frac, word] = match;
    const startMs = parseTimestamp(min, sec, frac);
    if (words.length > 0 && words[words.length - 1].endMs <= startMs) {
      words[words.length - 1].endMs = startMs;
    }
    words.push({ text: word, startMs, endMs: lineEndMs });
    lastEndMs = startMs;
  }

  if (words.length > 0) {
    words[words.length - 1].endMs = lineEndMs;
  }

  return words;
}

function finalizeWordTimings(lines: LyricLine[]): LyricLine[] {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.words || line.words.length === 0) continue;
    for (let j = 0; j < line.words.length; j++) {
      const word = line.words[j];
      if (j < line.words.length - 1) {
        word.endMs = line.words[j + 1].startMs;
      } else {
        word.endMs = line.endMs;
      }
    }
  }
  return lines;
}

function estimateIntroOffset(lines: LyricLine[], durationMs: number): number {
  if (lines.length === 0) return 0;
  const firstLyricMs = lines.find((l) => l.kind !== "section")?.startMs ?? 0;
  if (firstLyricMs > 5000) return Math.min(firstLyricMs - 1000, 5000);
  return 0;
}

export type ParseOptions = {
  showSectionLabels?: boolean;
};

export function parseLrc(lrc: string, durationMs = 0, options: ParseOptions = {}): ParsedLyrics {
  const showSectionLabels = options.showSectionLabels ?? true;
  const rawLines = lrc.split("\n").map((l) => l.trim()).filter(Boolean);

  let fileOffsetMs = 0;
  const contentLines: string[] = [];

  for (const line of rawLines) {
    const offsetMatch = line.match(LRC_OFFSET);
    if (offsetMatch) { fileOffsetMs = Number(offsetMatch[1]); continue; }
    if (LRC_METADATA.test(line)) continue;
    contentLines.push(line);
  }

  const lines: LyricLine[] = [];

  for (const line of contentLines) {
    const parsed = parseLrcLine(line);
    if (!parsed) continue;
    const { startMs, text } = parsed;
    const trimmed = text.trim();

    if (!trimmed) continue;

    const section = parseSectionTag(trimmed);
    if (section) {
      if (showSectionLabels) {
        lines.push({ startMs, endMs: startMs, text: "", sectionLabel: section.label, kind: "section" });
      }
      continue;
    }

    const words = parseEnhancedLrcWords(trimmed, startMs, 0);
    const plainText = words.length > 0 ? words.map((w) => w.text).join("") : trimmed;

    lines.push({ startMs, endMs: 0, text: plainText, kind: "lyric", words: words.length > 0 ? words : undefined });
  }

  lines.sort((a, b) => a.startMs - b.startMs);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.kind === "section") { line.endMs = line.startMs; continue; }
    const next = lines[i + 1];
    line.endMs = next ? next.startMs : durationMs > 0 ? durationMs : line.startMs + 5000;
  }

  const finalized = finalizeWordTimings(lines);
  const introOffset = durationMs > 0 ? estimateIntroOffset(finalized, durationMs) : 0;
  const combinedOffset = introOffset + (fileOffsetMs !== 0 ? -fileOffsetMs : 0);

  return {
    lines: finalized,
    synced: finalized.length > 0,
    autoTimed: false,
    suggestedOffsetMs: combinedOffset !== 0 ? Math.max(-5000, Math.min(5000, combinedOffset)) : undefined,
  };
}

function splitIntoParagraphs(text: string): string[][] {
  const paragraphs: string[][] = [];
  let current: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current.length > 0) { paragraphs.push(current); current = []; }
    } else {
      current.push(trimmed);
    }
  }
  if (current.length > 0) paragraphs.push(current);
  return paragraphs;
}

function estimateParagraphTiming(
  paragraphs: string[][],
  durationMs: number,
): LyricLine[] {
  const allLines = paragraphs.flat();
  if (allLines.length === 0) return [];

  const slice = durationMs / allLines.length;
  const lines: LyricLine[] = [];
  let idx = 0;

  for (const para of paragraphs) {
    for (const text of para) {
      const startMs = Math.round(idx * slice);
      idx++;
      const endMs = Math.round(idx * slice);
      lines.push({ startMs, endMs, text, kind: "lyric" });
    }
  }

  return lines;
}

export function parsePlainLyrics(text: string, durationMs: number, options: ParseOptions = {}): ParsedLyrics {
  const showSectionLabels = options.showSectionLabels ?? true;
  const paragraphs = splitIntoParagraphs(text);
  const lines = estimateParagraphTiming(paragraphs, durationMs);

  return { lines, synced: false, autoTimed: true };
}
