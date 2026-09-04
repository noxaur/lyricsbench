import { useEffect, useId, useRef, useState } from "react"
import { useNavigate } from "react-router"
import { MagnifyingGlass, SpinnerGap } from "@phosphor-icons/react"
import { classifyInput, extractYouTubeVideoId } from "~/lib/urls"
import { resolveSpotify, searchSongs } from "~/lib/api"
import { parseTrackTitle } from "~/lib/titles"
import { formatDuration, youtubeThumb } from "~/lib/format"
import type { SongSearchHit } from "~/lib/types"
import { cn } from "~/lib/cn"

export function SearchBox({ autoFocus = false }: { autoFocus?: boolean }) {
  const navigate = useNavigate()
  const listId = useId()
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<SongSearchHit[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const kind = classifyInput(query)
    if (kind !== "query" || query.trim().length < 2) {
      setHits([])
      setBusy(false)
      return
    }
    const controller = new AbortController()
    abortRef.current = controller
    setBusy(true)
    const timer = window.setTimeout(async () => {
      try {
        const next = await searchSongs(query, controller.signal)
        if (!controller.signal.aborted) {
          setHits(next)
          setOpen(true)
          setActive(0)
          setError(null)
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setError("Search didn't come back. Try a YouTube link instead.")
      } finally {
        if (!controller.signal.aborted) setBusy(false)
      }
    }, 220)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  async function go(raw: string) {
    const value = raw.trim()
    if (!value) return
    setError(null)
    const kind = classifyInput(value)
    if (kind === "youtube") {
      const id = extractYouTubeVideoId(value)
      if (id) navigate(`/play/${id}`)
      return
    }
    if (kind === "spotify") {
      setBusy(true)
      const result = await resolveSpotify(value)
      setBusy(false)
      if ("error" in result) {
        setError(result.error)
        return
      }
      navigate(`/play/${result.videoId}`, { state: { artist: result.artist, track: result.track } })
      return
    }
    if (hits[active]) {
      openHit(hits[active])
      return
    }
    setError("Pick a result, or paste a YouTube or Spotify link.")
  }

  function openHit(hit: SongSearchHit) {
    const parsed = parseTrackTitle(hit.title, hit.channel)
    navigate(`/play/${hit.videoId}`, {
      state: {
        artist: parsed.artist,
        track: parsed.track,
        title: hit.title,
        durationSec: hit.durationSec ?? undefined,
      },
    })
  }

  return (
    <form
      className="relative w-full max-w-xl"
      onSubmit={(e) => {
        e.preventDefault()
        void go(query)
      }}
    >
      <label className="sr-only" htmlFor="song-search">
        Search for a song
      </label>
      <div className="glass flex items-center gap-3 rounded-[10px] border border-line bg-panel/80 px-4 py-3 backdrop-blur-md">
        {busy ? (
          <SpinnerGap className="size-5 shrink-0 animate-spin text-dim" weight="regular" />
        ) : (
          <MagnifyingGlass className="size-5 shrink-0 text-dim" weight="regular" />
        )}
        <input
          id="song-search"
          value={query}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && hits.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder="A song, a YouTube link, or Spotify"
          className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-dim"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setActive((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)))
            }
            if (e.key === "ArrowUp") {
              e.preventDefault()
              setActive((i) => Math.max(i - 1, 0))
            }
          }}
        />
      </div>
      {error && <p className="mt-2 text-sm text-spot">{error}</p>}
      {open && hits.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-2 w-full overflow-hidden rounded-[10px] border border-line bg-panel shadow-[0_18px_50px_color-mix(in_srgb,var(--canvas)_70%,transparent)]"
        >
          {hits.map((hit, i) => {
            const parsed = parseTrackTitle(hit.title, hit.channel)
            const label = parsed.artist ? `${parsed.track} · ${parsed.artist}` : hit.title
            return (
              <li key={hit.videoId} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-line/60",
                    i === active && "bg-line/60",
                  )}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => openHit(hit)}
                >
                  <img
                    src={youtubeThumb(hit.videoId, "mqdefault")}
                    alt=""
                    width={64}
                    height={36}
                    className="h-9 w-16 shrink-0 rounded-md object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{label}</span>
                    <span className="block truncate text-xs text-dim">
                      {hit.channel}
                      {hit.durationSec ? ` · ${formatDuration(hit.durationSec)}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </form>
  )
}
