import { formatTime } from "@/lib/lrc";

interface TransportProps {
  isPlaying: boolean;
  timeSec: number;
  durationSec: number;
  offsetMs: number;
  videoHidden: boolean;
  showTimestamps: boolean;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onNudgeOffset: (deltaMs: number) => void;
  onResetOffset: () => void;
  onToggleVideo: () => void;
  onToggleTimestamps: () => void;
}

/**
 * Fixed bottom transport: play/pause, seek slider, lyric-offset nudge,
 * video visibility. Offset display doubles as the "sync quality" readout
 * the old app scattered across chips — one number, always legible.
 */
export function Transport({
  isPlaying,
  timeSec,
  durationSec,
  offsetMs,
  videoHidden,
  showTimestamps,
  onTogglePlay,
  onSeek,
  onNudgeOffset,
  onResetOffset,
  onToggleVideo,
  onToggleTimestamps,
}: TransportProps) {
  const safeDuration = durationSec > 0 ? durationSec : 0;
  const clamped = Math.min(Math.max(timeSec, 0), safeDuration);

  return (
    <div className="transport">
      <div className="transport-inner">
        <div className="seek-row">
          <span aria-hidden="true">{formatTime(clamped)}</span>
          <input
            type="range"
            min={0}
            max={safeDuration}
            step={0.1}
            value={clamped}
            disabled={safeDuration <= 0}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-label="Seek"
          />
          <span aria-hidden="true">{formatTime(safeDuration)}</span>
        </div>
        <div className="controls-row">
          <button
            type="button"
            className="btn btn-primary btn-round"
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onToggleVideo}
            aria-pressed={videoHidden}
            title={videoHidden ? "Show video" : "Hide video (lyrics only)"}
          >
            {videoHidden ? "Show video" : "Hide video"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onToggleTimestamps}
            aria-pressed={showTimestamps}
            title="Toggle line timestamps"
          >
            {showTimestamps ? "Hide times" : "Show times"}
          </button>
          <div className="offset-group" title="Nudge lyric timing">
            <span aria-live="polite">
              {offsetMs === 0 ? "±0ms" : `${offsetMs > 0 ? "+" : ""}${offsetMs}ms`}
            </span>
            <button type="button" onClick={() => onNudgeOffset(-250)} aria-label="Lyrics 250ms earlier">
              −
            </button>
            <button type="button" onClick={() => onNudgeOffset(250)} aria-label="Lyrics 250ms later">
              +
            </button>
            {offsetMs !== 0 && (
              <button type="button" onClick={onResetOffset} aria-label="Reset lyric timing">
                reset
              </button>
            )}
          </div>
        </div>
        <div className="kbd-hint" aria-hidden="true">
          <kbd>Space</kbd> play/pause · <kbd>←</kbd>
          <kbd>→</kbd> seek · <kbd>+</kbd>
          <kbd>−</kbd> lyric timing
        </div>
      </div>
    </div>
  );
}
