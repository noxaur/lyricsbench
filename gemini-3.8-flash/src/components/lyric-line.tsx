import React from "react"
import type { DisplayMode, LyricLine as LyricLineType, LyricWord } from "../types/lyrics"
import { formatLyricTimestamp } from "../lib/utils"
import { KaraokeWordProgress } from "./karaoke-word-progress"
import { Anchor } from "lucide-react"

type LyricLineProps = {
  line: LyricLineType
  index: number
  active: boolean
  passed: boolean
  progress: number // 0 to 1
  displayMode: DisplayMode
  showTimestamp?: boolean
  onSeek: (ms: number) => void
  onAnchor: (lineStartMs: number) => void
}

function PerWordLine({
  words,
  lineProgress,
  active,
}: {
  words: LyricWord[]
  lineProgress: number
  active: boolean
}) {
  return (
    <span className="inline-flex flex-wrap justify-center gap-x-1.5 items-center">
      {words.map((word, idx) => {
        // Approximate progress per word based on line progress
        const totalWords = words.length
        const wordStartP = idx / totalWords
        const wordEndP = (idx + 1) / totalWords
        let wordP = 0
        if (lineProgress >= wordEndP) {
          wordP = 1
        } else if (lineProgress <= wordStartP) {
          wordP = 0
        } else {
          wordP = (lineProgress - wordStartP) / (wordEndP - wordStartP)
        }

        return (
          <KaraokeWordProgress
            key={`${word.startMs}-${idx}`}
            text={word.text}
            progress={active ? wordP : 0}
            activeLine={active}
          />
        )
      })}
    </span>
  )
}

export const LyricLine = React.forwardRef<HTMLDivElement, LyricLineProps>(
  (
    {
      line,
      active,
      passed,
      progress,
      displayMode,
      showTimestamp = true,
      onSeek,
      onAnchor,
    },
    ref
  ) => {
    if (line.kind === "section") {
      return (
        <div ref={ref} className="py-4 text-center">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase text-muted-foreground/80 bg-muted/30 border border-border/40">
            {line.sectionLabel || "Section"}
          </span>
        </div>
      )
    }

    const showNative = displayMode === "native" || displayMode === "both"
    const showRomaji = (displayMode === "romaji" || displayMode === "both") && Boolean(line.romajiText)
    const showEnglish = (displayMode === "english" || displayMode === "both") && Boolean(line.englishText)

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        onClick={() => onSeek(line.startMs)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSeek(line.startMs)
          }
        }}
        aria-current={active ? "true" : undefined}
        className={`group relative w-full max-w-3xl mx-auto px-4 py-3 rounded-xl transition-all duration-300 text-center cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
          active
            ? "scale-105 opacity-100 z-10"
            : passed
            ? "opacity-50 hover:opacity-80 scale-100"
            : "opacity-40 hover:opacity-75 scale-95"
        }`}
      >
        {/* Left/Right floating controls on hover */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-xs text-muted-foreground">
          {showTimestamp && line.startMs > 0 && (
            <span className="font-mono text-[11px] bg-card/80 px-2 py-0.5 rounded border border-border/50">
              {formatLyricTimestamp(line.startMs)}
            </span>
          )}
        </div>

        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button
            type="button"
            title="Sync this line to current audio time (Anchor)"
            onClick={(e) => {
              e.stopPropagation()
              onAnchor(line.startMs)
            }}
            className="p-1.5 rounded-lg bg-card/90 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors border border-border/60 shadow-sm"
          >
            <Anchor className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Section label if present */}
        {line.sectionLabel && (
          <div className="text-xs uppercase tracking-wider text-muted-foreground/60 mb-1">
            {line.sectionLabel}
          </div>
        )}

        {/* Primary lyric line */}
        <div
          className={`font-semibold tracking-tight transition-all duration-200 leading-snug ${
            active
              ? "text-[clamp(1.5rem,4vw,2.5rem)] text-primary"
              : "text-[clamp(1.1rem,2.8vw,1.75rem)] text-foreground/80"
          }`}
        >
          {showNative && (
            <div>
              {line.words && line.words.length > 0 ? (
                <PerWordLine
                  words={line.words}
                  lineProgress={progress}
                  active={active}
                />
              ) : active ? (
                <KaraokeWordProgress
                  text={line.text}
                  progress={progress}
                  activeLine={active}
                />
              ) : (
                <span>{line.text}</span>
              )}
            </div>
          )}

          {/* Romanized (Romaji) subtitle */}
          {showRomaji && (
            <div
              className={`font-normal transition-colors ${
                displayMode === "romaji"
                  ? "text-inherit"
                  : "text-[clamp(0.85rem,1.8vw,1.15rem)] mt-1 text-muted-foreground/80"
              }`}
            >
              {displayMode === "romaji" && active ? (
                <KaraokeWordProgress
                  text={line.romajiText!}
                  progress={progress}
                  activeLine={active}
                />
              ) : (
                line.romajiText
              )}
            </div>
          )}

          {/* English translation subtitle */}
          {showEnglish && (
            <div
              className={`font-normal transition-colors ${
                displayMode === "english"
                  ? "text-inherit"
                  : "text-[clamp(0.85rem,1.8vw,1.15rem)] mt-1 text-muted-foreground/70"
              }`}
            >
              {displayMode === "english" && active ? (
                <KaraokeWordProgress
                  text={line.englishText!}
                  progress={progress}
                  activeLine={active}
                />
              ) : (
                line.englishText
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
)

LyricLine.displayName = "LyricLine"
