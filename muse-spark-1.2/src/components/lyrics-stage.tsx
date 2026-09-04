// Novel stage: virtual-friendly, live region, gap placeholders,
// scroll-to-center with prefers-reduced-motion, content-visibility for perf.

import { useEffect, useRef, useState, useCallback } from "react"
import type { LyricLine } from "@/lib/lrc"
import { getStageState } from "@/lib/sync"
import { LyricLineView } from "./lyric-line"

type Props = {
  lines: LyricLine[]
  timeMs: number
  offsetMs: number
  durationMs: number
  synced: boolean
  autoTimed: boolean
  status: "idle" | "loading" | "ready" | "error"
  message?: string | null
  showTimestamps: boolean
  onSeek: (ms: number) => void
  onRetry?: () => void
}

export function LyricsStage({ lines, timeMs, offsetMs, durationMs, synced, autoTimed, status, message, showTimestamps, onSeek, onRetry }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement | null>(null) // actually proxy via data-active
  const [announce, setAnnounce] = useState("")
  const stage = getStageState(lines, timeMs, offsetMs, durationMs)

  // Live region announce active line (debounced)
  useEffect(() => {
    if (stage.mode !== "lyric" || stage.activeIndex < 0) return
    const text = lines[stage.activeIndex]?.text
    if (!text) return
    const id = window.setTimeout(() => setAnnounce(text), 350)
    return () => window.clearTimeout(id)
  }, [stage.activeIndex, stage.mode, lines])

  // Scroll active into center
  const scrollActive = useCallback((smooth: boolean) => {
    const container = scrollRef.current
    if (!container) return
    const activeEl = container.querySelector<HTMLElement>("[data-active='true']")
    if (!activeEl) return
    const behavior: ScrollBehavior = smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "instant"
    const cRect = container.getBoundingClientRect()
    const eRect = activeEl.getBoundingClientRect()
    const target = activeEl.offsetTop - container.clientHeight / 2 + eRect.height / 2
    // Only scroll if outside center third to avoid jank on fast choruses (from old audit)
    const center = cRect.top + cRect.height / 2
    const eCenter = eRect.top + eRect.height / 2
    if (Math.abs(eCenter - center) < cRect.height * 0.16 && !smooth) return
    container.scrollTo({ top: Math.max(0, target), behavior })
  }, [])

  useEffect(() => {
    if (stage.mode !== "lyric") return
    scrollActive(false)
  }, [stage.activeIndex, stage.mode, scrollActive])

  // follow mode: when user scrolls manually, show resync button
  const [follow, setFollow] = useState(true)
  useEffect(() => { if (stage.activeIndex >= 0) setFollow(true) }, [stage.activeIndex])

  if (status === "loading") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center" aria-busy="true">
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary motion-reduce:animate-none" />
        <p className="text-sm text-muted-foreground">Searching LRCLIB…</p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm font-medium">{message || "No lyrics found"}</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Try editing artist/track above or paste LRC manually.
        </p>
        {onRetry && (
          <button onClick={onRetry} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
            Retry
          </button>
        )}
      </div>
    )
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-lg font-semibold text-muted-foreground/80">
          {stage.mode === "intro" ? "♪ Intro ♪" : "Paste a link to start"}
        </p>
        <p className="text-sm text-muted-foreground">Lyrics will appear here once the track loads.</p>
      </div>
    )
  }

  // Gap/intro/outro placeholder
  if (stage.mode === "intro" || stage.mode === "gap" || stage.mode === "outro") {
    return (
      <div className="flex flex-1 flex-col">
        {!follow && (
          <div className="flex justify-center p-2">
            <button onClick={() => { setFollow(true); scrollActive(true) }} className="rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground shadow">
              Sync lyrics
            </button>
          </div>
        )}
        <div ref={scrollRef} className="karaoke-stage flex flex-1 flex-col overflow-y-auto px-4 py-6" onScroll={() => {
          const c = scrollRef.current
          const a = c?.querySelector<HTMLElement>("[data-active='true']")
          if (!c || !a) return
          const isCentered = Math.abs((a.getBoundingClientRect().top + a.offsetHeight/2) - (c.getBoundingClientRect().top + c.clientHeight/2)) < 24
          if (!isCentered) setFollow(false)
        }}>
          <div className="flex flex-1 flex-col items-center justify-center gap-6 py-16">
            <p className="text-2xl font-semibold tracking-wide text-muted-foreground/80 motion-safe:animate-pulse motion-reduce:animate-none">
              {stage.gapLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              {stage.mode === "intro" && lines[0] ? `First line at ${formatTs(lines[0].startMs - offsetMs)}` : null}
              {stage.mode === "gap" ? "Instrumental break" : null}
              {stage.mode === "outro" ? "Thanks for singing!" : null}
            </p>
          </div>
          {/* Still render lines offscreen for scrolling context, but dimmed */}
          <div className="mx-auto w-full max-w-xl opacity-40">
            {lines.slice(0, 6).map((l, i) => (
              <div key={i} className="py-1 text-center text-sm text-muted-foreground">{l.text || l.sectionLabel}</div>
            ))}
          </div>
        </div>
        <p className="sr-only" aria-live="polite">{announce}</p>
      </div>
    )
  }

  return (
    <div className="relative flex flex-1 flex-col min-h-0">
      {!follow && (
        <div className="sticky top-0 z-10 flex justify-center bg-gradient-to-b from-background to-transparent px-3 py-2">
          <button onClick={() => { setFollow(true); scrollActive(true) }} className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-md hover:bg-primary/90">
            Sync lyrics
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="karaoke-stage flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6"
        onScroll={() => {
          const c = scrollRef.current
          if (!c) return
          const activeEl = c.querySelector<HTMLElement>("[data-active='true']")
          if (!activeEl) return
          const cCenter = c.getBoundingClientRect().top + c.clientHeight / 2
          const eCenter = activeEl.getBoundingClientRect().top + activeEl.offsetHeight / 2
          if (Math.abs(eCenter - cCenter) > c.clientHeight * 0.33) setFollow(false)
        }}
      >
        <div className="mx-auto flex w-full max-w-xl flex-col gap-2">
          {/* top spacer for centering first line */}
          <div aria-hidden style={{ height: "28vh" }} />
          {lines.map((line, i) => {
            const active = i === stage.activeIndex
            return (
              <div key={`${line.startMs}-${i}`} data-active={active ? "true" : undefined} style={{ contentVisibility: "auto", containIntrinsicSize: "0 64px" }}>
                <LyricLineView
                  line={line}
                  active={active}
                  progress={active ? stage.progress : 0}
                  autoTimed={autoTimed}
                  synced={synced}
                  showTimestamp={showTimestamps}
                  onSeek={() => onSeek(line.startMs - offsetMs)}
                  isFirstActive={i === 0}
                  index={i}
                  activeIndex={stage.activeIndex}
                />
                {line.sectionLabel && !active && (
                  <div className="mt-1 text-center text-[0.7rem] tracking-widest text-muted-foreground/60">{line.sectionLabel}</div>
                )}
              </div>
            )
          })}
          <div aria-hidden style={{ height: "36vh" }} />
        </div>
      </div>

      {/* a11y live region - announces active line */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </p>
      <div ref={(el) => { activeRef.current = el as unknown as HTMLButtonElement }} className="sr-only" />
    </div>
  )
}

function formatTs(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, "0")}`
}
