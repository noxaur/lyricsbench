import { useParams, Link } from "react-router";
import { useState, useCallback, useEffect } from "react";
import { ArrowLeft, Music, Trash2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPlaylistById,
  removeTrackFromPlaylist,
  renamePlaylist,
  type Playlist,
} from "@/lib/playlists";

export default function PlaylistDetailPage() {
  const { playlistId = "" } = useParams();
  const [playlist, setPlaylist] = useState<Playlist | undefined>(() => getPlaylistById(playlistId));
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(playlist?.name ?? "");

  useEffect(() => {
    setPlaylist(getPlaylistById(playlistId));
  }, [playlistId]);

  const handleRename = useCallback(() => {
    if (name.trim() && playlistId) {
      renamePlaylist(playlistId, name.trim());
      setPlaylist(getPlaylistById(playlistId));
      setEditing(false);
    }
  }, [name, playlistId]);

  const handleRemoveTrack = useCallback(
    (videoId: string) => {
      if (!playlistId) return;
      removeTrackFromPlaylist(playlistId, videoId);
      setPlaylist(getPlaylistById(playlistId));
    },
    [playlistId],
  );

  if (!playlist) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-ink-muted">Playlist not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          to="/playlists"
          className="mb-4 flex items-center gap-1.5 text-xs text-ink-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Playlists
        </Link>

        <div className="flex items-center justify-between">
          {editing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              className="bg-transparent text-xl font-bold text-ink-primary outline-none"
              autoFocus
            />
          ) : (
            <h1
              className="cursor-pointer text-xl font-bold text-ink-primary hover:text-primary"
              onClick={() => { setName(playlist.name); setEditing(true); }}
            >
              {playlist.name}
            </h1>
          )}
          <span className="text-xs text-ink-muted">{playlist.tracks.length} tracks</span>
        </div>

        {playlist.tracks.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <Music className="h-10 w-10 text-ink-muted/50" />
            <p className="text-sm text-ink-muted">No tracks yet</p>
            <p className="text-xs text-ink-muted/70">Add songs from the player.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-1">
            {playlist.tracks.map((track, index) => (
              <div
                key={track.videoId}
                className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-surface-muted/50"
              >
                <span className="w-6 text-right text-xs text-ink-muted">{index + 1}</span>
                <Link
                  to={`/play/${track.videoId}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <Music className="h-4 w-4 shrink-0 text-ink-muted" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-primary">
                      {track.track || track.title}
                    </p>
                    {track.artist && (
                      <p className="truncate text-xs text-ink-muted">{track.artist}</p>
                    )}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => handleRemoveTrack(track.videoId)}
                  className="rounded-md p-1 text-ink-muted hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
