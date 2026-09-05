import { Icon } from "./icon";
import { formatTime } from "../lib/format";

type TransportProps = {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  onToggle: () => void;
  onSeek: (time: number) => void;
  onVolume: (volume: number) => void;
  onNudge: (seconds: number) => void;
};

export function Transport({
  currentTime,
  duration,
  isPlaying,
  volume,
  onToggle,
  onSeek,
  onVolume,
  onNudge,
}: TransportProps) {
  const progress = duration ? (currentTime / duration) * 100 : 0;
  return (
    <footer className="transport" aria-label="Playback controls">
      <div className="transport__timeline">
        <span>{formatTime(currentTime)}</span>
        <input
          aria-label="Seek through song"
          type="range"
          min="0"
          max={duration}
          step="0.1"
          value={currentTime}
          onChange={(event) => onSeek(Number(event.target.value))}
          style={{ "--range-progress": `${progress}%` } as React.CSSProperties}
        />
        <span>{formatTime(duration)}</span>
      </div>
      <div className="transport__controls">
        <div className="transport__main-controls">
          <button className="transport__skip" type="button" onClick={() => onNudge(-10)} aria-label="Back 10 seconds">
            <Icon name="back" size={19} />
            <b>10</b>
          </button>
          <button className="play-button" type="button" onClick={onToggle} aria-label={isPlaying ? "Pause" : "Play"}>
            <Icon name={isPlaying ? "pause" : "play"} size={23} />
          </button>
          <button className="transport__skip" type="button" onClick={() => onNudge(10)} aria-label="Forward 10 seconds">
            <Icon name="forward" size={19} />
            <b>10</b>
          </button>
        </div>
        <p className="transport__hint"><kbd>Space</kbd> play/pause <span>·</span> <kbd>←</kbd><kbd>→</kbd> seek</p>
        <label className="volume-control">
          <Icon name={volume === 0 ? "volume-off" : "volume"} size={18} />
          <span className="sr-only">Volume</span>
          <input
            aria-label="Volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => onVolume(Number(event.target.value))}
            style={{ "--range-progress": `${volume * 100}%` } as React.CSSProperties}
          />
        </label>
      </div>
    </footer>
  );
}
