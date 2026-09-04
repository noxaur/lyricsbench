import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft, Eye, EyeOff, Maximize, Minimize, Monitor, Settings, Keyboard } from "lucide-react";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { LyricsStage } from "@/components/lyrics-stage";
import { TransportBar } from "@/components/transport-bar";
import { NowPlayingHeader } from "@/components/now-playing-header";
import { DisplayModePicker } from "@/components/display-mode-picker";
import { useYouTubePlayer } from "@/hooks/use-youtube-player";
import { useLyricsSync } from "@/hooks/use-lyrics-sync";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { extractVideoId, parseTrackTitle } from "@/lib/youtube";
import { parseLrc, parsePlainLyrics } from "@/lib/lrc/parser";
import { runLyricsPipeline } from "@/lib/lyrics/pipeline";
import { getLyricsCache, setLyricsCache } from "@/lib/lyrics/cache";
import { addRecentSong } from "@/lib/recent-songs";
import { usePlayerStore } from "@/stores/player-store";
import { cn } from "@/lib/utils";

export default function PlayerPage() {
  const { videoId: rawVideoId } = useParams();
  const navigate = useNavigate();
  const videoId = rawVideoId ? extractVideoId(rawVideoId) ?? rawVideoId : "";

  const store = usePlayerStore();
  const { setVideoId, setMeta, setStatus, setLyrics, setDurationMs, setStageFullscreen, setVideoHidden, setFocusMode, setTvMode, videoHidden, focusMode, tvMode } = store;

  const abortRef = useRef<AbortController | null>(null);
  const loadedRef = useRef(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useKeyboardShortcuts();

  // YouTube player
  const onVideoReady = useCallback(() => {
    setStatus("ready");
  }, [setStatus]);

  const onVideoEnd = useCallback(() => {
    // Could auto-advance playlist
  }, []);

  const { containerRef: youtubeContainerRef, playerRef } = useYouTubePlayer({
    videoId,
    onReady: onVideoReady,
    onEnd: onVideoEnd,
  });

  // Lyrics sync from playback
  useLyricsSync(() => ({
    timeSec: playerRef.current?.getCurrentTime?.() ?? 0,
    isPlaying: usePlayerStore.getState().isPlaying,
  }));

  // Set video ID and resolve metadata + lyrics
  useEffect(() => {
    if (!videoId) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setVideoId(videoId);
    setStatus("loading");

    // Check cache first
    const cached = getLyricsCache(videoId);
    if (cached) {
      setLyrics(cached.lines, cached.synced, cached.providerId, cached.autoTimed);
      setStatus("ready");
      return;
    }

    // Resolve metadata via oEmbed
    async function resolveAndFetch() {
      try {
        const oembedRes = await fetch(`/api/youtube/oembed?videoId=${videoId}`, { signal: controller.signal });
        if (oembedRes.ok) {
          const data = await oembedRes.json() as { title: string; author: string };
          const { artist, track } = parseTrackTitle(data.title);
          setMeta({ title: data.title, artist, track });
          addRecentSong({ videoId, title: data.title, artist, track });

          // Search for lyrics
          setStatus("loading");
          runLyricsPipeline(
            { artist, track, durationMs: 0, signal: controller.signal },
            (event) => {
              if (event.type === "done" && event.best) {
                const text = event.best.syncedLyrics ?? event.best.plainLyrics;
                if (text) {
                  const durationMs = usePlayerStore.getState().durationMs;
                  const parsed = event.best.syncedLyrics
                    ? parseLrc(text, durationMs)
                    : parsePlainLyrics(text, durationMs);
                  setLyrics(parsed.lines, parsed.synced, event.best.providerId, parsed.autoTimed);
                  setStatus("ready");
                  setLyricsCache({
                    videoId,
                    lines: parsed.lines,
                    synced: parsed.synced,
                    autoTimed: parsed.autoTimed,
                    providerId: event.best.providerId,
                    cachedAt: Date.now(),
                  });
                } else {
                  setStatus("error", "No lyrics found");
                }
              }
            },
          );
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setStatus("error", err instanceof Error ? err.message : "Failed to load");
        }
      }
    }

    resolveAndFetch();

    return () => {
      controller.abort();
    };
  }, [videoId]);

  // Sync duration from YouTube player
  useEffect(() => {
    const interval = setInterval(() => {
      const dur = playerRef.current?.getDuration?.();
      if (dur && dur > 0) {
        setDurationMs(dur * 1000);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [playerRef, setDurationMs]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setStageFullscreen(true);
    } else {
      document.exitFullscreen();
      setStageFullscreen(false);
    }
  }, [setStageFullscreen]);

  return (
    <div className={cn(
      "flex flex-1 flex-col bg-stage-floor",
      tvMode && "fixed inset-0 z-50",
    )}>
      {/* Top bar */}
      {!focusMode && !tvMode && (
        <header className="flex items-center justify-between border-b border-border bg-surface-card px-4 py-2">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <DisplayModePicker />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setVideoHidden(!videoHidden)}
                className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-foreground"
                title={videoHidden ? "Show video" : "Hide video (H)"}
              >
                {videoHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setFocusMode(!focusMode)}
                className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-foreground"
                title="Focus mode (F)"
              >
                <Minimize className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setTvMode(!tvMode)}
                className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-foreground"
                title="TV mode (T)"
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-foreground"
                title="Fullscreen"
              >
                <Maximize className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Focus mode exit button */}
      {focusMode && (
        <button
          type="button"
          onClick={() => setFocusMode(false)}
          className="fixed right-4 top-4 z-50 rounded-full bg-surface-card/80 p-2 text-ink-muted hover:text-foreground"
        >
          <Minimize className="h-4 w-4" />
        </button>
      )}

      {/* TV mode exit button */}
      {tvMode && (
        <button
          type="button"
          onClick={() => setTvMode(false)}
          className="fixed right-4 top-4 z-50 rounded-full bg-surface-card/80 p-2 text-ink-muted hover:text-foreground"
        >
          <Monitor className="h-4 w-4" />
        </button>
      )}

      {/* Main content */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Video panel */}
        {!videoHidden && (
          <div className={cn(
            "flex flex-col border-b border-border bg-surface-card lg:w-[400px] lg:border-b-0 lg:border-r",
            focusMode && "hidden",
          )}>
            <YouTubeEmbed containerRef={youtubeContainerRef} />
            <NowPlayingHeader />
          </div>
        )}

        {/* Lyrics stage */}
        <div className="flex min-h-0 flex-1 flex-col">
          <LyricsStage />
        </div>
      </div>

      {/* Transport bar */}
      {!focusMode && !tvMode && <TransportBar />}

      {/* Keyboard shortcuts overlay */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowShortcuts(false)}
        >
          <div className="rounded-lg bg-surface-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-sm font-semibold text-ink-primary">Keyboard Shortcuts</h3>
            <div className="grid gap-2 text-xs text-ink-muted">
              <div className="flex justify-between gap-8"><span>Play/Pause</span><kbd className="rounded border border-border px-1.5 py-0.5 text-foreground">Space</kbd></div>
              <div className="flex justify-between gap-8"><span>Seek -5s</span><kbd className="rounded border border-border px-1.5 py-0.5 text-foreground">←</kbd></div>
              <div className="flex justify-between gap-8"><span>Seek +5s</span><kbd className="rounded border border-border px-1.5 py-0.5 text-foreground">→</kbd></div>
              <div className="flex justify-between gap-8"><span>Shift timing -100ms</span><kbd className="rounded border border-border px-1.5 py-0.5 text-foreground">Shift+←</kbd></div>
              <div className="flex justify-between gap-8"><span>Shift timing +100ms</span><kbd className="rounded border border-border px-1.5 py-0.5 text-foreground">Shift+→</kbd></div>
              <div className="flex justify-between gap-8"><span>Focus mode</span><kbd className="rounded border border-border px-1.5 py-0.5 text-foreground">F</kbd></div>
              <div className="flex justify-between gap-8"><span>TV mode</span><kbd className="rounded border border-border px-1.5 py-0.5 text-foreground">T</kbd></div>
              <div className="flex justify-between gap-8"><span>Hide video</span><kbd className="rounded border border-border px-1.5 py-0.5 text-foreground">H</kbd></div>
            </div>
            <button
              type="button"
              onClick={() => setShowShortcuts(false)}
              className="mt-4 w-full rounded-md bg-surface-muted py-1.5 text-xs text-ink-muted hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
