/**
 * YouTube IFrame player: lazy API, duration polling, thumbnail fallback.
 *
 * v2 vs v1: v1 resolved the API-load promise after a blind 8s timeout even
 * when the script was blocked (adblock/CSP) — then silently did nothing
 * because window.YT was still missing, leaving "Resolving song…" forever.
 * v2 distinguishes LOADING / BLOCKED / ERROR: when the API can't load, the
 * player shows the video thumbnail with an explicit "Play" button that
 * retries, instead of a dead stage. Duration is polled until the player
 * reports metadata (v1 read it only onReady/onPlaying, often 0), and an
 * initial `startAt` (from ?t= links) seeks once the player is ready.
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useTimeRef, useUiTime } from "./clock";
import { thumbnailUrl } from "@/lib/ids";

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
      ) => YtPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YtPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (s: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoData: () => { title?: string };
  getPlayerState: () => number;
  destroy: () => void;
}

const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, CUED: 5 } as const;

let apiPromise: Promise<boolean> | null = null;

function loadApi(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.YT?.Player) return Promise.resolve(true);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<boolean>((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      resolve(ok);
    };
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      finish(true);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.onerror = () => finish(false);
    document.head.appendChild(tag);
    setTimeout(() => finish(Boolean(window.YT?.Player)), 8000);
  });
  // A blocked load must be retryable — don't cache the failure forever.
  void apiPromise.then((ok) => {
    if (!ok) apiPromise = null;
  });
  return apiPromise;
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

export interface PlayerClock {
  /** High-frequency ref (mutated per-frame, no renders). Stage reads this. */
  timeRef: RefObject<number>;
  /** 4Hz snapshot for sliders/labels. */
  uiTimeSec: number;
  durationSec: number;
  isPlaying: boolean;
  ready: boolean;
  apiBlocked: boolean;
  title: string;
  error: string | null;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  retryApi: () => void;
}

export function useYouTube(
  videoId: string,
  mountRef: RefObject<HTMLDivElement | null>,
  opts: { hidden?: boolean; startAt?: number; onEnded?: () => void } = {},
): PlayerClock {
  const { hidden, startAt = 0, onEnded } = opts;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const playerRef = useRef<YtPlayer | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const soughtStartRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [apiBlocked, setApiBlocked] = useState(false);
  const [apiAttempt, setApiAttempt] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pollSec, setPollSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const readPlayer = useCallback(() => {
    try {
      const v = playerRef.current?.getCurrentTime();
      return typeof v === "number" && Number.isFinite(v) ? v : null;
    } catch {
      return null;
    }
  }, []);

  const timeRef = useTimeRef(pollSec, isPlaying, readPlayer);
  const uiTimeSec = useUiTime(timeRef, isPlaying);

  const retryApi = useCallback(() => setApiAttempt((a) => a + 1), []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    soughtStartRef.current = false;
    setReady(false);
    setApiBlocked(false);
    setIsPlaying(false);
    setPollSec(0);
    setDurationSec(0);
    setTitle("");
    setError(null);

    anchorRef.current?.remove();
    const anchor = document.createElement("div");
    mount.appendChild(anchor);
    anchorRef.current = anchor;

    void loadApi().then((ok) => {
      if (disposed) return;
      if (!ok || !window.YT?.Player) {
        setApiBlocked(true);
        return;
      }
      try {
        const player = new window.YT.Player(anchor, {
          videoId,
          playerVars: { playsinline: 1, rel: 0, origin: window.location.origin },
          events: {
            onReady: () => {
              if (disposed) return;
              setReady(true);
              try {
                const d = player.getDuration();
                if (Number.isFinite(d) && d > 0) setDurationSec(d);
                const t = player.getVideoData()?.title;
                if (t) setTitle(t);
                if (startAt > 0 && !soughtStartRef.current) {
                  soughtStartRef.current = true;
                  player.seekTo(startAt, true);
                  timeRef.current = startAt;
                  setPollSec(startAt);
                }
              } catch {
                // metadata best-effort
              }
            },
            onStateChange: (e) => {
              if (disposed) return;
              if (e.data === YT_STATE.PLAYING) {
                setIsPlaying(true);
                try {
                  const d = player.getDuration();
                  if (Number.isFinite(d) && d > 0) setDurationSec((prev) => (prev > 0 ? prev : d));
                  const t = player.getVideoData()?.title;
                  if (t) setTitle(t);
                  setPollSec(player.getCurrentTime());
                } catch {
                  // ignore
                }
              } else if (e.data === YT_STATE.PAUSED || e.data === YT_STATE.CUED) {
                setIsPlaying(false);
                try {
                  setPollSec(player.getCurrentTime());
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
      } catch {
        if (!disposed) setError("Couldn't start the YouTube player.");
      }
    });

    return () => {
      disposed = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore teardown
      }
      playerRef.current = null;
      anchor.remove();
      if (anchorRef.current === anchor) anchorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, mountRef, apiAttempt]);

  // Duration polling: getDuration() is 0 until metadata arrives.
  useEffect(() => {
    if (!ready || durationSec > 0) return;
    let n = 0;
    const id = window.setInterval(() => {
      n++;
      try {
        const d = playerRef.current?.getDuration() ?? 0;
        if (Number.isFinite(d) && d > 0) {
          setDurationSec(d);
          window.clearInterval(id);
        } else if (n >= 30) {
          window.clearInterval(id);
        }
      } catch {
        if (n >= 30) window.clearInterval(id);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [ready, durationSec]);

  // 500ms poll → feeds the extrapolated ref (not React state directly).
  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      try {
        const v = playerRef.current?.getCurrentTime();
        if (typeof v === "number" && Number.isFinite(v)) setPollSec(v);
      } catch {
        // keep extrapolating
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [ready]);

  // Lyrics-only mode: keep the iframe alive at 2×2px, never display:none.
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

  const seekTo = useCallback(
    (seconds: number) => {
      const v = Math.max(0, seconds);
      try {
        playerRef.current?.seekTo(v, true);
      } catch {
        // player not ready — still move the clock so lyrics follow
      }
      timeRef.current = v;
      setPollSec(v);
    },
    [timeRef],
  );

  return {
    timeRef,
    uiTimeSec,
    durationSec,
    isPlaying,
    ready,
    apiBlocked,
    title,
    error,
    play,
    pause,
    seekTo,
    retryApi,
  };
}

/** Blocked-API fallback: thumbnail + explicit retry. Pure presentational. */
export function BlockedPlayer({
  videoId,
  onRetry,
}: {
  videoId: string;
  onRetry: () => void;
}) {
  return (
    <div className="blocked-player" role="status">
      <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer">
        <img src={thumbnailUrl(videoId)} alt="Video thumbnail — opens on YouTube" loading="lazy" />
      </a>
      <p>The YouTube player script is blocked (adblock or network). Lyrics below still work.</p>
      <div className="blocked-actions">
        <button type="button" className="btn" onClick={onRetry}>
          Retry player
        </button>
        <a className="btn" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer">
          Open on YouTube
        </a>
      </div>
    </div>
  );
}
