import React, { useEffect, useRef, useState } from "react"
import { Play, AlertCircle } from "lucide-react"

type YouTubePlayerProps = {
  videoId: string
  isPlaying: boolean
  volume: number // 0 to 1
  isMuted: boolean
  playbackRate: number
  seekTimeSec: number | null
  audioFallbackUrl?: string
  onTimeUpdate: (timeSec: number) => void
  onDurationChange: (durationSec: number) => void
  onStateChange: (isPlaying: boolean) => void
  className?: string
}

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export function YouTubePlayer({
  videoId,
  isPlaying,
  volume,
  isMuted,
  playbackRate,
  seekTimeSec,
  audioFallbackUrl,
  onTimeUpdate,
  onDurationChange,
  onStateChange,
  className = "",
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const [hasError, setHasError] = useState(false)
  const [isApiReady, setIsApiReady] = useState(false)

  // Use HTML5 audio fallback if audio URL is provided and YouTube fails
  const useAudioFallback = hasError && Boolean(audioFallbackUrl)

  // Load YouTube IFrame API script once
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsApiReady(true)
      return
    }

    const existingScript = document.getElementById("youtube-iframe-api")
    if (!existingScript) {
      const tag = document.createElement("script")
      tag.id = "youtube-iframe-api"
      tag.src = "https://www.youtube.com/iframe_api"
      document.body.appendChild(tag)
    }

    const prevReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (prevReady) prevReady()
      setIsApiReady(true)
    }
  }, [])

  // Initialize player instance when API and videoId are ready
  useEffect(() => {
    if (!isApiReady || !videoId || !containerRef.current || useAudioFallback) return

    let isMounted = true

    // Clean up old instance if exists
    if (playerRef.current) {
      try {
        playerRef.current.destroy()
      } catch {
        // ignore
      }
      playerRef.current = null
    }

    // Create unique div id
    const playerId = `yt-player-${videoId}-${Math.random().toString(36).slice(2, 6)}`
    containerRef.current.innerHTML = `<div id="${playerId}" class="w-full h-full"></div>`

    try {
      playerRef.current = new window.YT.Player(playerId, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            if (!isMounted) return
            const dur = event.target.getDuration()
            if (dur > 0) onDurationChange(dur)
            event.target.setVolume(isMuted ? 0 : volume * 100)
            event.target.setPlaybackRate(playbackRate)
            if (isPlaying) event.target.playVideo()
          },
          onStateChange: (event: any) => {
            if (!isMounted) return
            // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING
            if (event.data === 1) {
              onStateChange(true)
              const dur = event.target.getDuration()
              if (dur > 0) onDurationChange(dur)
            } else if (event.data === 2 || event.data === 0) {
              onStateChange(false)
            }
          },
          onError: (e: any) => {
            console.warn("YouTube player error:", e)
            if (isMounted) setHasError(true)
          },
        },
      })
    } catch (err) {
      console.warn("Error creating YouTube player instance:", err)
      setHasError(true)
    }

    return () => {
      isMounted = false
      if (playerRef.current) {
        try {
          playerRef.current.destroy()
        } catch {
          // ignore
        }
        playerRef.current = null
      }
    }
  }, [isApiReady, videoId, useAudioFallback])

  // Play / Pause sync
  useEffect(() => {
    if (useAudioFallback && audioRef.current) {
      if (isPlaying) audioRef.current.play().catch(() => {})
      else audioRef.current.pause()
      return
    }

    if (!playerRef.current || typeof playerRef.current.getPlayerState !== "function") return
    try {
      const state = playerRef.current.getPlayerState()
      if (isPlaying && state !== 1 && state !== 3) {
        playerRef.current.playVideo()
      } else if (!isPlaying && state === 1) {
        playerRef.current.pauseVideo()
      }
    } catch {
      // ignore
    }
  }, [isPlaying, useAudioFallback])

  // Volume & Mute sync
  useEffect(() => {
    if (useAudioFallback && audioRef.current) {
      audioRef.current.volume = volume
      audioRef.current.muted = isMuted
      return
    }

    if (!playerRef.current || typeof playerRef.current.setVolume !== "function") return
    try {
      if (isMuted) {
        playerRef.current.mute()
      } else {
        playerRef.current.unMute()
        playerRef.current.setVolume(volume * 100)
      }
    } catch {
      // ignore
    }
  }, [volume, isMuted, useAudioFallback])

  // Playback rate sync
  useEffect(() => {
    if (useAudioFallback && audioRef.current) {
      audioRef.current.playbackRate = playbackRate
      return
    }

    if (!playerRef.current || typeof playerRef.current.setPlaybackRate !== "function") return
    try {
      playerRef.current.setPlaybackRate(playbackRate)
    } catch {
      // ignore
    }
  }, [playbackRate, useAudioFallback])

  // Seek time sync
  useEffect(() => {
    if (seekTimeSec === null) return

    if (useAudioFallback && audioRef.current) {
      audioRef.current.currentTime = seekTimeSec
      return
    }

    if (!playerRef.current || typeof playerRef.current.seekTo !== "function") return
    try {
      playerRef.current.seekTo(seekTimeSec, true)
    } catch {
      // ignore
    }
  }, [seekTimeSec, useAudioFallback])

  // High precision time update loop via requestAnimationFrame
  useEffect(() => {
    let active = true

    const updateLoop = () => {
      if (!active) return

      if (useAudioFallback && audioRef.current) {
        if (!audioRef.current.paused) {
          onTimeUpdate(audioRef.current.currentTime)
        }
      } else if (
        playerRef.current &&
        typeof playerRef.current.getCurrentTime === "function" &&
        typeof playerRef.current.getPlayerState === "function"
      ) {
        try {
          const state = playerRef.current.getPlayerState()
          if (state === 1) {
            // PLAYING
            const t = playerRef.current.getCurrentTime()
            if (Number.isFinite(t)) onTimeUpdate(t)
          }
        } catch {
          // ignore
        }
      }

      animFrameRef.current = requestAnimationFrame(updateLoop)
    }

    animFrameRef.current = requestAnimationFrame(updateLoop)

    return () => {
      active = false
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [isPlaying, useAudioFallback, onTimeUpdate])

  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      {/* YouTube IFrame Mount Target */}
      <div ref={containerRef} className="w-full h-full" />

      {/* HTML5 Audio Fallback if YouTube fails */}
      {useAudioFallback && audioFallbackUrl && (
        <audio
          ref={audioRef}
          src={audioFallbackUrl}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              onDurationChange(audioRef.current.duration)
            }
          }}
          onEnded={() => onStateChange(false)}
        />
      )}

      {/* Error state fallback message */}
      {hasError && !audioFallbackUrl && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/90 text-muted-foreground text-xs z-20">
          <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
          <p className="font-semibold text-foreground">Video playback restricted</p>
          <p className="max-w-xs mt-1">
            YouTube restricted playback for this video. You can still read and follow along with the synced lyrics!
          </p>
        </div>
      )}
    </div>
  )
}
