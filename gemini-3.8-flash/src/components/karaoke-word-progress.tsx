import React from "react"
import { cn } from "../lib/utils"

type KaraokeWordProgressProps = {
  text: string
  /** 0 to 1 progress across the text */
  progress: number
  className?: string
  activeLine?: boolean
}

export function KaraokeWordProgress({
  text,
  progress,
  className,
  activeLine = false,
}: KaraokeWordProgressProps) {
  const p = Math.max(0, Math.min(1, progress))

  return (
    <span className={cn("relative inline-block whitespace-pre-wrap select-none", className)}>
      {/* Base / Unsung layer */}
      <span
        className={cn(
          "transition-colors duration-150",
          activeLine ? "text-karaoke-ink/70" : "text-karaoke-unsung"
        )}
      >
        {text}
      </span>

      {/* Sung layer with smooth horizontal clip-path sweep */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-0 left-0 h-full overflow-hidden pointer-events-none transition-[clip-path] duration-75 ease-out",
          activeLine
            ? "text-primary font-bold drop-shadow-[0_0_12px_var(--color-primary)]"
            : "text-karaoke-highlight"
        )}
        style={{
          clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
        }}
      >
        {text}
      </span>
    </span>
  )
}
