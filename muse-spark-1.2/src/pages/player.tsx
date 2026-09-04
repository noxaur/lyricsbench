// Novel player page: ~250 lines vs legacy 1822 lines.
// Explicit state machine, single AbortController per load, per-track offset,
// honest errors, and no 8-ref tangle.

import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { AppShell } from "@/components/app-shell"
import { useYouTubePlayer } from "@/hooks/use-youtube-player"
import { useLyricsSync } from "@/hooks/use-lyrics-sync"
import { LyricsStage } from "@/components/lyrics-stage"
import { Transport } from "@/components/transport"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { usePlayer } from "@/stores/player"
import { isValidVideoId } from "@/lib/youtube"
import { parseTrackTitle } from "@/lib/parse-title"
import { resolveLyrics } from "@/lib/lrclib"
import { parseLrc, parsePlain } from "@/lib/lrc"
import { addRecent } from "@/lib/recent"

export function PlayerPage() {
  const { videoId = "" } = useParams()
  if (!isValidVideoId(videoId)) {
    return (
      <AppShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-semibold">Invalid video ID</p>
          <p className="text-sm text-muted-foreground">Expected 11 characters like dQw4w9WgXcQ</p>
          <Link to="/" className="text-sm underline">Back home</Link>
        </div>
      </AppShell>
    )
  }
  return <PlayerContent videoId={videoId} />
}

