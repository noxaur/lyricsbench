import { useEffect, useRef, useState } from "react"
import { getStageState } from "~/lib/sync"
import type { PlaybackClock } from "~/lib/clock"
import type { DisplayMode, LyricLine } from "~/lib/types"
import { cn } from "~/lib/cn"

type Props = {
  lines: LyricLine[]
  english: string[]
  displayMode: DisplayMode
  clock: PlaybackClock
  offsetMs: number
  onSeek: (seconds: number) => void
}

export function LyricsReel({ lines, english, displayMode, clock, offsetMs, onSeek }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const reelRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([])
  const followUntil = useRef(0)
  const lastIndex = useRef(-2)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [following, setFollowing] = useState(true)

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const t = clock.now() * 1000
      const state = getStageState(lines, t, offsetMs)
      if (state.activeIndex !== lastIndex.current) {
        lastIndex.current = state.activeIndex
        setActiveIndex(state.activeIndex)
      }

      const viewport = viewportRef.current
      const reel = reelRef.current
      const line = lineRefs.current[state.activeIndex]
      if (viewport && reel && line && following && performance.now() > followUntil.current) {
        const y = viewport.clientHeight / 2 - (line.offsetTop + line.offsetHeight / 2)
        reel.style.transform = `translate3d(0, ${y}px, 0)`
      }

      if (line) {
        line.style.setProperty("--wipe", `${Math.round(state.progress * 1000) / 10}%`)
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

  return (
    <div className="relative min-h-0 flex-1">
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
            const distance = activeIndex < 0 ? i : Math.abs(i - activeIndex)
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
                      distance === 0 ? "lyric-wipe text-3xl font-semibold sm:text-5xl" : "text-xl text-unsung sm:text-2xl",
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
