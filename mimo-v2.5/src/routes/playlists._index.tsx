import { useState, useCallback } from "react";
import { Link } from "react-router";
import { ListMusic, Plus, Trash2, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getAllPlaylists,
  createPlaylist,
  deletePlaylist,
  type Playlist,
} from "@/lib/playlists";

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>(() => getAllPlaylists());
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    createPlaylist(newName.trim());
    setPlaylists(getAllPlaylists());
    setNewName("");
    setShowCreate(false);
  }, [newName]);

  const handleDelete = useCallback((id: string) => {
    deletePlaylist(id);
    setPlaylists(getAllPlaylists());
  }, []);

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-ink-primary">Playlists</h1>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>

        {showCreate && (
          <div className="mt-4 flex gap-2">
            <Input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Playlist name…"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <Button onClick={handleCreate}>Create</Button>
          </div>
        )}

        {playlists.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <ListMusic className="h-10 w-10 text-ink-muted/50" />
            <p className="text-sm text-ink-muted">No playlists yet</p>
            <p className="text-xs text-ink-muted/70">Create one to organize your songs.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-2">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-card px-4 py-3"
              >
                <Link
                  to={`/playlists/${playlist.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <ListMusic className="h-5 w-5 shrink-0 text-ink-muted" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-primary">{playlist.name}</p>
                    <p className="text-xs text-ink-muted">{playlist.tracks.length} tracks</p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(playlist.id)}
                  className="ml-2 rounded-md p-1.5 text-ink-muted hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
