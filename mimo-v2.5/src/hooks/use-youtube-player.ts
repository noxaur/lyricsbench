import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/stores/player-store";

type YouTubePlayerState = {
  data: number;
};

declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement, config: Record<string, unknown>) => YouTubeEmbed;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YouTubeEmbed = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
};

type UseYouTubePlayerOptions = {
  videoId: string;
  onReady?: () => void;
  onStateChange?: (state: number) => void;
  onEnd?: () => void;
};

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT?.Player) { resolve(); return; }
    const existing = document.querySelector("script[src='https://www.youtube.com/iframe_api']");
    if (existing) {
      const check = setInterval(() => {
        if (window.YT?.Player) { clearInterval(check); resolve(); }
      }, 50);
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve();
  });
}

export function useYouTubePlayer(options: UseYouTubePlayerOptions) {
  const { videoId, onReady, onStateChange, onEnd } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubeEmbed | null>(null);
  const bindControls = usePlayerStore((s) => s.bindControls);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      await loadYouTubeAPI();
      if (cancelled || !containerRef.current || !window.YT?.Player) return;

      const player = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            playerRef.current = player;
            bindControls({
              play: () => player.playVideo(),
              pause: () => player.pauseVideo(),
              seek: (sec: number) => player.seekTo(sec, true),
              isPlaying: false,
            });
            onReady?.();
          },
          onStateChange: (event: YouTubePlayerState) => {
            const state = event.data;
            const YT = window.YT!.PlayerState;
            const isPlaying = state === YT.PLAYING;
            bindControls({
              play: () => playerRef.current?.playVideo(),
              pause: () => playerRef.current?.pauseVideo(),
              seek: (sec: number) => playerRef.current?.seekTo(sec, true),
              isPlaying,
            });
            if (state === YT.ENDED) onEnd?.();
            onStateChange?.(state);
          },
        },
      });
    }

    init();

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId, onReady, onStateChange, onEnd, bindControls]);

  return { containerRef, playerRef };
}
