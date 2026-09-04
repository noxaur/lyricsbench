import { useCallback, useEffect, useRef, useState, type RefObject } from "react"

type YouTubePlayer = {
  destroy: () => void
  getCurrentTime: () => number
  getDuration: () => number
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void
}

type YouTubeNamespace = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string
      width?: string
      height?: string
      playerVars?: Record<string, number | string>
      events?: {
        onReady?: () => void
        onStateChange?: (event: { data: number }) => void
        onError?: (event: { data: number }) => void
      }
    },
  ) => YouTubePlayer
}

declare global {
  interface Window {
    YT?: YouTubeNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let youtubeApiPromise: Promise<YouTubeNamespace> | null = null

function loadYouTubeApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("Video playback is browser-only"))
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    const existingCallback = window.onYouTubeIframeAPIReady
    const finish = () => {
      existingCallback?.()
      if (window.YT?.Player) resolve(window.YT)
      else reject(new Error("YouTube did not expose its player API"))
    }
    window.onYouTubeIframeAPIReady = finish

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]')
    if (existingScript) return
    const script = document.createElement("script")
    script.src = "https://www.youtube.com/iframe_api"
    script.async = true
    script.onerror = () => reject(new Error("YouTube could not load in this browser"))
    document.head.append(script)
  })
  return youtubeApiPromise
}

export type Playback = {
  mountRef: RefObject<HTMLDivElement | null>
  currentTime: number
  duration: number
  isPlaying: boolean
  isReady: boolean
  error: string | null
  isDemo: boolean
  play: () => void
  pause: () => void
  toggle: () => void
  seek: (seconds: number) => void
}

/**
 * One media contract for a remote YouTube iframe and the offline demo clock.
 * The UI never needs to special-case readiness, paused seeking, or failures.
 */
export function usePlayback({
  videoId,
  demoDuration = 0,
}: {
  videoId: string
  demoDuration?: number
}): Playback {
  const mountRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const demoTimeRef = useRef(0)
  const isDemo = Boolean(demoDuration)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(isDemo ? demoDuration : 0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isReady, setIsReady] = useState(isDemo)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setCurrentTime(0)
    demoTimeRef.current = 0
    setDuration(isDemo ? demoDuration : 0)
    setIsPlaying(false)
    setIsReady(isDemo)
    setError(null)
  }, [videoId, demoDuration, isDemo])

  useEffect(() => {
    if (isDemo) return
    let disposed = false
    let player: YouTubePlayer | null = null

    void loadYouTubeApi()
      .then((YT) => {
        if (disposed || !mountRef.current) return
        player = new YT.Player(mountRef.current, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 0,
            controls: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (disposed || !player) return
              playerRef.current = player
              setDuration(Math.max(0, player.getDuration() || 0))
              setIsReady(true)
            },
            onStateChange: ({ data }) => {
              if (disposed) return
              setIsPlaying(data === 1)
              if (data === 0) setCurrentTime(Math.max(0, player?.getDuration() || 0))
            },
            onError: () => {
              if (disposed) return
              setError("YouTube could not start this video here. You can still use the lyric preview.")
              setIsReady(false)
            },
          },
        })
      })
      .catch((reason: unknown) => {
        if (disposed) return
        setError(reason instanceof Error ? reason.message : "Video playback is unavailable")
      })

    return () => {
      disposed = true
      if (playerRef.current === player) playerRef.current = null
      try {
        player?.destroy()
      } catch {
        // The iframe API may already have removed the frame while navigating.
      }
    }
  }, [isDemo, videoId])

  useEffect(() => {
    if (!isDemo || !isPlaying || duration <= 0) return
    let frame = 0
    let previous = performance.now()
    const tick = (now: number) => {
      const delta = Math.min(250, now - previous) / 1000
      previous = now
      const next = Math.min(duration, demoTimeRef.current + delta)
      demoTimeRef.current = next
      setCurrentTime(next)
      if (next >= duration) {
        setIsPlaying(false)
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [duration, isDemo, isPlaying])

  useEffect(() => {
    if (isDemo || !isReady) return
    const poll = () => {
      const player = playerRef.current
      if (!player) return
      const nextTime = player.getCurrentTime()
      const nextDuration = player.getDuration()
      if (Number.isFinite(nextTime)) setCurrentTime(Math.max(0, nextTime))
      if (Number.isFinite(nextDuration) && nextDuration > 0) setDuration(nextDuration)
    }
    poll()
    const timer = window.setInterval(poll, 140)
    return () => window.clearInterval(timer)
  }, [isDemo, isReady])

  const play = useCallback(() => {
    if (isDemo) {
      if (demoTimeRef.current >= duration) {
        demoTimeRef.current = 0
        setCurrentTime(0)
      }
      setIsPlaying(true)
      return
    }
    playerRef.current?.playVideo()
  }, [duration, isDemo])

  const pause = useCallback(() => {
    if (isDemo) {
      setIsPlaying(false)
      return
    }
    playerRef.current?.pauseVideo()
  }, [isDemo])

  const seek = useCallback(
    (seconds: number) => {
      const next = Math.max(0, Math.min(duration || Infinity, Number.isFinite(seconds) ? seconds : 0))
      if (isDemo) {
        demoTimeRef.current = next
        setCurrentTime(next)
        return
      }
      playerRef.current?.seekTo(next, true)
      setCurrentTime(next)
    },
    [duration, isDemo],
  )

  const toggle = useCallback(() => {
    if (isPlaying) pause()
    else play()
  }, [isPlaying, pause, play])

  return { mountRef, currentTime, duration, isPlaying, isReady, error, isDemo, play, pause, toggle, seek }
}
