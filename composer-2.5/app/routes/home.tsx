import { useEffect, useState } from "react"
import { Link } from "react-router"
import { SearchBox } from "~/components/search-box"
import { clearRecentSongs, getRecentSongs } from "~/lib/storage"
import { youtubeThumb } from "~/lib/format"
import type { RecentSong } from "~/lib/types"

export function meta() {
  return [
    { title: "umbra" },
    { name: "description", content: "Sing along with synced lyrics from a YouTube or Spotify track." },
  ]
}

export default function Home() {
  const [recent, setRecent] = useState<RecentSong[]>([])

  useEffect(() => {
    setRecent(getRecentSongs())
  }, [])

  return (
    <main className="flex flex-1 flex-col px-5 pb-16 sm:px-8">
      <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center pt-10 sm:pt-16">
        <h1 className="font-lyric text-5xl leading-[1.1] tracking-tight sm:text-6xl">umbra</h1>
        <p className="mt-3 max-w-md text-lg text-dim">Sing in the dark. The lyric line is the spotlight.</p>
        <div className="mt-10">
          <SearchBox autoFocus />
        </div>
        <p className="mt-4 text-sm text-dim">Space plays. Arrows seek. +/- nudges timing.</p>
      </section>

      {recent.length > 0 && (
        <section className="mx-auto mt-8 w-full max-w-4xl">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-lyric text-2xl">Recent</h2>
            <button
              type="button"
              className="text-sm text-dim hover:text-ink"
              onClick={() => {
                clearRecentSongs()
                setRecent([])
              }}
            >
              Clear
            </button>
          </div>
          <ul className="flex gap-3 overflow-x-auto pb-2">
            {recent.map((song) => (
              <li key={song.videoId} className="w-36 shrink-0">
                <Link to={`/play/${song.videoId}`} className="block">
                  <img
                    src={youtubeThumb(song.videoId)}
                    alt=""
                    className="aspect-video w-full rounded-[12px] object-cover"
                  />
                  <span className="mt-2 block truncate text-sm">{song.track || song.title}</span>
                  <span className="block truncate text-xs text-dim">{song.artist}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
