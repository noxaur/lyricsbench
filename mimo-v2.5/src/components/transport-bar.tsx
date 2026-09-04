import { useCallback, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronsLeft,
  ChevronsRight,
  Clock,
} from "lucide-react";
import { usePlayerStore } from "@/stores/player-store";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function TransportBar() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const syncOffsetMs = usePlayerStore((s) => s.syncOffsetMs);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const seekBy = usePlayerStore((s) => s.seekBy);
  const adjustOffset = usePlayerStore((s) => s.adjustOffset);
  const resetSyncOffset = usePlayerStore((s) => s.resetSyncOffset);
  const setDurationMs = usePlayerStore((s) => s.setDurationMs);

  const durationSec = durationMs / 1000;
  const progress = durationSec > 0 ? (currentTime / durationSec) * 100 : 0;
  const [showOffset, setShowOffset] = useState(false);

  const barRef = useRef<HTMLDivElement>(null);

  const onBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const bar = barRef.current;
      if (!bar || durationSec <= 0) return;
      const rect = bar.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const seekRef = usePlayerStore.getState().seekRef;
      seekRef?.(pct * durationSec);
    },
    [durationSec],
  );

  return (
    <div className="flex flex-col gap-2 border-t border-border bg-surface-card px-4 py-3">
      {/* Progress bar */}
      <div
        ref={barRef}
        onClick={onBarClick}
        className="group relative h-1.5 w-full cursor-pointer rounded-full bg-surface-muted transition-all hover:h-2.5"
        role="slider"
        aria-label="Seek"
        aria-valuenow={Math.round(currentTime)}
        aria-valuemax={Math.round(durationSec)}
        tabIndex={0}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-primary transition-[width] duration-75"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 shadow-md transition-opacity group-hover:opacity-100"
          style={{ left: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-xs tabular-nums text-ink-muted">{formatTime(currentTime)}</span>
          <span className="text-xs text-ink-muted/50">/</span>
          <span className="text-xs tabular-nums text-ink-muted">{formatTime(durationSec)}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => adjustOffset(-100)}
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink-primary"
            title="Shift timing -100ms"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => seekBy(-5)}
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink-primary"
            title="Seek -5s"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => seekBy(5)}
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink-primary"
            title="Seek +5s"
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => adjustOffset(100)}
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink-primary"
            title="Shift timing +100ms"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {syncOffsetMs !== 0 && (
            <button
              type="button"
              onClick={resetSyncOffset}
              className="rounded-md px-2 py-1 text-xs tabular-nums text-status-info hover:bg-surface-muted"
              title="Reset offset"
            >
              {syncOffsetMs > 0 ? "+" : ""}{syncOffsetMs}ms
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
