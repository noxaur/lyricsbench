import { Pause, Play, Minus, Plus, Eye, EyeSlash } from "@phosphor-icons/react"
import { formatDuration, formatOffset } from "~/lib/format"
import { cn } from "~/lib/cn"
import type { DisplayMode } from "~/lib/types"
import { useEffect, useRef, useState } from "react"
import type { PlaybackClock } from "~/lib/clock"

type Props = {
  clock: PlaybackClock
  duration: number
  isPlaying: boolean
  offsetMs: number
  videoHidden: boolean
  displayMode: DisplayMode
  hasEnglish: boolean
  onPlay: () => void
  onPause: () => void
  onSeek: (seconds: number) => void
  onNudge: (deltaMs: number) => void
  onToggleVideo: () => void
  onDisplayMode: (mode: DisplayMode) => void
}

export function Transport({
  clock,
  duration,
  isPlaying,
  offsetMs,
  videoHidden,
  displayMode,
  hasEnglish,
  onPlay,
  onPause,
  onSeek,
  onNudge,
  onToggleVideo,
  onDisplayMode,
}: Props) {
  const barRef = useRef<HTMLInputElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const [time, setTime] = useState(0)

  useEffect(() => {
    let frame = 0
    let lastPaint = 0
    const tick = () => {
      const now = clock.now()
      if (barRef.current && document.activeElement !== barRef.current) {
        barRef.current.value = String(now)
      }
      if (performance.now() - lastPaint > 200) {
        lastPaint = performance.now()
        setTime(now)
        if (timeRef.current) timeRef.current.textContent = formatDuration(now)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [clock])

  return (
    <div className="shrink-0 border-t border-line bg-panel/80 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center gap-3">
        <button
          type="button"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ember text-ember-ink active:scale-[0.98]"
          onClick={() => (isPlaying ? onPause() : onPlay())}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause weight="fill" className="size-5" /> : <Play weight="fill" className="size-5" />}
        </button>
        <span ref={timeRef} className="w-10 text-xs tabular-nums text-dim">
          {formatDuration(time)}
        </span>
        <input
          ref={barRef}
          type="range"
          min={0}
          max={Math.max(duration, 1)}
          step={0.1}
          defaultValue={0}
          aria-label="Seek"
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-line accent-ember"
          onChange={(e) => onSeek(Number(e.target.value))}
        />
        <span className="w-10 text-right text-xs tabular-nums text-dim">{formatDuration(duration)}</span>
        <div className="hidden items-center gap-1 sm:flex">
          <button type="button" className="rounded-md p-1.5 text-dim hover:text-ink" onClick={() => onNudge(-500)} aria-label="Lyrics earlier">
            <Minus className="size-4" />
          </button>
          <span className="w-12 text-center text-xs tabular-nums text-dim">{formatOffset(offsetMs)}</span>
          <button type="button" className="rounded-md p-1.5 text-dim hover:text-ink" onClick={() => onNudge(500)} aria-label="Lyrics later">
            <Plus className="size-4" />
          </button>
        </div>
        <button
          type="button"
          className="rounded-md p-1.5 text-dim hover:text-ink"
          onClick={onToggleVideo}
          aria-label={videoHidden ? "Show video" : "Hide video"}
        >
          {videoHidden ? <EyeSlash className="size-5" /> : <Eye className="size-5" />}
        </button>
        {hasEnglish && (
          <div className="hidden overflow-hidden rounded-full border border-line text-xs sm:flex">
            {(["native", "both", "english"] as DisplayMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn("px-2 py-1 capitalize", displayMode === mode ? "bg-line text-ink" : "text-dim")}
                onClick={() => onDisplayMode(mode)}
              >
                {mode === "both" ? "both" : mode}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
