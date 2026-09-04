import { usePlayerStore } from "@/stores/player-store";
import { cn } from "@/lib/utils";

export function NowPlayingHeader() {
  const title = usePlayerStore((s) => s.title);
  const artist = usePlayerStore((s) => s.artist);
  const track = usePlayerStore((s) => s.track);
  const lyricsSource = usePlayerStore((s) => s.lyricsSource);

  const displayTitle = track || title;
  const displayArtist = artist;

  if (!displayTitle) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-primary">{displayTitle}</p>
        {displayArtist && (
          <p className="truncate text-xs text-ink-muted">{displayArtist}</p>
        )}
      </div>
      {lyricsSource && (
        <span className="ml-2 shrink-0 rounded-full border border-border-subtle px-2 py-0.5 text-[10px] text-ink-muted">
          {lyricsSource}
        </span>
      )}
    </div>
  );
}
