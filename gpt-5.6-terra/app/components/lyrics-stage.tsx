import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { CheckIcon, ClockIcon, RefreshIcon } from "~/components/icons"
import { currentLineIndex, lineProgress } from "~/lib/lrc"
import type { LyricLine } from "~/lib/types"

type StageProps = {
  lines: LyricLine[]
  currentTimeMs: number
  synced: boolean
  autoTimed: boolean
  source: string | null
  onSeek: (seconds: number) => void
  empty: { title: string; description: string } | null
}

function motionReduced() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function LyricsStage({
  lines,
  currentTimeMs,
  synced,
  autoTimed,
  source,
  onSeek,
  empty,
}: StageProps) {
  const activeIndex = useMemo(() => currentLineIndex(lines, currentTimeMs), [currentTimeMs, lines])
  const activeLineRef = useRef<HTMLButtonElement | null>(null)
  const followTimer = useRef<number | null>(null)
  const [following, setFollowing] = useState(true)

  useEffect(() => {
    if (!following || activeIndex < 0 || !activeLineRef.current) return
    activeLineRef.current.scrollIntoView({
      block: "center",
      behavior: motionReduced() ? "auto" : "smooth",
    })
  }, [activeIndex, following])

  useEffect(() => () => {
    if (followTimer.current !== null) window.clearTimeout(followTimer.current)
  }, [])

  const pauseFollowing = () => {
    setFollowing(false)
    if (followTimer.current !== null) window.clearTimeout(followTimer.current)
    followTimer.current = window.setTimeout(() => setFollowing(true), 8_000)
  }

  return (
    <section className="lyric-stage" aria-label="Synced lyrics">
      <div className="lyric-stage__topline">
        <div className="lyric-status" aria-live="polite">
          {synced ? <><CheckIcon size={14} /> Synced</> : autoTimed ? <><ClockIcon size={14} /> Guided timing</> : <><ClockIcon size={14} /> Lyric sheet</>}
          {source ? <span className="lyric-status__source">{source}</span> : null}
        </div>
        {!empty && lines.length > 0 ? (
          <button
            type="button"
            className="stage-follow"
            onClick={() => {
              setFollowing(true)
              activeLineRef.current?.scrollIntoView({ block: "center", behavior: motionReduced() ? "auto" : "smooth" })
            }}
            aria-pressed={following}
            title="Center the current lyric line"
          >
            <RefreshIcon size={14} /> {following ? "Following" : "Follow"}
          </button>
        ) : null}
      </div>

      {empty ? (
        <div className="lyrics-empty">
          <div className="lyrics-empty__orb" aria-hidden />
          <h2>{empty.title}</h2>
          <p>{empty.description}</p>
        </div>
      ) : (
        <div className="lyric-stage__scroll" onWheel={pauseFollowing} onTouchStart={pauseFollowing}>
          <ol className="lyric-stage__lines">
            {lines.map((line, index) => {
              const active = index === activeIndex
              const past = index < activeIndex
              const distance = activeIndex < 0 ? index : Math.abs(index - activeIndex)
              const progress = active ? lineProgress(line, currentTimeMs) : past ? 1 : 0
              return (
                <li
                  key={line.id}
                  className={`lyric-stage__line ${active ? "is-active" : ""} ${past ? "is-past" : ""} ${distance > 2 ? "is-distant" : ""}`}
                >
                  <button
                    ref={active ? activeLineRef : null}
                    type="button"
                    className="lyric-line-button"
                    onClick={() => onSeek(line.startMs / 1000)}
                    aria-label={`Jump to ${line.text}`}
                    title="Jump to this line"
                  >
                    {active ? <TimedText line={line} timeMs={currentTimeMs} progress={progress} /> : line.text}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </section>
  )
}

function TimedText({ line, timeMs, progress }: { line: LyricLine; timeMs: number; progress: number }) {
  if (line.words?.length) {
    return (
      <span className="timed-text timed-text--words">
        {line.words.map((word, index) => {
          const endMs = word.endMs ?? line.endMs
          const wordProgress = Math.max(0, Math.min(1, (timeMs - word.startMs) / Math.max(1, endMs - word.startMs)))
          const style = { "--line-progress": `${Math.round(wordProgress * 1000) / 10}%` } as CSSProperties
          return (
            <span className="timed-word" style={style} aria-hidden="true" key={`${word.startMs}-${index}`}>
              <span className="timed-word__base">{word.text}</span>
              <span className="timed-word__sung">{word.text}</span>
            </span>
          )
        })}
        <span className="sr-only">{line.text}</span>
      </span>
    )
  }
  const style = { "--line-progress": `${Math.round(progress * 1000) / 10}%` } as CSSProperties
  return (
    <span className="timed-text" style={style}>
      <span className="timed-text__base" aria-hidden="true">{line.text}</span>
      <span className="timed-text__sung" aria-hidden="true">{line.text}</span>
      <span className="sr-only">{line.text}</span>
    </span>
  )
}
