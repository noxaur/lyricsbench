import { useYTEmbed } from "@bogdanrn/yt-embed/react"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { PlaybackClock } from "~/lib/clock"
import { cn } from "~/lib/cn"

const HIDDEN = "pointer-events-none fixed top-0 -left-[9999px] h-[180px] w-[320px] overflow-hidden opacity-0"

export function useYouTube(videoId: string, clock: PlaybackClock, onEnded?: () => void) {
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded

  const playerVars = useMemo(
    () => ({ origin, enablejsapi: 1 as const, playsinline: 1 as const, rel: 0 as const }),
    [origin],
  )

  const { containerRef, player, ready, currentTime, duration, isPlaying, error } = useYTEmbed(videoId, {
    playerVars,
    pollingIntervalMs: 80,
    privacyMode: "enhanced",
  })

  useEffect(() => {
    clock.sample(currentTime, isPlaying)
  }, [clock, currentTime, isPlaying])

  useEffect(() => {
    if (!player) return
    const onState = (event: Event) => {
      const state = (event as CustomEvent<{ state: number }>).detail.state
      if (state === 0) onEndedRef.current?.()
    }
    player.addEventListener("statechange", onState)
    return () => player.removeEventListener("statechange", onState)
  }, [player])

  const play = useCallback(() => {
    void player?.playVideo({ awaitState: true }).catch(() => {})
  }, [player])
  const pause = useCallback(() => {
    void player?.pauseVideo()
  }, [player])
  const seekTo = useCallback(
    (seconds: number) => {
      void player?.seekTo(seconds, true)
      clock.sample(seconds, isPlaying)
    },
    [player, clock, isPlaying],
  )

  return { containerRef, ready, duration, isPlaying, error, play, pause, seekTo }
}

export function YoutubeStage({
  containerRef,
  hidden,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>
  hidden: boolean
}) {
  return (
    <div className={cn(hidden ? HIDDEN : "relative aspect-video w-full overflow-hidden rounded-[12px] bg-black")}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
    </div>
  )
}
