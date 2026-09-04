import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { CaretLeft } from "@phosphor-icons/react"
import { PlaybackClock } from "~/lib/clock"
import { YoutubeStage, useYouTube } from "~/components/youtube-stage"
import { LyricsReel } from "~/components/lyrics-reel"
import { Transport } from "~/components/transport"
import { parseLyricsText } from "~/lib/lrc"
import { useLyricsLoader } from "~/lib/use-lyrics-loader"
import {
  addToPlaylist,
  createPlaylist,
  getOffset,
  getPlaylist,
  getVideoHidden,
  readPlaylists,
  setOffset,
  setVideoHidden as persistVideoHidden,
} from "~/lib/storage"
import type { DisplayMode, Playlist } from "~/lib/types"
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

export function Player({ videoId }: { videoId: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const seed = (location.state ?? {}) as NavState
  const clock = useMemo(() => new PlaybackClock(), [videoId])
  const [offsetMs, setOffsetMs] = useState(() => getOffset(videoId))
  const [videoHidden, setVideoHidden] = useState(() => getVideoHidden())
  const [displayMode, setDisplayMode] = useState<DisplayMode>("native")
  const [editing, setEditing] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState("")
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [playlistOpen, setPlaylistOpen] = useState(false)
  const [searchGen, setSearchGen] = useState(0)
  const [meta, setMeta] = useState({ artist: seed.artist ?? "", track: seed.track ?? "", title: seed.title ?? "" })
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
  const { state: lyrics, dispatch } = useLyricsLoader(videoId, yt.duration, meta, seed.durationSec, searchGen)

  useEffect(() => {
    if (lyrics.displayMode !== "native" && lyrics.english.length > 0) {
      setDisplayMode(lyrics.displayMode)
    }
  }, [lyrics.displayMode, lyrics.english.length])

  useEffect(() => {
    setOffsetMs(getOffset(videoId))
    setMeta({ artist: seed.artist ?? "", track: seed.track ?? "", title: seed.title ?? "" })
  }, [videoId, seed.artist, seed.track, seed.title])

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

  function handlePaste() {
    const parsed = parseLyricsText(pasteText, yt.duration * 1000)
    if (!parsed?.lines.length) return
    dispatch({ type: "paste", lines: parsed.lines, autoTimed: parsed.autoTimed })
    setPasteOpen(false)
  }

  function retryWithMeta() {
    setEditing(false)
    setSearchGen((n) => n + 1)
  }

  const artist = meta.artist
  const track = meta.track
  const title = meta.title
  const headerTitle = [track, artist].filter(Boolean).join(" - ") || title || "Loading"
  const ready = lyrics.status === "ready"

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-stage">
      <header className="flex h-14 shrink-0 items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-1 text-sm text-dim hover:text-ink">
          <CaretLeft className="size-4" />
          Home
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <button
            type="button"
            className="max-w-full truncate text-sm hover:text-ember"
            onClick={() => setEditing((v) => !v)}
            title="Edit artist and track"
          >
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
              value={meta.artist}
              onChange={(e) => setMeta((m) => ({ ...m, artist: e.target.value }))}
              className="rounded-md border border-line bg-panel px-2 py-1 text-sm text-ink"
            />
          </label>
          <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-dim">
            Track
            <input
              value={meta.track}
              onChange={(e) => setMeta((m) => ({ ...m, track: e.target.value }))}
              className="rounded-md border border-line bg-panel px-2 py-1 text-sm text-ink"
            />
          </label>
          <button type="submit" className="rounded-md bg-ember px-3 py-1.5 text-sm text-ember-ink">
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
            <div className="m-6 rounded-[12px] border border-line bg-panel p-6 text-center">
              <p className="font-lyric text-xl">Video didn't load</p>
              <p className="mt-2 text-sm text-dim">{yt.error.message || `YouTube error ${yt.error.code}`}</p>
            </div>
          )}
          {!yt.error && !ready && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="font-lyric text-2xl text-dim">{lyrics.message || "Opening player"}</p>
              {(lyrics.status === "empty" || lyrics.status === "error") && (
                <button type="button" className="text-sm text-ember hover:underline" onClick={() => setPasteOpen(true)}>
                  Paste lyrics
                </button>
              )}
            </div>
          )}
          {ready && (
            <>
              {lyrics.autoTimed && (
                <p className="px-4 pt-2 text-center text-xs text-dim">Timing is estimated. Use +/- to nudge.</p>
              )}
              <LyricsReel
                lines={lyrics.lines}
                english={lyrics.english}
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
        hasEnglish={lyrics.english.length > 0}
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
            className="w-full max-w-lg rounded-[12px] border border-line bg-panel p-4"
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
              className="mt-3 w-full rounded-[12px] border border-line bg-canvas px-3 py-2 text-sm"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className="px-3 py-1.5 text-sm text-dim" onClick={() => setPasteOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="rounded-md bg-ember px-3 py-1.5 text-sm text-ember-ink">
                Use lyrics
              </button>
            </div>
          </form>
        </dialog>
      )}

      {playlistOpen && (
        <dialog open className="fixed inset-0 z-30 flex items-center justify-center bg-canvas/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[12px] border border-line bg-panel p-4">
            <h2 className="font-lyric text-xl">Add to playlist</h2>
            <ul className="mt-3 divide-y divide-line">
              {playlists.map((playlist) => (
                <li key={playlist.id}>
                  <button
                    type="button"
                    className="w-full px-1 py-2 text-left text-sm hover:text-ember"
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
              className="mt-3 text-sm text-ember"
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
