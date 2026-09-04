import React, { useEffect, useRef, useState } from "react"
import type { DisplayMode, LyricLine as LyricLineType, ParsedLyrics } from "../types/lyrics"
import { LyricLine } from "./lyric-line"
import { ArrowDown, Music2 } from "lucide-react"

type LyricsStageProps = {
  lyrics: ParsedLyrics | null
  currentTimeMs: number
  displayMode: DisplayMode
  loading?: boolean
  onSeek: (ms: number) => void
  onAnchorLine: (lineStartMs: number) => void
  onOpenSourceModal?: () => void
}

export function LyricsStage({
  lyrics,
  currentTimeMs,
  displayMode,
  loading = false,
  onSeek,
  onAnchorLine,
  onOpenSourceModal,
}: LyricsStageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const [userHasScrolled, setUserHasScrolled] = useState(false)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lines = lyrics?.lines || []

  // Find active line index
  let activeIndex = -1
  if (lines.length > 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.kind === "section") continue
      if (currentTimeMs >= line.startMs && currentTimeMs < line.endMs) {
        activeIndex = i
        break
      }
      if (currentTimeMs >= line.startMs) {
        activeIndex = i
      }
    }
  }

  const activeLine = activeIndex >= 0 ? lines[activeIndex] : null
  let progress = 0
  if (activeLine && activeLine.endMs > activeLine.startMs) {
    progress = Math.max(
      0,
      Math.min(1, (currentTimeMs - activeLine.startMs) / (activeLine.endMs - activeLine.startMs))
    )
  }

  // Smooth auto-scroll to active line
  useEffect(() => {
    if (userHasScrolled || activeIndex < 0) return
    const el = lineRefs.current.get(activeIndex)
    if (el && containerRef.current) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
  }, [activeIndex, userHasScrolled])

  // Handle user manual scroll
  const handleScroll = () => {
    if (!containerRef.current) return
    setUserHasScrolled(true)
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
  }

  const resumeAutoScroll = () => {
    setUserHasScrolled(false)
    if (activeIndex >= 0) {
      const el = lineRefs.current.get(activeIndex)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-karaoke-stage-bg text-muted-foreground select-none">
        <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-4" />
        <p className="text-base font-medium text-foreground">Resolving synced lyrics…</p>
        <p className="text-xs text-muted-foreground mt-1">Checking LRCLIB and verified archives</p>
      </div>
    )
  }

  if (!lyrics || lines.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-karaoke-stage-bg text-muted-foreground select-none">
        <div className="w-16 h-16 rounded-2xl bg-card/60 flex items-center justify-center border border-border/50 text-muted-foreground mb-4">
          <Music2 className="w-8 h-8 opacity-60" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No lyrics found for this track</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-5">
          You can search alternative providers, choose another track, or paste your own LRC lyrics.
        </p>
        {onOpenSourceModal && (
          <button
            type="button"
            onClick={onOpenSourceModal}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity shadow-sm"
          >
            Paste or Search Lyrics
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden bg-karaoke-stage-bg">
      {/* Floating resume auto-scroll button */}
      {userHasScrolled && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            type="button"
            onClick={resumeAutoScroll}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg hover:opacity-95 transition-all"
          >
            <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
            Resume Auto-scroll
          </button>
        </div>
      )}

      {/* Lyric Lines Scroll Container */}
      <div
        ref={containerRef}
        onWheel={handleScroll}
        onTouchMove={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-32 space-y-4 scroll-smooth"
      >
        {lines.map((line, idx) => {
          const isActive = idx === activeIndex
          const isPassed = activeIndex >= 0 && idx < activeIndex

          return (
            <LyricLine
              key={line.id || `line-${idx}`}
              ref={(el) => {
                if (el) lineRefs.current.set(idx, el)
                else lineRefs.current.delete(idx)
              }}
              line={line}
              index={idx}
              active={isActive}
              passed={isPassed}
              progress={isActive ? progress : 0}
              displayMode={displayMode}
              onSeek={onSeek}
              onAnchor={onAnchorLine}
            />
          )
        })}
      </div>
    </div>
  )
}
