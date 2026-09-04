import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { CaretLeft } from "@phosphor-icons/react"
import { PlaybackClock } from "~/lib/clock"
import { YoutubeStage, useYouTube } from "~/components/youtube-stage"
import { LyricsStage } from "~/components/lyrics-stage"
import { Transport } from "~/components/transport"
import { fetchOembed, lyricsBody, resolveLyricsRequest, translateLines } from "~/lib/api"
import { parseLyricsText } from "~/lib/lrc"
import { parseTrackTitle } from "~/lib/titles"
import { detectLanguage, looksEnglish } from "~/lib/language"
import {
  addRecentSong,
  addToPlaylist,
  createPlaylist,
  getLyricsCache,
  getOffset,
  getPlaylist,
  getVideoHidden,
  readPlaylists,
  setLyricsCache,
  setOffset,
  setVideoHidden as persistVideoHidden,
} from "~/lib/storage"
import type { DisplayMode, LyricLine, LyricsHit, Playlist } from "~/lib/types"
import { YOUTUBE_VIDEO_ID_RE } from "~/lib/urls"
import { cn } from "~/lib/cn"

type NavState = {
  artist?: string
  track?: string
  title?: string
  durationSec?: number
  playlistId?: string
  trackIndex?: number
}

type Status = "booting" | "loading" | "ready" | "empty" | "error"

