import type { LyricLine } from "@/types/lyrics";

export type SyncState = {
  activeIndex: number;
  wordIndex: number;
  wordProgress: number;
  mode: "idle" | "intro" | "lyric" | "gap" | "outro";
  gapLabel: string | null;
};

export function getSyncState(
  lines: LyricLine[],
  timeMs: number,
  syncOffsetMs: number,
  durationMs: number,
): SyncState {
  if (lines.length === 0) {
    return { activeIndex: -1, wordIndex: -1, wordProgress: 0, mode: "idle", gapLabel: null };
  }

  const adjustedTime = timeMs - syncOffsetMs;

  const firstLyric = lines.find((l) => l.kind !== "section");
  if (!firstLyric || adjustedTime < firstLyric.startMs) {
    return { activeIndex: -1, wordIndex: -1, wordProgress: 0, mode: "intro", gapLabel: "Intro" };
  }

  const lastLyric = [...lines].reverse().find((l) => l.kind !== "section");
  if (lastLyric && adjustedTime > lastLyric.endMs) {
    return { activeIndex: lines.indexOf(lastLyric), wordIndex: -1, wordProgress: 1, mode: "outro", gapLabel: "Outro" };
  }

  let activeIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.kind === "section") continue;
    if (adjustedTime >= line.startMs && adjustedTime < line.endMs) {
      activeIndex = i;
      break;
    }
    if (adjustedTime >= line.startMs) {
      activeIndex = i;
      break;
    }
  }

  if (activeIndex < 0) {
    return { activeIndex: -1, wordIndex: -1, wordProgress: 0, mode: "intro", gapLabel: null };
  }

  const activeLine = lines[activeIndex];
  const lineProgress = Math.max(0, Math.min(1, (adjustedTime - activeLine.startMs) / Math.max(1, activeLine.endMs - activeLine.startMs)));

  let wordIndex = -1;
  let wordProgress = 0;

  if (activeLine.words && activeLine.words.length > 0) {
    for (let i = activeLine.words.length - 1; i >= 0; i--) {
      const word = activeLine.words[i];
      if (adjustedTime >= word.startMs && adjustedTime < word.endMs) {
        wordIndex = i;
        wordProgress = (adjustedTime - word.startMs) / Math.max(1, word.endMs - word.startMs);
        break;
      }
      if (adjustedTime >= word.startMs) {
        wordIndex = i;
        wordProgress = 1;
        break;
      }
    }
    if (wordIndex < 0 && adjustedTime >= activeLine.startMs) {
      wordIndex = 0;
      wordProgress = lineProgress;
    }
  } else {
    wordProgress = lineProgress;
  }

  const isGap = activeLine.kind === "section";
  const mode = isGap ? "gap" : "lyric";

  return {
    activeIndex,
    wordIndex,
    wordProgress,
    mode,
    gapLabel: isGap ? activeLine.sectionLabel ?? null : null,
  };
}