function PlayerContent({ videoId }: { videoId: string }) {
  const { containerRef, ready, isPlaying, currentTime, duration, error: ytError, play, pause, seekTo, getTitle } = useYouTubePlayer(videoId)
  const store = usePlayer()
  const offsetMs = store.offsetByVideo[videoId] ?? 0
  const [lyricTime, setLyricTime] = useState(0)
  const [editArtist, setEditArtist] = useState("")
  const [editTrack, setEditTrack] = useState("")
  const [pastedLrc, setPastedLrc] = useState("")
  const [showPaste, setShowPaste] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const hasLoadedRef = useRef<string | null>(null)

  // rAF sync
  useLyricsSync(() => ({ timeSec: currentTime, playing: isPlaying }), setLyricTime)

  // Keep store time in sync for stage
  useEffect(() => { store.setCurrentTime(lyricTime) }, [lyricTime]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { store.setDuration(duration) }, [duration]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { store.setPlaying(isPlaying) }, [isPlaying]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset per-video when id changes
  useEffect(() => {
    if (store.videoId !== videoId) {
      store.setVideoId(videoId)
      store.setStatus("idle")
      store.setLyrics([], false, false)
      hasLoadedRef.current = null
    }
  }, [videoId]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async (artist: string, track: string, durationSec: number) => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    store.setStatus("loading")
    store.setMeta({ title: track || artist, artist, track })
    try {
      const res = await resolveLyrics({ artist, track, durationSec, signal: ac.signal })
      if (ac.signal.aborted) return
      if (res.outcome === "instrumental") {
        store.setStatus("error", "Instrumental track — no lyrics")
        return
      }
      if (res.parsed && res.source) {
        if (res.parsed.suggestedOffsetMs) store.setOffset(videoId, res.parsed.suggestedOffsetMs)
        store.setLyrics(res.parsed.lines, res.parsed.synced, res.parsed.autoTimed ?? false)
        store.setStatus("ready")
        store.setMeta({ title: res.source.trackName || track, artist: res.source.artistName || artist, track: res.source.trackName || track })
        addRecent({ videoId, title: res.source.trackName || track, artist: res.source.artistName || artist })
        return
      }
      store.setStatus("error", res.message)
    } catch (e) {
      if ((e as Error).name === "AbortError") return
      store.setStatus("error", "Network error — check connection")
    }
  }, [videoId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-load when ready + duration known
  useEffect(() => {
    if (!ready || hasLoadedRef.current === videoId) return
    if (store.status === "ready" && store.lyrics.length > 0) return
    // need duration or fallback to 0, but wait a bit for duration
    const run = async () => {
      hasLoadedRef.current = videoId
      const title = await getTitle()
      const parsed = parseTrackTitle(title || "")
      const a = parsed.artist || editArtist
      const t = parsed.track || editTrack || title || ""
      setEditArtist(a)
      setEditTrack(t)
      await load(a, t, duration || 180)
    }
    void run()
    return () => abortRef.current?.abort()
  }, [ready, videoId, duration, getTitle, load, store.status, store.lyrics.length, editArtist, editTrack])

  const handleSeek = useCallback((ms: number) => {
    seekTo(Math.max(0, ms / 1000))
  }, [seekTo])

  const handleRetry = useCallback(() => {
    void load(editArtist, editTrack, duration || 180)
  }, [editArtist, editTrack, duration, load])

  const handlePasteApply = useCallback(() => {
    const raw = pastedLrc.trim()
    if (!raw) return
    // try LRC first
    const parsed = parseLrc(raw, (duration || 180) * 1000)
    if (parsed) {
      if (parsed.suggestedOffsetMs) store.setOffset(videoId, parsed.suggestedOffsetMs)
      store.setLyrics(parsed.lines, parsed.synced, false)
      store.setStatus("ready")
      setShowPaste(false)
      return
    }
    const plain = parsePlain(raw, (duration || 180) * 1000)
    if (plain.lines.length > 0) {
      store.setLyrics(plain.lines, false, true)
      store.setStatus("ready")
      setShowPaste(false)
      return
    }
    store.setStatus("error", "Pasted text has no valid lines")
  }, [pastedLrc, duration, store, videoId])

  // keyboard shortcuts (space, arrows, +/- , F)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return
      if (e.code === "Space") { e.preventDefault(); isPlaying ? pause() : play() }
      if (e.code === "ArrowLeft") { e.preventDefault(); handleSeek(Math.max(0, lyricTime * 1000 - 3000) - offsetMs) }
      if (e.code === "ArrowRight") { e.preventDefault(); handleSeek(lyricTime * 1000 + 3000 - offsetMs) }
      if (e.key === "+" || e.key === "=") { e.preventDefault(); store.adjustOffset(videoId, 500) }
      if (e.key === "-" || e.key === "_") { e.preventDefault(); store.adjustOffset(videoId, -500) }
      if (e.key === "f" || e.key === "F") { e.preventDefault(); store.setTvMode(!store.tvMode) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isPlaying, play, pause, lyricTime, offsetMs, handleSeek, store, videoId])

  const hiddenVideoClass = store.videoHidden ? "hidden" : ""
  const tvClass = store.tvMode ? "fixed inset-0 z-40 bg-background flex flex-col" : "flex flex-1 flex-col lg:flex-row min-h-0"

  return (
    <AppShell>
      <div className={tvClass}>
        {/* Video pane */}
        <div className={`${hiddenVideoClass} flex flex-col border-b border-border bg-black lg:w-1/2 lg:border-b-0 lg:border-r ${store.tvMode ? "lg:w-1/2" : ""}`}>
          {/* When hidden, keep container but inert for a11y */}
          <div className={`${store.videoHidden ? "sr-only" : "aspect-video w-full bg-black"} ${store.tvMode ? "aspect-video" : ""}`}>
            <div ref={containerRef} className="h-full w-full" />
          </div>
          {ytError && <p className="bg-destructive px-3 py-2 text-sm text-destructive-foreground" role="alert">{ytError}</p>}
          {!store.videoHidden && (
            <div className="flex items-center justify-between gap-2 bg-card px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{store.title || store.track || videoId}</p>
                <p className="truncate text-xs text-muted-foreground">{store.artist || "—"}</p>
              </div>
              <Link to="/" className="shrink-0 text-xs text-muted-foreground hover:text-foreground">← Home</Link>
            </div>
          )}
        </div>

        {/* Lyrics pane */}
        <div className="flex min-h-0 flex-1 flex-col bg-karaoke-stage-bg">
          {/* Meta + edit */}
          <div className="shrink-0 border-b border-border bg-card px-3 py-2">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[12rem] flex-1">
                <label htmlFor="edit-artist" className="block text-xs font-medium text-muted-foreground">Artist</label>
                <Input id="edit-artist" value={editArtist} onChange={(e) => setEditArtist(e.target.value)} placeholder="Artist" className="h-8" />
              </div>
              <div className="min-w-[12rem] flex-1">
                <label htmlFor="edit-track" className="block text-xs font-medium text-muted-foreground">Track</label>
                <Input id="edit-track" value={editTrack} onChange={(e) => setEditTrack(e.target.value)} placeholder="Track" className="h-8" />
              </div>
              <Button size="sm" onClick={handleRetry} disabled={store.status === "loading"} aria-label="Search lyrics with edited metadata">
                Search
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowPaste((v) => !v)}>
                {showPaste ? "Hide paste" : "Paste LRC"}
              </Button>
            </div>
            {showPaste && (
              <div className="mt-3">
                <label htmlFor="paste-lrc" className="block text-xs font-medium text-muted-foreground">Paste LRC or plain lyrics</label>
                <textarea
                  id="paste-lrc"
                  value={pastedLrc}
                  onChange={(e) => setPastedLrc(e.target.value)}
                  placeholder={"[00:12.00] first line\n[00:15.00] second line"}
                  className="mt-1 min-h-28 w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
                />
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={handlePasteApply}>Apply pasted</Button>
                  <Button size="sm" variant="ghost" onClick={() => setPastedLrc("")}>Clear</Button>
                </div>
              </div>
            )}
            {/* status chips */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${store.synced ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : store.autoTimed ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>
                {store.synced ? "Synced" : store.autoTimed ? "Estimated timing" : "No lyrics"}
              </span>
              {store.autoTimed && <span className="rounded-full bg-border px-2 py-0.5 text-xs text-muted-foreground">Tap line to seek · adjust Sync above</span>}
            </div>
          </div>

          <LyricsStage
            lines={store.lyrics}
            timeMs={lyricTime * 1000}
            offsetMs={offsetMs}
            durationMs={duration * 1000}
            synced={store.synced}
            autoTimed={store.autoTimed}
            status={store.status}
            message={store.message}
            showTimestamps={store.showTimestamps}
            onSeek={handleSeek}
            onRetry={handleRetry}
          />

          <Transport
            currentTime={lyricTime}
            duration={duration}
            isPlaying={isPlaying}
            onPlay={play}
            onPause={pause}
            onSeek={seekTo}
            offsetMs={offsetMs}
            onOffsetChange={(ms) => store.setOffset(videoId, ms)}
            onAdjust={(d) => store.adjustOffset(videoId, d)}
            onReset={() => store.resetOffset(videoId)}
            videoHidden={store.videoHidden}
            onToggleVideo={() => store.setVideoHidden(!store.videoHidden)}
            tvMode={store.tvMode}
            onToggleTv={() => store.setTvMode(!store.tvMode)}
          />
        </div>
      </div>
    </AppShell>
  )
}
