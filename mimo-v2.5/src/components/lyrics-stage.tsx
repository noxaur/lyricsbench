import { useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LyricLine } from "@/components/lyric-line";
import { usePlayerStore } from "@/stores/player-store";
import { getSyncState } from "@/lib/sync-engine";
import { cn } from "@/lib/utils";

type LyricsStageProps = {
  onRetry?: () => void;
  onPaste?: (text: string) => void;
};

export function LyricsStage({ onRetry, onPaste }: LyricsStageProps) {
  const lyrics = usePlayerStore((s) => s.lyrics);
  const englishLines = usePlayerStore((s) => s.englishLines);
  const romajiLines = usePlayerStore((s) => s.romajiLines);
  const displayMode = usePlayerStore((s) => s.displayMode);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const syncOffsetMs = usePlayerStore((s) => s.syncOffsetMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const status = usePlayerStore((s) => s.status);
  const videoId = usePlayerStore((s) => s.videoId);
  const showTimestamps = usePlayerStore((s) => s.showTimestamps);
  const lyricsFollowMode = usePlayerStore((s) => s.lyricsFollowMode);
  const setLyricsFollowMode = usePlayerStore((s) => s.setLyricsFollowMode);
  const seekToMs = usePlayerStore((s) => s.seekToMs);
  const setActive = usePlayerStore((s) => s.setActive);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const programmaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<number | null>(null);
  const scrollEndTimerRef = useRef<number | null>(null);

  const timeMs = currentTime * 1000;
  const stage = getSyncState(lyrics, timeMs, syncOffsetMs, durationMs);

  useEffect(() => {
    setActive(stage.activeIndex, stage.wordProgress);
  }, [stage.activeIndex, stage.wordProgress, setActive]);

  const getDisplayText = useCallback(
    (index: number): string => {
      const native = lyrics[index]?.text ?? "";
      switch (displayMode) {
        case "native":
          return native;
        case "english":
          return englishLines[index] ?? native;
        case "romaji":
          return romajiLines[index] ?? native;
        case "native-romaji":
          return romajiLines[index] ? `${native}\n${romajiLines[index]}` : native;
        case "both":
          return englishLines[index] ? `${native}\n${englishLines[index]}` : native;
        case "all":
          return [native, romajiLines[index], englishLines[index]].filter(Boolean).join("\n");
        default:
          return native;
      }
    },
    [displayMode, lyrics, englishLines, romajiLines],
  );

  const scrollLineToCenter = useCallback((element: HTMLElement, container: HTMLElement) => {
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const scrollTop = element.offsetTop - containerRect.height / 2 + elementRect.height / 2;
    container.scrollTo({ top: scrollTop, behavior: "smooth" });
  }, []);

  const scrollToActive = useCallback(
    (force = false) => {
      if (lyricsFollowMode !== "follow") return;
      const el = lineRefs.current.get(stage.activeIndex);
      const container = scrollRef.current;
      if (!el || !container) return;

      programmaticScrollRef.current = true;
      scrollLineToCenter(el, container);
      if (programmaticScrollTimerRef.current != null) window.clearTimeout(programmaticScrollTimerRef.current);
      programmaticScrollTimerRef.current = window.setTimeout(() => {
        programmaticScrollRef.current = false;
        programmaticScrollTimerRef.current = null;
      }, 300);
    },
    [stage.activeIndex, lyricsFollowMode, scrollLineToCenter],
  );

  useEffect(() => {
    scrollToActive(true);
  }, [stage.activeIndex, scrollToActive]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onScroll = () => {
      if (!programmaticScrollRef.current && lyricsFollowMode === "follow") {
        setLyricsFollowMode("manual");
      }
      if (scrollEndTimerRef.current != null) window.clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = window.setTimeout(() => {
        scrollEndTimerRef.current = null;
      }, 150);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (scrollEndTimerRef.current != null) window.clearTimeout(scrollEndTimerRef.current);
      if (programmaticScrollTimerRef.current != null) window.clearTimeout(programmaticScrollTimerRef.current);
    };
  }, [lyricsFollowMode, setLyricsFollowMode]);

  const onLineClick = useCallback(
    (index: number) => {
      const line = lyrics[index];
      if (line) seekToMs(line.startMs - syncOffsetMs);
    },
    [lyrics, seekToMs, syncOffsetMs],
  );

  const setLineRef = useCallback(
    (index: number) => (el: HTMLButtonElement | null) => {
      if (el) lineRefs.current.set(index, el);
      else lineRefs.current.delete(index);
    },
    [],
  );

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center" role="status" aria-label="Loading lyrics">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-lyric-active border-t-transparent" />
          <p className="text-sm text-ink-muted">Searching for lyrics…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-medium text-ink-primary">No lyrics found</p>
          <p className="text-sm text-ink-muted">Try a different search or paste lyrics manually.</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (lyrics.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-lg font-medium text-ink-primary/80 motion-safe:animate-pulse">
            {videoId ? "Preparing player…" : "Paste a link to start"}
          </p>
          <p className="text-sm text-ink-muted">
            {videoId ? "Lyrics will appear here once the track is ready." : "Paste a YouTube or song link to begin."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {lyricsFollowMode === "manual" && (
        <div className="z-20 flex shrink-0 justify-center px-3 pb-1 pt-1">
          <button
            type="button"
            onClick={() => {
              usePlayerStore.getState().setLyricsFollowMode("follow");
              scrollToActive(true);
            }}
            className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-md hover:bg-primary/90"
          >
            Sync lyrics
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className={cn(
          "scrollbar-thin relative flex-1 overflow-y-auto px-4",
          "py-[30vh]",
        )}
        style={{ scrollSnapType: "y proximity" }}
      >
        {lyrics.map((line, index) => (
          <div key={`${index}-${line.startMs}`} style={{ scrollSnapAlign: "center" }}>
            <LyricLine
              line={line}
              index={index}
              isActive={index === stage.activeIndex}
              wordProgress={index === stage.activeIndex ? stage.wordProgress : 0}
              displayText={getDisplayText(index)}
              onClick={() => onLineClick(index)}
              showTimestamp={showTimestamps}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
