import React, { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { ChevronLeft, Play, Trash2, Plus, Music } from "lucide-react"
import {
  addTrackToPlaylist,
  getPlaylistById,
  removeTrackFromPlaylist,
} from "../lib/playlists"
import { formatTime } from "../lib/utils"
import { SongSearch } from "../components/song-search"
import type { SongSearchHit } from "../types/song"

export function PlaylistDetailPage() {
  const { playlistId } = useParams<{ playlistId: string }>()
  const navigate = useNavigate()
  const [playlist, setPlaylist] = useState(() => (playlistId ? getPlaylistById(playlistId) : null))
  const [isAdding, setIsAdding] = useState(false)

  if (!playlist) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-xl font-bold text-foreground">Playlist not found</h2>
        <Link to="/playlists" className="mt-4 text-xs font-semibold text-primary hover:underline">
          Return to Playlists
        </Link>
      </div>
    )
  }

  const handlePlayFirst = () => {
    if (playlist.tracks.length > 0) {
      navigate(`/play/${playlist.tracks[0].videoId}`)
    }
  }

  const handleRemoveTrack = (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (playlistId) {
      removeTrackFromPlaylist(playlistId, videoId)
      setPlaylist(getPlaylistById(playlistId))
    }
  }

  const handleAddTrack = (hit: SongSearchHit) => {
    if (!playlistId || !hit.videoId) return
    addTrackToPlaylist(playlistId, {
      videoId: hit.videoId,
      title: hit.title,
      artist: hit.artist,
      track: hit.track,
      thumbnail: hit.thumbnail,
      durationSec: hit.durationSec,
    })
    setPlaylist(getPlaylistById(playlistId))
    setIsAdding(false)
  }

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
      <button
        type="button"
        onClick={() => navigate("/playlists")}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Playlists
      </button>

      {/* Playlist Hero */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 pb-6 mb-8 border-b border-border/50">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground">{playlist.title}</h1>
          {playlist.description && (
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              {playlist.description}
            </p>
          )}
          <span className="inline-block text-xs text-muted-foreground/80 mt-2 font-mono">
            {playlist.tracks.length} songs
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAdding((prev) => !prev)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Track
          </button>

          {playlist.tracks.length > 0 && (
            <button
              type="button"
              onClick={handlePlayFirst}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all shadow-md active:scale-95"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              Play All
            </button>
          )}
        </div>
      </div>

      {/* Add Track Search Bar */}
      {isAdding && (
        <div className="mb-6 p-4 rounded-2xl bg-card border border-border/70 shadow-md">
          <h3 className="text-xs font-semibold text-foreground mb-2">Search Track to Add:</h3>
          <SongSearch
            autoFocus
            placeholder="Search song to add to this playlist…"
            onSelect={handleAddTrack}
          />
        </div>
      )}

      {/* Track List */}
      {playlist.tracks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Music className="w-10 h-10 mx-auto opacity-40 mb-2" />
          <p className="text-sm font-medium">This playlist is empty</p>
          <p className="text-xs mt-1">Search and add your favorite karaoke songs.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {playlist.tracks.map((track, idx) => (
            <div
              key={`${track.videoId}-${idx}`}
              onClick={() => navigate(`/play/${track.videoId}`)}
              className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-muted/40 border border-transparent hover:border-border/40 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 text-center font-mono text-xs text-muted-foreground/60">
                  {idx + 1}
                </span>

                <div className="w-10 h-10 rounded-lg bg-muted/60 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {track.thumbnail ? (
                    <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {track.track || track.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{track.artist}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {track.durationSec && (
                  <span className="font-mono">{formatTime(track.durationSec)}</span>
                )}
                <button
                  type="button"
                  onClick={(e) => handleRemoveTrack(track.videoId, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                  title="Remove track"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
