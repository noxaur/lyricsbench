import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { VIDEO_ID_RE } from "@/lib/youtube";
import { useYouTube } from "@/player/youtube-view";
import { useLyricsMachine, type LyricsMachine } from "@/player/machine";
import { LyricsStage } from "@/player/lyrics-stage";
import { Transport } from "@/player/transport";

/**
 * Loader: the ONLY place that decides whether /play/:videoId is valid.
 * Invalid IDs throw before any player, network, or lyrics code runs —
 * replacing the old component-level MisroutedRouteView + alias-guessing
 * machinery with one check.
 */
export function playLoader({ params }: LoaderFunctionArgs) {
  const videoId = params.videoId ?? "";
  if (!VIDEO_ID_RE.test(videoId)) {
    throw new Response(
      `"${videoId || "(missing)"}" isn't a valid YouTube video ID (11 letters, digits, _ or -). Check the link and try again.`,
      { status: 404, statusText: "Invalid video" },
    );
  }
  return { videoId };
}

const HIDDEN_KEY = "umbra.videoHidden.v1";
const TIMES_KEY = "umbra.showTimes.v1";

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function Play() {
  const { videoId } = useLoaderData() as { videoId: string };
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [videoHidden, setVideoHidden] = useState(() => readFlag(HIDDEN_KEY));
  const [showTimestamps, setShowTimestamps] = useState(() => readFlag(TIMES_KEY));

  const clock = useYouTube(videoId, mountRef, { hidden: videoHidden });
  const machine = useLyricsMachine(videoId, clock.title, clock.durationSec, clock.ready);
  const { state } = machine;

  const toggleVideo = useCallback(() => {
    setVideoHidden((v) => {
      try {
        localStorage.setItem(HIDDEN_KEY, v ? "0" : "1");
      } catch {
        // ignore
      }
      return !v;
    });
  }, []);

  const toggleTimestamps = useCallback(() => {
    setShowTimestamps((v) => {
      try {
        localStorage.setItem(TIMES_KEY, v ? "0" : "1");
      } catch {
        // ignore
      }
      return !v;
    });
  }, []);

  const togglePlay = useCallback(() => {
    if (clock.isPlaying) clock.pause();
    else clock.play();
  }, [clock]);

  // Keyboard shortcuts. Scoped: ignored while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          clock.seekTo(clock.timeSec - (e.shiftKey ? 10 : 5));
          break;
        case "ArrowRight":
          clock.seekTo(clock.timeSec + (e.shiftKey ? 10 : 5));
          break;
        case "+":
        case "=":
          machine.nudgeOffset(250);
          break;
        case "-":
        case "_":
          machine.nudgeOffset(-250);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clock, togglePlay, machine]);

  const title = state.kind === "ready" || state.kind === "instrumental" || state.kind === "not_found"
    ? state.title || clock.title || "Loading…"
    : clock.title || "Loading…";
  const artist =
    state.kind === "ready" || state.kind === "instrumental" || state.kind === "not_found"
      ? state.artist
      : "";
  const track =
    state.kind === "ready" || state.kind === "instrumental" || state.kind === "not_found"
      ? state.track
      : "";

  return (
    <section className="player">
      <Link to="/" className="back-link">
        ← Back home
      </Link>

      <div className="now-playing">
        <h2>{title}</h2>
        {(artist || track) && (
          <span className="artist">
            {[artist, track].filter(Boolean).join(" — ")}
          </span>
        )}
        <div className="badges">
          {state.kind === "ready" && state.synced && (
            <span className="badge badge-success">Synced</span>
          )}
          {state.kind === "ready" && !state.synced && (
            <span className="badge badge-warn">Auto-timed</span>
          )}
          {state.kind === "ready" && (
            <span className="badge">{state.provider}</span>
          )}
          {state.kind === "ready" && state.fromCache && (
            <span className="badge badge-info">Cached</span>
          )}
          {state.kind === "ready" && state.englishOffered && (
            <span className="badge badge-info">Non-English</span>
          )}
        </div>
      </div>

      {clock.error ? (
        <div className="stage-status" role="alert">
          <p>{clock.error}</p>
          <a className="btn" href={`https://www.youtube.com/watch?v=${videoId}`}>
            Open on YouTube
          </a>
        </div>
      ) : (
        <div ref={mountRef} className={videoHidden ? "video-wrap hidden-video" : "video-wrap"} />
      )}

      <MachineBody
        state={machine.state}
        timeSec={clock.timeSec}
        isPlaying={clock.isPlaying}
        durationSec={clock.durationSec}
        showTimestamps={showTimestamps}
        onSeek={clock.seekTo}
        offsetMs={machine.offsetMs}
        onRetry={machine.retry}
        onUseAlternate={machine.useAlternate}
      />

      <Transport
        isPlaying={clock.isPlaying}
        timeSec={clock.timeSec}
        durationSec={clock.durationSec}
        offsetMs={machine.offsetMs}
        videoHidden={videoHidden}
        showTimestamps={showTimestamps}
        onTogglePlay={togglePlay}
        onSeek={clock.seekTo}
        onNudgeOffset={machine.nudgeOffset}
        onResetOffset={machine.resetOffset}
        onToggleVideo={toggleVideo}
        onToggleTimestamps={toggleTimestamps}
      />
    </section>
  );
}

