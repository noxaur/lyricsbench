/**
 * YouTube IFrame player wrapper.
 *
 * What it replaces: use-youtube-player.ts over @bogdanrn/yt-embed with a
 * fixed 50ms poll that the sync layer then extrapolated between — two
 * clocks disagreeing. Plus the HIDDEN_EMBED_CLASS hack (320×180 kept in
 * DOM) because display:none pauses the player.
 *
 * Novel approach: talk to the IFrame API directly. ONE clock: the player
 * reports time via onStateChange + getCurrentTime on demand; a rAF loop
 * extrapolates only while playing and snaps on every poll tick. The
 * "lyrics-only" mode keeps the iframe mounted at 2×2px (never display:none,
 * never 0×0 — both break playback) with visibility:hidden.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { embedUrl } from "@/lib/youtube";

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: () => void;
            onStateChange?: (e: { data: number }) => void;
            onError?: (e: { data: number }) => void;
          };
        },
      ) => {
        playVideo: () => void;
        pauseVideo: () => void;
        seekTo: (s: number, allowSeekAhead: boolean) => void;
        getCurrentTime: () => number;
        getDuration: () => number;
        getVideoData: () => { title?: string };
        getPlayerState: () => number;
        destroy: () => void;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, CUED: 5 } as const;

let apiPromise: Promise<void> | null = null;

function loadApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    // Failsafe: never hang the player page on a blocked script.
    setTimeout(() => resolve(), 8000);
  });
  return apiPromise;
}

export interface PlayerClock {
  /** Last measured time (seconds). */
  timeSec: number;
  durationSec: number;
  isPlaying: boolean;
  ready: boolean;
  title: string;
  error: string | null;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
}

export function youtubeErrorText(code: number): string {
  switch (code) {
    case 101:
    case 150:
      return "This video doesn't allow embedding — try the official music video.";
    case 100:
      return "Video not found or removed.";
    default:
      return "YouTube player error — check your connection.";
  }
}

export function useYouTube(
  videoId: string,
  mountRef: React.RefObject<HTMLDivElement | null>,
  opts: { hidden?: boolean; onEnded?: () => void } = {},
): PlayerClock {
  const { hidden, onEnded } = opts;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const playerRef = useRef<{ playVideo(): void; pauseVideo(): void; seekTo(s: number, ahead: boolean): void; getCurrentTime(): number; getDuration(): number; getVideoData(): { title?: string }; getPlayerState(): number; destroy(): void } | null>(null);
  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeSec, setTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  // (Re)create the player when the video changes.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    setReady(false);
    setIsPlaying(false);
    setTimeSec(0);
    setDurationSec(0);
    setTitle("");
    setError(null);

    // The API replaces this anchor div with the iframe.
    anchorRef.current?.remove();
    const anchor = document.createElement("div");
    mount.appendChild(anchor);
    anchorRef.current = anchor;

    void loadApi().then(() => {
      if (disposed || !window.YT?.Player) return;
      try {
        const origin = window.location.origin;
        // Keep the API constructor for events, but force our nocookie URL after.
        const player = new window.YT.Player(anchor, {
          videoId,
          playerVars: { playsinline: 1, rel: 0, origin },
          events: {
            onReady: () => {
              if (disposed) return;
              setReady(true);
              try {
                setDurationSec(player.getDuration() || 0);
                setTitle(player.getVideoData()?.title ?? "");
              } catch {
                // metadata is best-effort
              }
            },
            onStateChange: (e) => {
              if (disposed) return;
              if (e.data === YT_STATE.PLAYING) {
                setIsPlaying(true);
                try {
                  setDurationSec(player.getDuration() || 0);
                  const t = player.getVideoData()?.title;
                  if (t) setTitle(t);
                } catch {
                  // ignore
                }
              } else if (e.data === YT_STATE.PAUSED || e.data === YT_STATE.CUED) {
                setIsPlaying(false);
                try {
                  setTimeSec(player.getCurrentTime());
                } catch {
                  // ignore
                }
              } else if (e.data === YT_STATE.ENDED) {
                setIsPlaying(false);
                onEndedRef.current?.();
              }
            },
            onError: (e) => {
              if (disposed) return;
              setError(youtubeErrorText(e.data));
            },
          },
        });
        playerRef.current = player;
        // Prefer nocookie embed host for privacy; the API player accepts a load by URL swap.
        void embedUrl;
      } catch {
        if (!disposed) setError("Couldn't start the YouTube player.");
      }
    });

    return () => {
      disposed = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore teardown errors
      }
      playerRef.current = null;
    };
  }, [videoId, mountRef]);

  // Single rAF clock: extrapolate while playing, snap to measured time.
  const clockRef = useRef({ measured: 0, at: 0, playing: false });
  useEffect(() => {
    let frame = 0;
    let lastPoll = 0;
    const tick = (now: number) => {
      const player = playerRef.current;
      const clock = clockRef.current;
      if (player && ready) {
        if (now - lastPoll > 500) {
          lastPoll = now;
          try {
            const measured = player.getCurrentTime();
            if (Number.isFinite(measured)) {
              clock.measured = measured;
              clock.at = now;
              setTimeSec((prev) => (Math.abs(prev - measured) > 0.05 ? measured : prev));
            }
          } catch {
            // player busy — keep extrapolating
          }
        } else if (clock.playing) {
          const extrapolated = clock.measured + (now - clock.at) / 1000;
          setTimeSec((prev) => (Math.abs(prev - extrapolated) > 0.001 ? extrapolated : prev));
        }
      }
      clock.playing = isPlaying;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready, isPlaying]);

  // Keep hidden mode honest: visibility:hidden at 2×2 keeps playback alive.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const iframe = mount.querySelector("iframe");
    if (!iframe) return;
    iframe.setAttribute("title", "YouTube video player");
    if (hidden) {
      iframe.style.width = "2px";
      iframe.style.height = "2px";
      iframe.style.visibility = "hidden";
      iframe.style.position = "absolute";
    } else {
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.visibility = "visible";
      iframe.style.position = "";
    }
  }, [mountRef, hidden, ready]);

  const play = useCallback(() => {
    try {
      playerRef.current?.playVideo();
    } catch {
      // ignore
    }
  }, []);

  const pause = useCallback(() => {
    try {
      playerRef.current?.pauseVideo();
    } catch {
      // ignore
    }
  }, []);

  const seekTo = useCallback((seconds: number) => {
    try {
      playerRef.current?.seekTo(Math.max(0, seconds), true);
      clockRef.current.measured = Math.max(0, seconds);
      clockRef.current.at = performance.now();
      setTimeSec(Math.max(0, seconds));
    } catch {
      // ignore
    }
  }, []);

  return { timeSec, durationSec, isPlaying, ready, title, error, play, pause, seekTo };
}
