import type { CSSProperties } from "react"
import { PauseIcon, PlayIcon, PlusIcon, MinusIcon, TuneIcon } from "~/components/icons"
import { formatTime } from "~/lib/media"

type TransportProps = {
  currentTime: number
  duration: number
  isPlaying: boolean
  onToggle: () => void
  onSeek: (seconds: number) => void
  offsetMs: number
  onOffsetChange: (offset: number) => void
}

export function Transport({
  currentTime,
  duration,
  isPlaying,
  onToggle,
  onSeek,
  offsetMs,
  onOffsetChange,
}: TransportProps) {
  const seekBy = (amount: number) => onSeek(Math.max(0, Math.min(duration || Infinity, currentTime + amount)))
  const displayDuration = duration || Math.max(currentTime, 1)
  const syncLabel = `${offsetMs > 0 ? "+" : ""}${(offsetMs / 1000).toFixed(1)} s`

  return (
    <footer className="transport" aria-label="Playback controls">
      <div className="transport__timeline">
        <time dateTime={`PT${Math.floor(currentTime)}S`}>{formatTime(currentTime)}</time>
        <input
          className="seek-range"
          type="range"
          min="0"
          max={displayDuration}
          step="0.05"
          value={Math.min(currentTime, displayDuration)}
          onChange={(event) => onSeek(Number(event.currentTarget.value))}
          aria-label="Seek through song"
          style={{ "--seek-progress": `${Math.max(0, Math.min(100, (currentTime / displayDuration) * 100))}%` } as CSSProperties}
          disabled={!duration}
        />
        <time dateTime={`PT${Math.floor(duration)}S`}>{duration ? formatTime(duration) : "--:--"}</time>
      </div>
      <div className="transport__actions">
        <div className="transport__primary-actions">
          <button className="transport-skip" type="button" onClick={() => seekBy(-10)} aria-label="Back 10 seconds" title="Back 10 seconds">10</button>
          <button className="play-button" type="button" onClick={onToggle} aria-label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <PauseIcon size={21} /> : <PlayIcon size={21} />}
          </button>
          <button className="transport-skip transport-skip--forward" type="button" onClick={() => seekBy(10)} aria-label="Forward 10 seconds" title="Forward 10 seconds">10</button>
        </div>
        <div className="sync-control">
          <TuneIcon size={15} />
          <span className="sync-control__label">Lyrics</span>
          <button type="button" onClick={() => onOffsetChange(offsetMs - 100)} aria-label="Move lyrics 0.1 seconds earlier" title="Earlier"><MinusIcon size={14} /></button>
          <output aria-label={`Lyric timing offset ${syncLabel}`}>{syncLabel}</output>
          <button type="button" onClick={() => onOffsetChange(offsetMs + 100)} aria-label="Move lyrics 0.1 seconds later" title="Later"><PlusIcon size={14} /></button>
          {offsetMs !== 0 ? <button className="sync-control__reset" type="button" onClick={() => onOffsetChange(0)}>Reset</button> : null}
        </div>
      </div>
    </footer>
  )
}
