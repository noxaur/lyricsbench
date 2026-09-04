import { useEffect, useRef, useState } from "react"
import { Link, useLoaderData } from "react-router"
import { BackIcon, CollapseIcon, ExpandIcon, RefreshIcon, SparkIcon, VideoIcon, VideoOffIcon } from "~/components/icons"
import { LyricsPasteDialog } from "~/components/lyrics-paste-dialog"
import { LyricsStage } from "~/components/lyrics-stage"
import { Transport } from "~/components/transport"
import { useLyricsSession } from "~/components/use-lyrics-session"
import { usePlayback } from "~/components/use-playback"
import { VideoSurface } from "~/components/video-surface"
import { DEMO_TRACK, DEMO_VIDEO_ID } from "~/lib/demo"
import { isYouTubeId } from "~/lib/media"

type LoaderData = { videoId: string; demo: boolean }

export function loader({ params }: { params: { videoId?: string } }) {
  const videoId = params.videoId ?? ""
  const demo = videoId === DEMO_VIDEO_ID
  if (!demo && !isYouTubeId(videoId)) {
    throw new Response("Not found", { status: 404 })
  }
  return { videoId, demo } satisfies LoaderData
}

export function meta({ params }: { params: { videoId?: string } }) {
  return [{ title: params.videoId === DEMO_VIDEO_ID ? "Night Signal — umbra" : "Now playing — umbra" }]
}

export default function PlayRoute() {
  const { videoId, demo } = useLoaderData<typeof loader>()
  const playerRoomRef = useRef<HTMLElement>(null)
  const playback = usePlayback({ videoId, demoDuration: demo ? (DEMO_TRACK.durationSec ?? 142) : 0 })
  const session = useLyricsSession({ videoId, durationSec: playback.duration, demo })
  const [videoVisible, setVideoVisible] = useState(true)
  const [offsetMs, setOffsetMs] = useState(0)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const setSafeOffset = (next: number) => setOffsetMs(Math.max(-5_000, Math.min(5_000, next)))

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === playerRoomRef.current)
    document.addEventListener("fullscreenchange", update)
    return () => document.removeEventListener("fullscreenchange", update)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await playerRoomRef.current?.requestFullscreen()
    } catch {
      // Fullscreen is optional; the layout remains usable when it is blocked.
    }
  }

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest("input, textarea, select, dialog, [contenteditable='true']")) return
      if (event.code === "Space") {
        event.preventDefault()
        playback.toggle()
      } else if (event.code === "ArrowLeft") {
        event.preventDefault()
        playback.seek(playback.currentTime - 5)
      } else if (event.code === "ArrowRight") {
        event.preventDefault()
        playback.seek(playback.currentTime + 5)
      } else if (event.key === "-") {
        event.preventDefault()
        setOffsetMs((value) => Math.max(-5_000, value - 100))
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault()
        setOffsetMs((value) => Math.min(5_000, value + 100))
      }
    }
    window.addEventListener("keydown", keydown)
    return () => window.removeEventListener("keydown", keydown)
  }, [playback])

  const empty = session.phase === "loading"
    ? { title: "Finding the words", description: "Matching this recording against a lyric source…" }
    : session.phase === "error"
      ? { title: "The lyric source is taking a break", description: session.message || "Try again, or paste a lyric sheet." }
      : session.phase === "empty" || session.lyrics.lines.length === 0
        ? { title: "No lyric sheet yet", description: session.message || "Paste lyrics to give this track a stage." }
        : null

  const trackTitle = session.metadata.title || "Preparing track"
  const trackArtist = session.metadata.artist || (demo ? DEMO_TRACK.artist : "YouTube")
  const currentTimeMs = playback.currentTime * 1000 + offsetMs

  return (
    <main ref={playerRoomRef} className={`player-room ${videoVisible ? "" : "player-room--lyrics-only"}`}>
      <header className="player-header">
        <Link className="back-home" to="/" title="Back home"><BackIcon size={18} /><span>Home</span></Link>
        <div className="now-playing" aria-live="polite">
          <span className={`now-playing__pulse ${playback.isPlaying ? "is-playing" : ""}`} aria-hidden />
          <span><strong>{trackTitle}</strong><em>{trackArtist}</em></span>
        </div>
        <div className="player-header__actions">
          {(session.phase === "error" || session.phase === "empty") ? <button className="header-action header-action--text" type="button" onClick={session.retry}><RefreshIcon size={16} /> Retry</button> : null}
          <button className="header-action header-action--text" type="button" onClick={() => setPasteOpen(true)}><SparkIcon size={16} /><span className="header-action__wide">Paste lyrics</span></button>
          <button className="header-action" type="button" onClick={() => setVideoVisible((visible) => !visible)} aria-label={videoVisible ? "Hide video" : "Show video"} title={videoVisible ? "Hide video" : "Show video"}>
            {videoVisible ? <VideoOffIcon size={18} /> : <VideoIcon size={18} />}
          </button>
          <button className="header-action" type="button" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} title={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
            {fullscreen ? <CollapseIcon size={18} /> : <ExpandIcon size={18} />}
          </button>
        </div>
      </header>

      <section className="player-stage-layout">
        <aside className="video-rail" aria-label="Video player" aria-hidden={!videoVisible}>
          <VideoSurface
            mountRef={playback.mountRef}
            videoId={videoId}
            metadata={session.metadata}
            demo={demo}
            isPlaying={playback.isPlaying}
            error={playback.error}
          />
          {!playback.isReady && !playback.error && !demo ? <p className="video-rail__loading">Opening YouTube player…</p> : null}
        </aside>
        <LyricsStage
          lines={session.lyrics.lines}
          currentTimeMs={currentTimeMs}
          synced={session.lyrics.synced}
          autoTimed={session.lyrics.autoTimed}
          source={session.source}
          onSeek={playback.seek}
          empty={empty}
        />
      </section>

      <Transport
        currentTime={playback.currentTime}
        duration={playback.duration}
        isPlaying={playback.isPlaying}
        onToggle={playback.toggle}
        onSeek={playback.seek}
        offsetMs={offsetMs}
        onOffsetChange={setSafeOffset}
      />
      <p className="player-shortcuts"><kbd>Space</kbd> play/pause <span>·</span> <kbd>←</kbd><kbd>→</kbd> seek <span>·</span> <kbd>−</kbd><kbd>+</kbd> nudge lyrics</p>
      <LyricsPasteDialog open={pasteOpen} onClose={() => setPasteOpen(false)} onSave={session.setPastedLyrics} />
    </main>
  )
}
