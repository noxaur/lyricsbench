import { useEffect, useRef, useState } from "react";
import type { LyricLine } from "@/lib/lrc";
import { activeIndexAt, lineProgress, stageAt, wordProgressAt } from "@/lib/sync";
import { formatTime } from "@/lib/lrc";

interface StageProps {
  lines: LyricLine[];
  /** Playback time in seconds (poll-rate updates are fine). */
  timeSec: number;
  isPlaying: boolean;
  offsetMs: number;
  durationMs: number;
  showTimestamps: boolean;
  onSeek: (seconds: number) => void;
}

/**
 * Karaoke stage.
 *
 * Perf fix vs the previous generation: the old app wrote every rAF tick
 * into a zustand store (setCurrentTime ~60Hz → whole player tree
 * re-rendered 60×/s). Here the rAF loop lives INSIDE the stage, mutates
 * only refs + the wipe overlay's clip-path per frame, and calls setState
 * solely when the active line or word index CHANGES (≈0.2–4 Hz).
 * The rest of the page re-renders at YouTube poll cadence, not frame rate.
 */
export function LyricsStage({
  lines,
  timeSec,
  isPlaying,
  offsetMs,
  durationMs,
  showTimestamps,
  onSeek,
}: StageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeElRef = useRef<HTMLParagraphElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [following, setFollowing] = useState(true);

  const clockRef = useRef({ baseSec: 0, at: 0, playing: false });
  clockRef.current.baseSec = timeSec;
  clockRef.current.at = performance.now();
  clockRef.current.playing = isPlaying;
  const followRef = useRef(true);
  followRef.current = following;
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const offsetRef = useRef(offsetMs);
  offsetRef.current = offsetMs;

  // Reset follow + active tracking when the song changes.
  useEffect(() => {
    setFollowing(true);
    setActiveIndex(-1);
    containerRef.current?.scrollTo({ top: 0 });
  }, [lines]);

  useEffect(() => {
    let frame = 0;
    let lastActive = -2;
    const tick = () => {
      const clock = clockRef.current;
      const now = performance.now();
      // Extrapolate between YouTube polls while playing (same idea as the
      // old use-lyrics-sync, but the value never leaves this closure
      // unless the active line actually changes).
      const t = clock.playing ? clock.baseSec + (now - clock.at) / 1000 : clock.baseSec;
      const timeMs = t * 1000;
      const current = linesRef.current;
      const active = activeIndexAt(current, timeMs, offsetRef.current);

      if (active !== lastActive) {
        lastActive = active;
        setActiveIndex(active);
        if (active >= 0 && followRef.current) {
          requestAnimationFrame(() => {
            activeElRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          });
        }
      }

      const el = activeElRef.current;
      if (el && active >= 0) {
        const line = current[active];
        if (line) {
          if (line.words && line.words.length > 0) {
            const { wordIndex: wi } = wordProgressAt(line, timeMs, offsetRef.current);
            const total = line.words.length;
            const p = total > 0 ? (wi + 1) / total : 0;
            const top = el.querySelector<HTMLElement>("[data-wipe-top]");
            if (top) top.style.clipPath = `inset(0 ${Math.max(0, (1 - p) * 100).toFixed(1)}% 0 0)`;
          } else {
            const p = lineProgress(line, timeMs, offsetRef.current);
            const top = el.querySelector<HTMLElement>("[data-wipe-top]");
            if (top) top.style.clipPath = `inset(0 ${Math.max(0, (1 - p) * 100).toFixed(1)}% 0 0)`;
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (lines.length === 0) return null;

  return (
    <div>
      {!following && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
          <button type="button" className="btn btn-ghost" onClick={() => setFollowing(true)}>
            ↓ Resume follow
          </button>
        </div>
      )}
      <div
        ref={containerRef}
        className="stage"
        role="list"
        aria-label="Synced lyrics"
        onWheel={() => followRef.current && setFollowing(false)}
        onTouchMove={() => followRef.current && setFollowing(false)}
      >
        {lines.map((line, i) => {
          const isActive = i === activeIndex;
          const isPast = activeIndex >= 0 && i < activeIndex;
          return (
            <p
              key={line.id}
              role="listitem"
              ref={isActive ? activeElRef : undefined}
              className={`stage-line${isActive ? " active" : ""}${isPast ? " past" : ""}`}
              aria-current={isActive ? "true" : undefined}
              onClick={() => onSeek(line.startMs / 1000)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSeek(line.startMs / 1000);
                }
              }}
              tabIndex={0}
              title={`Seek to ${formatTime(line.startMs / 1000)}`}
            >
              {showTimestamps && (
                <span className="time">{formatTime(line.startMs / 1000)}</span>
              )}
              {isActive ? (
                <span className="wipe">
                  <span className="wipe-base" aria-hidden="true">
                    {line.text}
                  </span>
                  <span
                    className="wipe-top"
                    data-wipe-top
                    aria-hidden="true"
                    style={{ clipPath: "inset(0 100% 0 0)" }}
                  >
                    {line.text}
                  </span>
                  <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                    {line.text}
                  </span>
                </span>
              ) : (
                line.text
              )}
            </p>
          );
        })}
        <GapTail
          timeMs={timeSec * 1000}
          offsetMs={offsetMs}
          lines={lines}
          durationMs={durationMs}
        />
      </div>
    </div>
  );
}

/** Intro/outro/instrumental label rendered after the last line when apt. */
function GapTail({
  timeMs,
  offsetMs,
  lines,
  durationMs,
}: {
  timeMs: number;
  offsetMs: number;
  lines: LyricLine[];
  durationMs: number;
}) {
  const s = stageAt(lines, timeMs, offsetMs, durationMs);
  if (s.mode === "lyric" || s.mode === "idle") return null;
  return (
    <div className="stage-gap" aria-live="polite">
      {s.gapLabel}
    </div>
  );
}
