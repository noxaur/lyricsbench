import { Pause, Play, SkipBack, SkipForward, RotateCcw, Eye, EyeOff, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatTime } from "@/lib/utils"

type Props = {
  currentTime: number
  duration: number
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onSeek: (sec: number) => void
  offsetMs: number
  onOffsetChange: (ms: number) => void
  onAdjust: (delta: number) => void
  onReset: () => void
  videoHidden: boolean
  onToggleVideo: () => void
  tvMode: boolean
  onToggleTv: () => void
}

export function Transport({ currentTime, duration, isPlaying, onPlay, onPause, onSeek, offsetMs, onOffsetChange, onAdjust, onReset, videoHidden, onToggleVideo, tvMode, onToggleTv }: Props) {
  return (
    <div className="shrink-0 border-t border-border bg-card px-3 py-2 sm:px-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        {/* seek */}
        <div className="flex items-center gap-2">
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={Math.min(currentTime, duration || 100)}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="h-2 flex-1 accent-primary"
            aria-label="Seek"
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          />
          <span className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">{formatTime(duration)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button size="icon" className="rounded-full size-9" onClick={isPlaying ? onPause : onPlay} aria-label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
          </Button>

          <Button variant="outline" size="icon" className="size-8 rounded-full hidden sm:inline-flex" disabled aria-label="Previous (queue)">
            <SkipBack className="size-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="size-8 rounded-full hidden sm:inline-flex" disabled aria-label="Next (queue)">
            <SkipForward className="size-3.5" />
          </Button>

          {/* Sync group - labelled, fixes S4 */}
          <div role="group" aria-labelledby="sync-label" className="flex flex-1 items-center gap-1 rounded-md border border-border/60 px-2 py-1 sm:ml-2">
            <span id="sync-label" className="hidden text-[0.6875rem] font-medium text-muted-foreground sm:inline">Sync</span>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onAdjust(-500)} aria-label="Lyrics 0.5 seconds earlier">
              −0.5s
            </Button>
            <input
              type="range"
              min={-5000}
              max={5000}
              step={100}
              value={offsetMs}
              onChange={(e) => onOffsetChange(Number(e.target.value))}
              className="h-2 flex-1 accent-primary"
              aria-label={`Lyrics timing offset ${(offsetMs / 1000).toFixed(1)} seconds`}
            />
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onAdjust(500)} aria-label="Lyrics 0.5 seconds later">
              +0.5s
            </Button>
            <Button variant="ghost" size="icon" className="size-7" onClick={onReset} aria-label="Reset timing" title="Reset timing">
              <RotateCcw className="size-3" />
            </Button>
            <span className="w-12 text-right text-xs tabular-nums text-muted-foreground" aria-live="polite">
              {(offsetMs / 1000).toFixed(1)}s
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8" onClick={onToggleVideo} aria-label={videoHidden ? "Show video" : "Hide video"} title={videoHidden ? "Show video" : "Hide video (karaoke mode)"}>
              {videoHidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={onToggleTv} aria-label={tvMode ? "Exit TV mode" : "TV mode"} title={tvMode ? "Exit TV mode" : "TV mode (F)"}>
              {tvMode ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
