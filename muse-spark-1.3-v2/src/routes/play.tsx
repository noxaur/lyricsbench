import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { VIDEO_ID_RE } from "@/lib/ids";
import { BlockedPlayer, useYouTube } from "@/player/youtube";
import { useLyricsMachine, type LyricsMachine } from "@/player/lyrics";
import { LyricsStage } from "@/player/stage";
import { Transport } from "@/player/transport";
import { readPrefs, writePrefs } from "@/lib/store";

/**
 * Loader: the ONLY place that decides whether /play/:videoId is valid.
 * Reads an optional ?t= start offset (seconds) so timestamped share links
 * survive navigation. Invalid IDs throw before any player, network, or
 * lyrics code runs.
 */
export function playLoader({ params, request }: LoaderFunctionArgs) {
  const videoId = params.videoId ?? "";
  if (!VIDEO_ID_RE.test(videoId)) {
    throw new Response(
      `"${videoId || "(missing)"}" isn't a valid YouTube video ID (11 letters, digits, _ or -). Check the link and try again.`,
      { status: 404, statusText: "Invalid video" },
    );
  }
  let startAt = 0;
  try {
    const url = new URL(request.url);
    const raw = url.searchParams.get("t") ?? url.searchParams.get("start");
    if (raw) {
      if (/^\d+(\.\d+)?$/.test(raw.trim())) startAt = Math.min(86399, Math.max(0, Math.floor(Number(raw))));
      else {
        const m = raw.trim().toLowerCase().match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s?)?$/);
        if (m && (m[1] !== undefined || m[2] !== undefined || m[3] !== undefined)) {
          const h = m[1] === undefined ? 0 : Number(m[1]);
          const min = m[2] === undefined ? 0 : Number(m[2]);
          const sec = m[3] === undefined || m[3] === "" ? 0 : Number(m[3]);
          if ([h, min, sec].every(Number.isFinite)) {
            startAt = Math.min(86399, Math.max(0, Math.floor(h * 3600 + min * 60 + sec)));
          }
        }
      }
    }
  } catch {
    // ignore malformed URLs
  }
  return { videoId, startAt };
}

export function Play() {
  const { videoId, startAt } = useLoaderData() as { videoId: string; startAt: number };
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [prefs, setPrefs] = useState(readPrefs);

  useEffect(() => {
    writePrefs(prefs);
  }, [prefs]);

  const clock = useYouTube(videoId, mountRef, { hidden: prefs.videoHidden, startAt });
  const machine = useLyricsMachine(videoId, clock.title, clock.durationSec);
  const { state } = machine;

  const toggleVideo = useCallback(() => {
    setPrefs((p) => ({ ...p, videoHidden: !p.videoHidden }));
  }, []);

  const toggleTimestamps = useCallback(() => {
    setPrefs((p) => ({ ...p, showTimes: !p.showTimes }));
  }, []);

  const togglePlay = useCallback(() => {
    if (clock.isPlaying) clock.pause();
    else clock.play();
  }, [clock]);

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
          clock.seekTo(clock.uiTimeSec - (e.shiftKey ? 10 : 5));
          break;
        case "ArrowRight":
          clock.seekTo(clock.uiTimeSec + (e.shiftKey ? 10 : 5));
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

  const title =
    state.kind === "ready" || state.kind === "instrumental" || state.kind === "not_found"
      ? state.title || clock.title || "Loading…"
      : clock.title || "Loading…";
  const artist =
    state.kind === "ready" || state.kind === "instrumental" || state.kind === "not_found" ? state.artist : "";
  const track =
    state.kind === "ready" || state.kind === "instrumental" || state.kind === "not_found" ? state.track : "";

  const copyLink = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}#/play/${videoId}`;
    const plain = `${window.location.origin}/play/${videoId}`;
    try {
      void navigator.clipboard?.writeText(window.location.href.includes("#") ? url : plain);
    } catch {
      // clipboard unavailable — no-op
    }
  }, [videoId]);

  return (
    <section className="player">
      <Link to="/" className="back-link">
        ← Back home
      </Link>

      <div className="now-playing">
        <h2>{title}</h2>
        {(artist || track) && <span className="artist">{[artist, track].filter(Boolean).join(" — ")}</span>}
        <div className="badges">
          {state.kind === "ready" && state.synced && <span className="badge badge-success">Synced</span>}
          {state.kind === "ready" && !state.synced && <span className="badge badge-warn">Auto-timed</span>}
          {state.kind === "ready" && <span className="badge">{state.provider}</span>}
          {state.kind === "ready" && state.fromCache && <span className="badge badge-info">Cached</span>}
          {state.kind === "ready" && state.englishOffered && <span className="badge badge-info">Non-English</span>}
        </div>
        <button type="button" className="btn btn-ghost btn-small" onClick={copyLink} title="Copy link to this song">
          Copy link
        </button>
      </div>

      {clock.error ? (
        <div className="stage-status" role="alert">
          <p>{clock.error}</p>
          <a className="btn" href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer">
            Open on YouTube
          </a>
        </div>
      ) : clock.apiBlocked ? (
        <BlockedPlayer videoId={videoId} onRetry={clock.retryApi} />
      ) : (
        <div ref={mountRef} className={prefs.videoHidden ? "video-wrap hidden-video" : "video-wrap"} />
      )}

      <MachineBody
        state={machine.state}
        timeRef={clock.timeRef}
        uiTimeSec={clock.uiTimeSec}
        isPlaying={clock.isPlaying}
        durationSec={clock.durationSec}
        showTimestamps={prefs.showTimes}
        onSeek={clock.seekTo}
        offsetMs={machine.offsetMs}
        onRetry={machine.retry}
        onUseAlternate={machine.useAlternate}
      />

      <Transport
        isPlaying={clock.isPlaying}
        timeSec={clock.uiTimeSec}
        durationSec={clock.durationSec}
        offsetMs={machine.offsetMs}
        videoHidden={prefs.videoHidden}
        showTimestamps={prefs.showTimes}
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

function MachineBody({
  state,
  timeRef,
  uiTimeSec,
  isPlaying,
  durationSec,
  showTimestamps,
  onSeek,
  offsetMs,
  onRetry,
  onUseAlternate,
}: {
  state: LyricsMachine["state"];
  timeRef: RefObject<number>;
  uiTimeSec: number;
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
            timeRef={timeRef}
            uiTimeSec={uiTimeSec}
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
