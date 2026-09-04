import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ListMusic, Plus, Trash2, Play, Music } from "lucide-react"
import { createPlaylist, deletePlaylist, getPlaylists } from "../lib/playlists"

export function PlaylistsPage() {
  const [playlists, setPlaylists] = useState(() => getPlaylists())
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const navigate = useNavigate()

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    const created = createPlaylist(newTitle, newDesc)
    setPlaylists(getPlaylists())
    setIsCreating(false)
    setNewTitle("")
    setNewDesc("")
    navigate(`/playlists/${created.id}`)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (confirm("Delete this playlist?")) {
      deletePlaylist(id)
      setPlaylists(getPlaylists())
    }
  }

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <ListMusic className="w-6 h-6 text-primary" />
            Your Playlists
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Organize and replay your karaoke collections.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Create Playlist
        </button>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-sm bg-card border border-border/80 rounded-2xl shadow-2xl p-5 space-y-4"
          >
            <h3 className="font-semibold text-foreground text-sm">New Playlist</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <input
                type="text"
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. 80s Rock Anthems"
                className="w-full px-3 py-2 bg-muted/30 border border-border/70 rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary/60 outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g. Friday night sing-along"
                className="w-full px-3 py-2 bg-muted/30 border border-border/70 rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary/60 outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Playlist Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {playlists.map((playlist) => {
          const firstThumb = playlist.tracks[0]?.thumbnail

          return (
            <Link
              key={playlist.id}
              to={`/playlists/${playlist.id}`}
              className="group p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/50 hover:bg-card/90 transition-all flex flex-col justify-between shadow-sm hover:shadow-md relative"
            >
              <div>
                <div className="w-full aspect-video rounded-xl bg-muted/60 mb-3 overflow-hidden flex items-center justify-center relative">
                  {firstThumb ? (
                    <img
                      src={firstThumb}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Music className="w-8 h-8 text-muted-foreground/50" />
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>

                <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                  {playlist.title}
                </h3>
                {playlist.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {playlist.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 mt-2 border-t border-border/40 text-xs text-muted-foreground">
                <span>{playlist.tracks.length} tracks</span>
                {playlist.id !== "favorites" && (
                  <button
                    type="button"
                    onClick={(e) => handleDelete(playlist.id, e)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete Playlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
