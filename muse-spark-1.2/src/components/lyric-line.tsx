// Novel: clip-path reveal for precise karaoke wipe, no gradient-text,
// roving tabindex (only active is tabbable), reduced-motion respect,
// and distinct style for autoTimed (estimated timing).

import { cn } from "@/lib/utils"
import type { LyricLine } from "@/lib/lrc"

type Props = {
  line: LyricLine
  active: boolean
  progress: number // 0..1
  autoTimed: boolean
  synced: boolean
  showTimestamp: boolean
  onSeek: () => void
  isFirstActive: boolean // for roving
  index: number
  activeIndex: number
}

export function LyricLineView({ line, active, progress, autoTimed, synced, showTimestamp, onSeek, isFirstActive, index, activeIndex }: Props) {
  const isSection = line.kind === "section"
  if (isSection) {
    return (
      <div className="py-2 text-center text-xs font-medium tracking-widest text-muted-foreground/70">
        {line.sectionLabel}
      </div>
    )
  }

  // For unsynced/autoTimed: no wipe, just active highlight bg
  const useWipe = synced && !autoTimed && active

  return (
    <button
      type="button"
      onClick={onSeek}
      aria-label={`Seek to ${line.text}`}
      aria-current={active ? "true" : undefined}
      tabIndex={active || (activeIndex === -1 && index === 0) || isFirstActive ? 0 : -1}
      className={cn(
        "group relative w-full text-left rounded-lg px-3 py-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "border border-transparent",
        active
          ? "bg-card border-border shadow-sm scale-[1.02] lyric-active"
          : "opacity-90 hover:bg-muted/50 hover:opacity-100",
        autoTimed && active ? "border-dashed border-primary/30" : "",
        // reduced-motion: no scale
        "motion-reduce:scale-100"
      )}
    >
      {showTimestamp && (
        <span className="mr-2 inline-block text-[0.6875rem] tabular-nums text-muted-foreground align-middle">
          {formatLineTs(line.startMs)}
        </span>
      )}

      {/* Text layer */}
      <span className="relative inline text-[length:var(--lyrics-inactive-size)] font-semibold leading-tight">
        {/* Unsung base */}
        <span className={cn(active ? "text-karaoke-unsung" : "text-karaoke-muted", "transition-colors")}>
          {line.text}
        </span>
        {/* Sung reveal */}
        {useWipe && (
          <span
            aria-hidden
            className="absolute inset-0 text-karaoke-active overflow-hidden whitespace-nowrap"
            style={{ clipPath: `inset(0 ${Math.round((1 - progress) * 100)}% 0 0)` }}
          >
            {line.text}
          </span>
        )}
        {active && !useWipe && (
          <span aria-hidden className="absolute inset-0 pointer-events-none" />
        )}
      </span>

      {active && autoTimed && (
        <span className="ml-2 inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.625rem] font-medium text-amber-700 dark:text-amber-300 align-middle">
          estimated
        </span>
      )}
    </button>
  )
}

function formatLineTs(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, "0")}`
}