export function Player({ videoId }: { videoId: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const seed = (location.state ?? {}) as NavState
  const clock = useMemo(() => new PlaybackClock(), [videoId])
  const [status, setStatus] = useState<Status>("booting")
  const [message, setMessage] = useState("Opening player")
  const [title, setTitle] = useState(seed.title ?? "")
  const [artist, setArtist] = useState(seed.artist ?? "")
  const [track, setTrack] = useState(seed.track ?? "")
  const [lines, setLines] = useState<LyricLine[]>([])
  const [english, setEnglish] = useState<string[]>([])
  const [hit, setHit] = useState<LyricsHit | null>(null)
  const [autoTimed, setAutoTimed] = useState(false)
  const [synced, setSynced] = useState(false)
  const [offsetMs, setOffsetMs] = useState(() => getOffset(videoId))
  const [videoHidden, setVideoHidden] = useState(() => getVideoHidden())
  const [displayMode, setDisplayMode] = useState<DisplayMode>("native")
  const [editing, setEditing] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState("")
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const [searchGen, setSearchGen] = useState(0)
  const playlistId = seed.playlistId
  const trackIndex = seed.trackIndex ?? 0

  const onEnded = useCallback(() => {
    if (!playlistId) return
    const playlist = getPlaylist(playlistId)
    const next = playlist?.tracks[trackIndex + 1]
    if (!next) return
    navigate(`/play/${next.videoId}`, {
      state: { playlistId, trackIndex: trackIndex + 1, artist: next.artist, track: next.track, title: next.title },
    })
  }, [navigate, playlistId, trackIndex])

  const yt = useYouTube(videoId, clock, onEnded)

  const applyOffset = useCallback(
    (ms: number) => {
      setOffsetMs(ms)
      setOffset(videoId, ms)
    },
    [videoId],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return
      if (e.key === " ") {
        e.preventDefault()
        yt.isPlaying ? yt.pause() : yt.play()
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        yt.seekTo(Math.max(0, clock.now() - 5))
      }
      if (e.key === "ArrowRight") {
        e.preventDefault()
        yt.seekTo(clock.now() + 5)
      }
      if (e.key === "+" || e.key === "=") applyOffset(offsetMs + 500)
      if (e.key === "-") applyOffset(offsetMs - 500)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [yt, clock, offsetMs, applyOffset])

  useEffect(() => {
    const ac = new AbortController()
    void fetchOembed(videoId, ac.signal).then((data) => {
      if (!data || ac.signal.aborted) return
      setTitle((prev) => prev || data.title)
      const parsed = parseTrackTitle(data.title, data.author)
      setArtist((prev) => prev || parsed.artist)
      setTrack((prev) => prev || parsed.track || data.title)
    })
    return () => ac.abort()
  }, [videoId])

  useEffect(() => {
    setStatus("booting")
    setLines([])
    setEnglish([])
    setHit(null)
    setAutoTimed(false)
    setSynced(false)
    setOffsetMs(getOffset(videoId))
    setMessage("Opening player")
  }, [videoId])

  useEffect(() => {
    const ac = new AbortController()
    const run = async () => {
      const durationSec = yt.duration > 0 ? yt.duration : seed.durationSec ?? 0
      const durationMs = durationSec * 1000
      const cached = searchGen === 0 ? getLyricsCache(videoId) : null
      if (cached?.hit) {
        const parsed = parseLyricsText(lyricsBody(cached.hit), durationMs)
        if (parsed?.lines.length) {
          setHit(cached.hit)
          setLines(parsed.lines)
          setAutoTimed(parsed.autoTimed)
          setSynced(parsed.synced)
          setEnglish(cached.english ?? [])
          if (cached.english?.length) setDisplayMode("both")
          setStatus("ready")
          addRecentSong({ videoId, title: cached.title, artist: cached.artist, track: cached.track })
          return
        }
      }

      const resolvedArtist = artist || parseTrackTitle(title).artist
      const resolvedTrack = track || parseTrackTitle(title).track || title
      if (!resolvedTrack) {
        setStatus("loading")
        setMessage("Reading the video title")
        return
      }

      setStatus("loading")
      setMessage("Finding lyrics")

      try {
        const result = await resolveLyricsRequest(
          { artist: resolvedArtist, track: resolvedTrack, durationSec, title },
          ac.signal,
        )
        if (ac.signal.aborted) return
        if (result.status === "instrumental") {
          setStatus("empty")
          setMessage("This recording is marked instrumental")
          return
        }
        if (result.status === "empty") {
          setStatus("empty")
          setMessage(result.message)
          return
        }
        const parsed = parseLyricsText(lyricsBody(result.hit), durationMs)
        if (!parsed?.lines.length) {
          setStatus("empty")
          setMessage("Lyrics came back empty")
          return
        }
        setHit(result.hit)
        setLines(parsed.lines)
        setAutoTimed(parsed.autoTimed)
        setSynced(parsed.synced)
        setStatus("ready")
        addRecentSong({ videoId, title: title || resolvedTrack, artist: resolvedArtist, track: resolvedTrack })
        setLyricsCache({
          videoId,
          artist: resolvedArtist,
          track: resolvedTrack,
          title: title || resolvedTrack,
          durationSec,
          hit: result.hit,
        })

        const sample = parsed.lines.map((l) => l.text).join("\n")
        if (!looksEnglish(sample)) {
          const translated = await translateLines(parsed.lines.map((l) => l.text), detectLanguage(sample), ac.signal)
          if (translated.length === parsed.lines.length) {
            setEnglish(translated)
            setDisplayMode("both")
            setLyricsCache({
              videoId,
              artist: resolvedArtist,
              track: resolvedTrack,
              title: title || resolvedTrack,
              durationSec,
              hit: result.hit,
              english: translated,
            })
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setStatus("error")
        setMessage("Couldn't reach the lyrics service")
      }
    }
    void run()
    return () => ac.abort()
  }, [artist, title, track, videoId, searchGen, seed.durationSec])

  // Re-parse when YouTube duration arrives so LRC scaling / plain timing settle.
  useEffect(() => {
    if (!hit || yt.duration <= 0) return
    const parsed = parseLyricsText(lyricsBody(hit), yt.duration * 1000)
    if (!parsed?.lines.length) return
    setLines(parsed.lines)
    setAutoTimed(parsed.autoTimed)
    setSynced(parsed.synced)
  }, [hit, yt.duration])

  function handlePaste() {
    const parsed = parseLyricsText(pasteText, yt.duration * 1000)
    if (!parsed?.lines.length) {
      setMessage("Could not parse those lyrics")
      return
    }
    setLines(parsed.lines)
    setAutoTimed(parsed.autoTimed)
    setSynced(parsed.synced)
    setStatus("ready")
    setPasteOpen(false)
  }

  function retryWithMeta() {
    setLines([])
    setEnglish([])
    setStatus("loading")
    setEditing(false)
    setSearchGen((n) => n + 1)
  }

  const headerTitle = [track, artist].filter(Boolean).join(" · ") || title || "Loading"
  const syncLabel = autoTimed ? "Estimated" : synced ? "Synced" : undefined

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-stage">
      <header className="flex h-14 shrink-0 items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-1 text-sm text-dim hover:text-ink">
          <CaretLeft className="size-4" />
          Home
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <button type="button" className="max-w-full truncate text-sm hover:text-spot" onClick={() => setEditing((v) => !v)} title="Edit artist and track">
            {headerTitle}
          </button>
        </div>
        <button
          type="button"
          className="text-sm text-dim hover:text-ink"
          onClick={() => {
            setPlaylists(readPlaylists())
            setPlaylistOpen(true)
          }}
        >
          Save
        </button>
      </header>

      {editing && (
        <form
          className="flex flex-wrap items-end gap-2 border-b border-line px-4 py-2"
          onSubmit={(e) => {
            e.preventDefault()
            retryWithMeta()
          }}
        >
          <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-dim">
            Artist
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="rounded-md border border-line bg-panel px-2 py-1 text-sm text-ink"
            />
          </label>
          <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-dim">
            Track
            <input
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              className="rounded-md border border-line bg-panel px-2 py-1 text-sm text-ink"
            />
          </label>
          <button type="submit" className="rounded-md bg-spot px-3 py-1.5 text-sm text-spot-ink">
            Search again
          </button>
        </form>
      )}

      <div className={cn("flex min-h-0 flex-1 flex-col lg:flex-row", videoHidden && "lg:flex-col")}>
        <div className={cn("shrink-0 p-3 lg:w-[32%] lg:max-w-md lg:border-r lg:border-line lg:p-4", videoHidden && "contents")}>
          <YoutubeStage containerRef={yt.containerRef} hidden={videoHidden} />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {yt.error && (
            <div className="m-6 rounded-[10px] border border-line bg-panel p-6 text-center">
              <p className="font-lyric text-xl">Video didn't load</p>
              <p className="mt-2 text-sm text-dim">{yt.error.message || `YouTube error ${yt.error.code}`}</p>
            </div>
          )}
          {!yt.error && status !== "ready" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center stage-wash">
              <p className="font-lyric text-2xl text-dim">{message}</p>
              {(status === "empty" || status === "error") && (
                <button type="button" className="text-sm text-spot hover:underline" onClick={() => setPasteOpen(true)}>
                  Paste lyrics
                </button>
              )}
            </div>
          )}
          {status === "ready" && (
            <>
              {autoTimed && <p className="px-4 pt-2 text-center text-xs text-dim">Timing is estimated. Use +/- to nudge.</p>}
              <LyricsStage
                lines={lines}
                english={english}
                displayMode={displayMode}
                clock={clock}
                offsetMs={offsetMs}
                onSeek={yt.seekTo}
              />
            </>
          )}
        </div>
      </div>

      <Transport
        clock={clock}
        duration={yt.duration}
        isPlaying={yt.isPlaying}
        offsetMs={offsetMs}
        videoHidden={videoHidden}
        displayMode={displayMode}
        hasEnglish={english.length > 0}
        syncLabel={syncLabel}
        onPlay={yt.play}
        onPause={yt.pause}
        onSeek={yt.seekTo}
        onNudge={(delta) => applyOffset(offsetMs + delta)}
        onToggleVideo={() => {
          const next = !videoHidden
          setVideoHidden(next)
          persistVideoHidden(next)
        }}
        onDisplayMode={setDisplayMode}
      />

      {pasteOpen && (
        <dialog open className="fixed inset-0 z-30 flex items-center justify-center bg-canvas/70 p-4 backdrop-blur-sm">
          <form
            className="w-full max-w-lg rounded-[10px] border border-line bg-panel p-4"
            onSubmit={(e) => {
              e.preventDefault()
              handlePaste()
            }}
          >
            <h2 className="font-lyric text-xl">Paste lyrics</h2>
            <p className="mt-1 text-sm text-dim">LRC timestamps work. Plain text is timed across the song.</p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={12}
              className="mt-3 w-full rounded-[10px] border border-line bg-canvas px-3 py-2 text-sm"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className="px-3 py-1.5 text-sm text-dim" onClick={() => setPasteOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="rounded-md bg-spot px-3 py-1.5 text-sm text-spot-ink">
                Use lyrics
              </button>
            </div>
          </form>
        </dialog>
      )}

      {playlistOpen && (
        <dialog open className="fixed inset-0 z-30 flex items-center justify-center bg-canvas/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[10px] border border-line bg-panel p-4">
            <h2 className="font-lyric text-xl">Add to playlist</h2>
            <ul className="mt-3 divide-y divide-line">
              {playlists.map((playlist) => (
                <li key={playlist.id}>
                  <button
                    type="button"
                    className="w-full px-1 py-2 text-left text-sm hover:text-spot"
                    onClick={() => {
                      addToPlaylist(playlist.id, { videoId, title: title || track, artist, track })
                      setPlaylistOpen(false)
                    }}
                  >
                    {playlist.name}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-3 text-sm text-spot"
              onClick={() => {
                const name = window.prompt("Playlist name")
                if (!name?.trim()) return
                const created = createPlaylist(name)
                addToPlaylist(created.id, { videoId, title: title || track, artist, track })
                setPlaylistOpen(false)
              }}
            >
              New playlist
            </button>
            <button type="button" className="mt-2 block text-sm text-dim" onClick={() => setPlaylistOpen(false)}>
              Close
            </button>
          </div>
        </dialog>
      )}
    </div>
  )
}

export function isPlayableId(id: string) {
  return YOUTUBE_VIDEO_ID_RE.test(id)
}
