import { useEffect, useState } from "react"
import { Link } from "react-router"
import { createPlaylist, deletePlaylist, readPlaylists } from "~/lib/storage"
import type { Playlist } from "~/lib/types"

export function meta() {
  return [{ title: "Playlists · umbra" }]
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [name, setName] = useState("")

  useEffect(() => {
    setPlaylists(readPlaylists())
  }, [])

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-10 sm:px-8">
      <h1 className="font-lyric text-4xl">Playlists</h1>
      <p className="mt-2 text-dim">Kept in this browser. Add tracks from the player.</p>

      <form
        className="mt-8 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          createPlaylist(name)
          setName("")
          setPlaylists(readPlaylists())
        }}
      >
        <label className="sr-only" htmlFor="playlist-name">
          Playlist name
        </label>
        <input
          id="playlist-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New playlist"
          className="flex-1 rounded-[12px] border border-line bg-panel px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-[12px] bg-ember px-3 py-2 text-sm text-ember-ink">
          Create
        </button>
      </form>

      {playlists.length === 0 ? (
        <p className="mt-10 text-sm text-dim">No playlists yet.</p>
      ) : (
        <ul className="mt-8 divide-y divide-line rounded-[12px] border border-line bg-panel">
          {playlists.map((playlist) => (
            <li key={playlist.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <Link to={`/playlists/${playlist.id}`} className="min-w-0 flex-1 hover:text-ember">
                <span className="block truncate">{playlist.name}</span>
                <span className="text-xs text-dim">
                  {playlist.tracks.length} {playlist.tracks.length === 1 ? "song" : "songs"}
                </span>
              </Link>
              <button
                type="button"
                className="text-xs text-dim hover:text-ember"
                onClick={() => {
                  deletePlaylist(playlist.id)
                  setPlaylists(readPlaylists())
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