/**
 * Pure renderer for the machine state. Play owns the single hook instance
 * and passes state down — no second subscription, no duplicated requests.
 */
function MachineBody({
  state,
  timeSec,
  isPlaying,
  durationSec,
  showTimestamps,
  onSeek,
  offsetMs,
  onRetry,
  onUseAlternate,
}: {
  state: LyricsMachine["state"];
  timeSec: number;
  isPlaying: boolean;
  durationSec: number;
  showTimestamps: boolean;
  onSeek: (s: number) => void;
  offsetMs: number;
  onRetry: () => void;
  onUseAlternate: LyricsMachine["useAlternate"];
}) {
  switch (state.kind) {
    case "idle":
    case "resolving":
    case "searching":
      return (
        <div className="stage" aria-label="Loading lyrics">
          <div className="stage-status" role="status">
            <span className="spinner" aria-hidden="true" />
            <span>
              {state.kind === "searching"
                ? `Searching lyrics for ${state.artist} — ${state.track}…`
                : "Resolving song…"}
            </span>
          </div>
        </div>
      );
    case "ready":
      return (
        <>
          <LyricsStage
            lines={state.lines}
            timeSec={timeSec}
            isPlaying={isPlaying}
            offsetMs={offsetMs}
            durationMs={Math.round(durationSec * 1000)}
            showTimestamps={showTimestamps}
            onSeek={onSeek}
          />
          {state.alternates.length > 0 && (
            <div className="alternates">
              <span>Other matches:</span>
              {state.alternates.map((alt) => (
                <button key={alt.id} type="button" onClick={() => onUseAlternate(alt)}>
                  {alt.artistName} — {alt.trackName}
                </button>
              ))}
            </div>
          )}
        </>
      );
    case "instrumental":
      return (
        <div className="stage" aria-label="Instrumental track">
          <div className="stage-status">
            <span style={{ fontSize: "2rem" }} aria-hidden="true">
              ♪
            </span>
            <p>This track is marked instrumental — no lyrics to sing.</p>
          </div>
        </div>
      );
    case "not_found":
      return (
        <div className="stage" aria-label="Lyrics not found">
          <div className="stage-status" role="status">
            <p>{state.message}</p>
            <button type="button" className="btn" onClick={onRetry}>
              Retry
            </button>
          </div>
        </div>
      );
    case "error":
      return (
        <div className="stage" aria-label="Lyrics error">
          <div className="stage-status" role="alert">
            <p>{state.message}</p>
            <button type="button" className="btn" onClick={onRetry}>
              Retry
            </button>
          </div>
        </div>
      );
  }
}
