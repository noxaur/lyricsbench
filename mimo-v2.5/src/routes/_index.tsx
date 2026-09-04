import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { Music, Search, Clock, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { extractVideoId, extractSpotifyId } from "@/lib/youtube";
import { getRecentSongs, clearRecentSongs, type RecentSong } from "@/lib/recent-songs";
import { initTheme } from "@/lib/themes";

initTheme();

export default function HomePage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [recentSongs, setRecentSongs] = useState<RecentSong[]>(() => getRecentSongs());

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = url.trim();
      if (!trimmed) return;

      // Try YouTube
      const videoId = extractVideoId(trimmed);
      if (videoId) {
        navigate(`/play/${videoId}`);
        return;
      }

      // Try Spotify
      const spotify = extractSpotifyId(trimmed);
      if (spotify && spotify.type === "track") {
        navigate(`/play/spotify:${spotify.id}`);
        return;
      }
    },
    [url, navigate],
  );

  const handleClearRecent = useCallback(() => {
    clearRecentSongs();
    setRecentSongs([]);
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Music className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink-primary md:text-4xl">
              Karaoke lyrics, synced
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Paste a YouTube link. Sing along with word-level synced lyrics.
            </p>
          </div>
        </div>

        {/* URL Input */}
        <form onSubmit={handleSubmit} className="mt-8 flex w-full max-w-lg gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste YouTube or Spotify link…"
              className="pl-9"
            />
          </div>
          <Button type="submit">Play</Button>
        </form>

        <p className="mt-3 text-xs text-ink-muted">
          or paste any YouTube URL — youtube.com/watch?v=, youtu.be/, youtube.com/shorts/
        </p>
      </div>

      {/* Recent Songs */}
      {recentSongs.length > 0 && (
        <div className="border-t border-border px-4 py-6">
          <div className="mx-auto flex max-w-2xl items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium text-ink-muted">
              <Clock className="h-3.5 w-3.5" />
              Recent
            </h2>
            <button
              type="button"
              onClick={handleClearRecent}
              className="flex items-center gap-1 text-xs text-ink-muted hover:text-foreground"
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
          </div>
          <div className="mx-auto mt-3 grid max-w-2xl gap-1">
            {recentSongs.map((song) => (
              <Link
                key={song.videoId}
                to={`/play/${song.videoId}`}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-primary hover:bg-surface-muted/50"
              >
                <Music className="h-4 w-4 shrink-0 text-ink-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{song.track || song.title}</p>
                  {song.artist && <p className="truncate text-xs text-ink-muted">{song.artist}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
