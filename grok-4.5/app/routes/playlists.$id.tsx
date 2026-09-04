import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { getPlaylist, removeFromPlaylist, renamePlaylist } from "~/lib/storage"
import { youtubeThumb } from "~/lib/format"
import type { Playlist } from "~/lib/types"

export function meta() {
  return [{ title: "Playlist · umbra" }]
}

export default function PlaylistDetailPage() {
  const { playlistId = "" } = useParams()
  const navigate = useNavigate()
  const [playlist, setPlaylist] = useState<Playlist | undefined>()

  useEffect(() => {
    setPlaylist(getPlaylist(playlistId))
  }, [playlistId])

  if (!playlist) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
        <p className="text-dim">That playlist is gone.</p>
        <Link to="/playlists" className="text-spot hover:underline">
          All playlists
        </Link>
      </main>
    )
  }

  const first = playlist.tracks[0]

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-10 sm:px-8">
      <Link to="/playlists" className="text-sm text-dim hover:text-ink">
        All playlists
      </Link>
      <input
        value={playlist.name}
        onChange={(e) => {
          renamePlaylist(playlist.id, e.target.value)
          setPlaylist(getPlaylist(playlist.id))
        }}
        className="mt-4 w-full bg-transparent font-lyric text-4xl outline-none"
      />
      {first && (
        <button
          type="button"
          className="mt-6 rounded-full bg-spot px-4 py-2 text-sm text-spot-ink"
          onClick={() =>
            navigate(`/play/${first.videoId}`, {
              state: {
                playlistId: playlist.id,
                trackIndex: 0,
                artist: first.artist,
                track: first.track,
                title: first.title,
              },
            })
          }
        >
          Play all
        </button>
      )}
      <ul className="mt-8 divide-y divide-line rounded-[10px] border border-line bg-panel">
        {playlist.tracks.map((song, index) => (
          <li key={song.videoId} className="flex items-center gap-3 px-3 py-2">
            <Link
              to={`/play/${song.videoId}`}
              state={{
                playlistId: playlist.id,
                trackIndex: index,
                artist: song.artist,
                track: song.track,
                title: song.title,
              }}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <img src={youtubeThumb(song.videoId, "mqdefault")} alt="" className="h-10 w-[4.4rem] rounded-md object-cover" />
              <span className="min-w-0">
                <span className="block truncate text-sm">{song.track || song.title}</span>
                <span className="block truncate text-xs text-dim">{song.artist}</span>
              </span>
            </Link>
            <button
              type="button"
              className="text-xs text-dim hover:text-spot"
              onClick={() => {
                removeFromPlaylist(playlist.id, song.videoId)
                setPlaylist(getPlaylist(playlist.id))
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
