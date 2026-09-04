import { useEffect, useRef, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { ArrowIcon, ClockIcon, LibraryIcon, LinkIcon, PlayIcon, SearchIcon, SparkIcon } from "~/components/icons"
import { DEMO_TRACK, DEMO_VIDEO_ID } from "~/lib/demo"
import { formatTime, parseMediaInput, videoThumbnail } from "~/lib/media"
import { clearRecentTracks, readRecentTracks, type RecentTrack } from "~/lib/recent"
import type { SearchHit } from "~/lib/types"

export function meta() {
  return [
    { title: "umbra — lyrics, in time" },
    { name: "description", content: "A lyrics-first player for YouTube tracks and personal lyric sheets." },
  ]
}

export default function Home() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [input, setInput] = useState("")
  const [results, setResults] = useState<SearchHit[]>([])
  const [recent, setRecent] = useState<RecentTrack[]>([])
  const [state, setState] = useState<"idle" | "searching" | "resolving">("idle")
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    setRecent(readRecentTracks())
  }, [])

  const openTrack = (videoId: string) => navigate(`/play/${videoId}`)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const media = parseMediaInput(input)
    setMessage(null)
    setResults([])
    if (media.kind === "youtube") {
      openTrack(media.videoId)
      return
    }
    if (media.kind === "spotify") {
      setState("resolving")
      try {
        const response = await fetch(`/api/spotify?trackId=${encodeURIComponent(media.trackId)}`)
        const data = (await response.json().catch(() => null)) as { videoId?: string; error?: string } | null
        if (!response.ok || !data?.videoId) throw new Error(data?.error || "We could not match that Spotify track")
        openTrack(data.videoId)
      } catch (reason) {
        setMessage(reason instanceof Error ? reason.message : "Spotify matching is unavailable right now")
      } finally {
        setState("idle")
      }
      return
    }
    if (media.kind !== "query") {
      setMessage("Paste a YouTube or Spotify track link, or type a song title.")
      inputRef.current?.focus()
      return
    }

    setState("searching")
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(media.query)}`)
      const data = (await response.json().catch(() => null)) as { hits?: SearchHit[]; error?: string } | null
      if (!response.ok) throw new Error(data?.error || "Search is unavailable right now")
      setResults(data?.hits ?? [])
      if (!data?.hits?.length) setMessage("No playable videos appeared. Try the artist and track name together.")
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Search is unavailable right now")
    } finally {
      setState("idle")
    }
  }

  return (
    <main className="home">
      <section className="home-hero">
        <div className="home-hero__ripple" aria-hidden="true" />
        <p className="home-hero__kicker"><span /> A room for the words</p>
        <h1>Find the line.<br />Keep the time.</h1>
        <p className="home-hero__lede">
          Paste a YouTube or Spotify track, search by title, or begin with a private lyric sheet. Umbra keeps the words centered while the song moves.
        </p>

        <form className="track-finder" onSubmit={submit}>
          <label className="sr-only" htmlFor="track-input">Song or link</label>
          <SearchIcon className="track-finder__icon" size={20} />
          <input
            id="track-input"
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.currentTarget.value)}
            placeholder="Search a song or paste a link"
            autoComplete="off"
            spellCheck="false"
          />
          <button className="track-finder__submit" type="submit" disabled={state !== "idle"}>
            {state === "searching" ? "Searching" : state === "resolving" ? "Matching" : "Open"}
            <ArrowIcon size={17} />
          </button>
        </form>
        <div className="home-hero__support">
          <span><LinkIcon size={15} /> YouTube or Spotify</span>
          <span><ClockIcon size={15} /> Synced when available</span>
          <span><SparkIcon size={15} /> Your lyrics work too</span>
        </div>
        <p className="finder-message" role="status">{message}</p>
      </section>

      {results.length > 0 ? (
        <section className="search-results" aria-label="Video results">
          <div className="section-heading"><p>Matches</p><span>{results.length} videos</span></div>
          <ul>
            {results.map((result) => (
              <li key={result.videoId}>
                <button type="button" onClick={() => openTrack(result.videoId)}>
                  <img src={result.thumbnail} alt="" loading="lazy" />
                  <span className="result-copy">
                    <strong>{result.title}</strong>
                    <span>{result.channel || "YouTube"}{result.durationSec ? ` · ${formatTime(result.durationSec)}` : ""}</span>
                  </span>
                  <ArrowIcon size={17} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="home-ways" aria-label="Ways to start">
        <Link className="demo-card" to={`/play/${DEMO_VIDEO_ID}`}>
          <div className="demo-card__visual" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <div className="demo-card__copy">
            <span className="demo-card__label">A complete offline demo</span>
            <strong>{DEMO_TRACK.title}</strong>
            <span>{DEMO_TRACK.artist} · 2:22</span>
          </div>
          <span className="demo-card__play"><PlayIcon size={17} /></span>
        </Link>
        <div className="home-note">
          <LibraryIcon size={18} />
          <p><strong>Made for imperfect sources.</strong> If a match is wrong or there are no synced lyrics, paste an LRC file or plain lyric sheet and keep singing.</p>
        </div>
      </section>

      {recent.length > 0 ? (
        <section className="recent-section" aria-label="Recently opened songs">
          <div className="section-heading">
            <p>Recently opened</p>
            <button type="button" onClick={() => { clearRecentTracks(); setRecent([]) }}>Clear</button>
          </div>
          <ul className="recent-grid">
            {recent.map((track) => (
              <li key={track.videoId}>
                <Link to={`/play/${track.videoId}`}>
                  <img src={videoThumbnail(track.videoId)} alt="" loading="lazy" />
                  <span><strong>{track.title}</strong><em>{track.artist || "YouTube"}</em></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  )
}
