import { useEffect, useRef, useState } from "react"
import { getStageState } from "~/lib/sync"
import type { PlaybackClock } from "~/lib/clock"
import type { DisplayMode, LyricLine, StagePhase } from "~/lib/types"
import { cn } from "~/lib/cn"

type Props = {
  lines: LyricLine[]
  english: string[]
  displayMode: DisplayMode
  clock: PlaybackClock
  offsetMs: number
  onSeek: (seconds: number) => void
}

function phaseClass(phase: StagePhase, isActive: boolean, wipe: boolean): string {
  if (!isActive) return "text-unsung"
  if (phase === "gap") return "lyric-gap"
  if (phase === "hold") return "lyric-hold"
  if (wipe) return "lyric-wipe"
  return "lyric-snap"
}

export function LyricsStage({ lines, english, displayMode, clock, offsetMs, onSeek }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const reelRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([])
  const followUntil = useRef(0)
  const lastKey = useRef("")
  const [activeIndex, setActiveIndex] = useState(-1)
  const [phase, setPhase] = useState<StagePhase>("preamble")
  const [wipe, setWipe] = useState(false)
  const [following, setFollowing] = useState(true)

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const t = clock.now() * 1000
      const state = getStageState(lines, t, offsetMs)
      const key = `${state.activeIndex}:${state.phase}:${state.wipe}`
      if (key !== lastKey.current) {
        lastKey.current = key
        setActiveIndex(state.activeIndex)
        setPhase(state.phase)
        setWipe(state.wipe)
      }

      const viewport = viewportRef.current
      const reel = reelRef.current
      const focusIndex = state.activeIndex >= 0 ? state.activeIndex : 0
      const line = lineRefs.current[focusIndex]
      if (viewport && reel && line && following && performance.now() > followUntil.current) {
        const y = viewport.clientHeight / 2 - (line.offsetTop + line.offsetHeight / 2)
        reel.style.transform = `translate3d(0, ${y}px, 0)`
      }

      if (line && state.wipe && state.phase === "active") {
        line.style.setProperty("--wipe", `${Math.round(state.progress * 1000) / 10}%`)
      } else if (line) {
        line.style.removeProperty("--wipe")
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [clock, lines, offsetMs, following])

  useEffect(() => {
    lineRefs.current = lineRefs.current.slice(0, lines.length)
  }, [lines.length])

  if (lines.length === 0) return null

  const firstVocal = lines.find((l) => l.kind !== "section" && l.text.trim())

  return (
    <div className="relative min-h-0 flex-1 stage-wash">
      {phase === "preamble" && firstVocal && (
        <p className="pointer-events-none absolute inset-x-0 top-[28%] z-10 text-center text-sm text-dim">
          Lyrics in {formatCue(firstVocal.startMs - (clock.now() * 1000 + offsetMs))}
        </p>
      )}
      <div
        ref={viewportRef}
        className="h-full overflow-hidden"
        onWheel={() => {
          followUntil.current = performance.now() + 4000
          setFollowing(false)
        }}
        onPointerDown={() => {
          followUntil.current = performance.now() + 4000
        }}
      >
        <div ref={reelRef} className="lyric-reel flex flex-col items-center px-4 py-[42vh]">
          {lines.map((line, i) => {
            if (line.kind === "section") {
              return (
                <div key={`sec-${i}`} className="py-4 text-xs uppercase tracking-[0.2em] text-dim">
                  {line.sectionLabel}
                </div>
              )
            }
            const distance = activeIndex < 0 ? i : Math.abs(i - activeIndex)
            const isActive = i === activeIndex
            const showEnglish = displayMode !== "native" && english[i]
            const showNative = displayMode !== "english"
            return (
              <button
                key={`${line.startMs}-${i}`}
                ref={(el) => {
                  lineRefs.current[i] = el
                }}
                type="button"
                onClick={() => onSeek(line.startMs / 1000)}
                className={cn(
                  "w-full max-w-3xl py-3 text-center transition-[opacity,transform,font-size] duration-300",
                  distance === 0 && "scale-100 opacity-100",
                  distance === 1 && "opacity-55",
                  distance >= 2 && "opacity-28",
                )}
              >
                {showNative && (
                  <span
                    className={cn(
                      "font-lyric block text-balance leading-[1.15]",
                      distance === 0
                        ? cn("text-3xl font-semibold sm:text-5xl", phaseClass(phase, true, wipe))
                        : "text-xl text-unsung sm:text-2xl",
                    )}
                  >
                    {line.text}
                  </span>
                )}
                {showEnglish && (
                  <span className={cn("mt-1 block text-sm sm:text-base", distance === 0 ? "text-dim" : "text-unsung")}>
                    {english[i]}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      {!following && (
        <button
          type="button"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-line bg-panel px-3 py-1 text-xs text-dim hover:text-ink"
          onClick={() => setFollowing(true)}
        >
          Follow lyrics
        </button>
      )}
    </div>
  )
}

function formatCue(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000))
  if (sec <= 0) return "a moment"
  if (sec < 60) return `${sec}s`
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`
}
