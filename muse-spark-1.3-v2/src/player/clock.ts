/**
 * Single time engine: one extrapolated ref + one throttled UI snapshot.
 *
 * v2 vs v1: v1 ran TWO disagreeing clocks — youtube-view's rAF loop called
 * setTimeSec ~60×/s while playing (threshold 0.001 ≈ every frame), and the
 * stage ran its OWN rAF extrapolator on top. The whole player tree
 * re-rendered at frame rate. v2 splits the concern: `timeRef` is mutated
 * per-frame with NO React state (the stage reads it directly), while
 * `useUiTime` copies it into state at 4Hz for the transport slider and
 * timestamps. Result: stage wipes stay butter-smooth, React renders 15×
 * less often.
 */

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * High-frequency clock. Poll the player at `pollSec` and extrapolate
 * between polls while playing. Never triggers a render by itself.
 */
export function useTimeRef(
  pollSec: number,
  isPlaying: boolean,
  readPlayer: () => number | null,
): RefObject<number> {
  const timeRef = useRef(0);
  const meta = useRef({ measured: 0, at: 0 });
  const playingRef = useRef(isPlaying);
  playingRef.current = isPlaying;
  const pollRef = useRef(pollSec);
  pollRef.current = pollSec;
  const readRef = useRef(readPlayer);
  readRef.current = readPlayer;

  // Poll value arrives here — snap immediately, no smoothing lag.
  useEffect(() => {
    meta.current.measured = pollSec;
    meta.current.at = performance.now();
    timeRef.current = pollSec;
  }, [pollSec]);

  useEffect(() => {
    let frame = 0;
    let lastPoll = 0;
    const tick = (now: number) => {
      const m = meta.current;
      if (now - lastPoll > 500) {
        lastPoll = now;
        try {
          const measured = readRef.current();
          if (measured !== null && Number.isFinite(measured)) {
            m.measured = measured;
            m.at = now;
            timeRef.current = measured;
          } else if (playingRef.current) {
            timeRef.current = m.measured + (now - m.at) / 1000;
          }
        } catch {
          if (playingRef.current) timeRef.current = m.measured + (now - m.at) / 1000;
        }
      } else if (playingRef.current) {
        timeRef.current = m.measured + (now - m.at) / 1000;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return timeRef;
}

/**
 * Low-frequency React snapshot of a time ref for sliders/labels.
 * Copies at `hz` while playing; snaps instantly when paused/seeking.
 */
export function useUiTime(timeRef: RefObject<number>, isPlaying: boolean, hz = 4): number {
  const [ui, setUi] = useState(() => timeRef.current ?? 0);
  const uiRef = useRef(ui);
  useEffect(() => {
    if (!isPlaying) {
      const v = timeRef.current ?? 0;
      if (v !== uiRef.current) {
        uiRef.current = v;
        setUi(v);
      }
      return;
    }
    const id = window.setInterval(() => {
      const v = timeRef.current ?? 0;
      if (Math.abs(v - uiRef.current) > 0.05) {
        uiRef.current = v;
        setUi(v);
      }
    }, Math.round(1000 / hz));
    return () => window.clearInterval(id);
  }, [isPlaying, hz, timeRef]);
  // Snap on external poll jumps (seek) even while paused — handled by caller
  // passing updated pollSec; here we also sync when the ref jumps far.
  useEffect(() => {
    const v = timeRef.current ?? 0;
    if (Math.abs(v - uiRef.current) > 1.5) {
      uiRef.current = v;
      setUi(v);
    }
  });
  return ui;
}
