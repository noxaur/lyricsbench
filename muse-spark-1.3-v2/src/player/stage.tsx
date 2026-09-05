/**
 * Karaoke stage: ref-speed wipes, state-speed highlights.
 *
 * v2 vs v1: v1 attached the wipe overlay query (`querySelector`) and
 * scrollIntoView on EVERY frame's closure and unfollowed only on
 * wheel/touch — scrollbar drags and keyboard scrolls kept "following" and
 * yanked the view back. v2 caches the wipe node per active line, ignores
 * programmatic scrolls via a timestamp guard so scrollbar/keyboard scrolling
 * unfollows correctly, honours prefers-reduced-motion for both scroll and
 * wipe glow, and renders lines with content-visibility:auto so 500-line
 * booklets don't cost 500 layouts.
 */

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { formatTime, type LyricLine } from "@/lib/lrc";
import { activeIndexAt, lineProgress, stageAt, wordProgressAt } from "@/lib/sync";

interface StageProps {
  lines: LyricLine[];
  timeRef: RefObject<number>;
  isPlaying: boolean;
  /** 4Hz UI snapshot for gap labels (high-freq lives in timeRef). */
  uiTimeSec: number;
  offsetMs: number;
  durationMs: number;
  showTimestamps: boolean;
  onSeek: (seconds: number) => void;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function LyricsStage({
  lines,
  timeRef,
  isPlaying,
  uiTimeSec,
  offsetMs,
  durationMs,
  showTimestamps,
  onSeek,
}: StageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeElRef = useRef<HTMLButtonElement | null>(null);
  const wipeTopRef = useRef<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [following, setFollowing] = useState(true);

  const live = useRef({ base: 0, at: 0, playing: false });
  const followRef = useRef(true);
  followRef.current = following;
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const offsetRef = useRef(offsetMs);
  offsetRef.current = offsetMs;
  const programmaticScrollUntil = useRef(0);

  useEffect(() => {
    setFollowing(true);
    followRef.current = true;
    setActiveIndex(-1);
    wipeTopRef.current = null;
    containerRef.current?.scrollTo({ top: 0 });
  }, [lines]);

  // Keep the extrapolator fed from props (poll-rate) without re-subscribing.
  useEffect(() => {
    live.current.base = uiTimeSec;
    live.current.at = performance.now();
    live.current.playing = isPlaying;
  });

  useEffect(() => {
    let frame = 0;
    let lastActive = -2;
    const tick = () => {
      const now = performance.now();
      const c = live.current;
      // Prefer the shared high-frequency ref; fall back to extrapolation.
      const refT = timeRef.current;
      const t =
        typeof refT === "number" && Number.isFinite(refT)
          ? refT
          : c.playing
            ? c.base + (now - c.at) / 1000
            : c.base;
      const timeMs = t * 1000;
      const current = linesRef.current;
      const active = activeIndexAt(current, timeMs, offsetRef.current);

      if (active !== lastActive) {
        lastActive = active;
        setActiveIndex(active);
        wipeTopRef.current = null;
        if (active >= 0 && followRef.current) {
          programmaticScrollUntil.current = now + 600;
          requestAnimationFrame(() => {
            activeElRef.current?.scrollIntoView({
              behavior: prefersReducedMotion() ? "auto" : "smooth",
              block: "center",
            });
          });
        }
      }

      if (active >= 0) {
        const line = current[active];
        if (line) {
          let top = wipeTopRef.current;
          if (!top) {
            top = activeElRef.current?.querySelector<HTMLElement>("[data-wipe-top]") ?? null;
            wipeTopRef.current = top;
          }
          if (top) {
            let p: number;
            if (line.words && line.words.length > 0) {
              const { wordIndex: wi } = wordProgressAt(line, timeMs, offsetRef.current);
              p = (wi + 1) / line.words.length;
            } else {
              p = lineProgress(line, timeMs, offsetRef.current);
            }
            top.style.clipPath = `inset(0 ${Math.max(0, (1 - p) * 100).toFixed(1)}% 0 0)`;
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [timeRef]);

  if (lines.length === 0) return null;

  const unfollow = () => {
    if (followRef.current) setFollowing(false);
  };

  return (
    <div>
      {!following && (
        <div className="follow-bar">
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
        onWheel={unfollow}
        onTouchMove={unfollow}
        onScroll={() => {
          if (performance.now() < programmaticScrollUntil.current) return;
          unfollow();
        }}
      >
        {lines.map((line, i) => {
          const isActive = i === activeIndex;
          const isPast = activeIndex >= 0 && i < activeIndex;
          if (line.isSection) {
            return (
              <div key={line.id} role="listitem" className="stage-section" aria-label={line.text}>
                {line.text}
              </div>
            );
          }
          return (
            <button
              key={line.id}
              type="button"
              role="listitem"
              ref={isActive ? activeElRef : undefined}
              className={`stage-line${isActive ? " active" : ""}${isPast ? " past" : ""}`}
              aria-current={isActive ? "true" : undefined}
              onClick={() => onSeek(line.startMs / 1000)}
              title={`Seek to ${formatTime(line.startMs / 1000)}`}
              style={{ contentVisibility: "auto", containIntrinsicSize: "auto 64px" } as CSSProperties}
            >
              {showTimestamps && <span className="time">{formatTime(line.startMs / 1000)}</span>}
              {isActive ? (
                <span className="wipe">
                  <span className="wipe-base" aria-hidden="true">
                    {line.text}
                  </span>
                  <span className="wipe-top" data-wipe-top aria-hidden="true" style={{ clipPath: "inset(0 100% 0 0)" }}>
                    {line.text}
                  </span>
                  <span className="sr-only">{line.text}</span>
                </span>
              ) : (
                line.text
              )}
            </button>
          );
        })}
        <GapTail timeMs={uiTimeSec * 1000} offsetMs={offsetMs} lines={lines} durationMs={durationMs} />
      </div>
    </div>
  );
}

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
