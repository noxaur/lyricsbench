import React, { useState } from "react"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Sliders,
  HelpCircle,
  Gauge,
} from "lucide-react"
import { formatTime } from "../lib/utils"

type TransportBarProps = {
  isPlaying: boolean
  currentTime: number // in seconds
  duration: number // in seconds
  volume: number // 0 to 1
  isMuted: boolean
  playbackRate: number
  isVideoVisible: boolean
  showCalibration: boolean
  isFullscreen: boolean
  onTogglePlay: () => void
  onSeek: (seconds: number) => void
  onChangeVolume: (vol: number) => void
  onToggleMute: () => void
  onChangePlaybackRate: (rate: number) => void
  onToggleVideo: () => void
  onToggleCalibration: () => void
  onToggleFullscreen: () => void
  onOpenShortcuts: () => void
}

export function TransportBar({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  playbackRate,
  isVideoVisible,
  showCalibration,
  isFullscreen,
  onTogglePlay,
  onSeek,
  onChangeVolume,
  onToggleMute,
  onChangePlaybackRate,
  onToggleVideo,
  onToggleCalibration,
  onToggleFullscreen,
  onOpenShortcuts,
}: TransportBarProps) {
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubValue, setScrubValue] = useState(0)

  const progressPercent = duration > 0 ? ((isScrubbing ? scrubValue : currentTime) / duration) * 100 : 0
  const rates = [0.75, 1, 1.25, 1.5]

  return (
    <footer className="w-full bg-card/95 border-t border-border/60 px-4 py-3 select-none backdrop-blur-md transition-all">
      <div className="max-w-6xl mx-auto flex flex-col gap-2">
        {/* Scrubber timeline */}
        <div className="flex items-center gap-3 w-full">
          <span className="text-xs font-mono tabular-nums text-muted-foreground w-11 text-right">
            {formatTime(isScrubbing ? scrubValue : currentTime)}
          </span>

          <div className="relative flex-1 group cursor-pointer py-2">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={isScrubbing ? scrubValue : currentTime}
              onMouseDown={() => {
                setIsScrubbing(true)
                setScrubValue(currentTime)
              }}
              onTouchStart={() => {
                setIsScrubbing(true)
                setScrubValue(currentTime)
              }}
              onChange={(e) => setScrubValue(parseFloat(e.target.value))}
              onMouseUp={() => {
                setIsScrubbing(false)
                onSeek(scrubValue)
              }}
              onTouchEnd={() => {
                setIsScrubbing(false)
                onSeek(scrubValue)
              }}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary group-hover:h-2 transition-all"
            />
            {/* Visual progress bar fill */}
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-primary rounded-lg pointer-events-none group-hover:h-2 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <span className="text-xs font-mono tabular-nums text-muted-foreground w-11">
            {formatTime(duration)}
          </span>
        </div>

        {/* Main Controls row */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Playback controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {/* Volume */}
            <div className="hidden sm:flex items-center gap-2 pl-2">
              <button
                type="button"
                onClick={onToggleMute}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title="Mute/Unmute (M)"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
                className="w-20 h-1.5 bg-muted rounded-lg accent-primary cursor-pointer"
                title="Volume"
              />
            </div>
          </div>

          {/* Right: Auxiliary tools */}
          <div className="flex items-center gap-1.5">
            {/* Speed toggle */}
            <button
              type="button"
              onClick={() => {
                const curIdx = rates.indexOf(playbackRate)
                const nextRate = rates[(curIdx + 1) % rates.length]
                onChangePlaybackRate(nextRate)
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Playback Speed"
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>{playbackRate}x</span>
            </button>

            {/* Timing calibration toggle */}
            <button
              type="button"
              onClick={onToggleCalibration}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showCalibration
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
              title="Sync Calibration ([ / ])"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sync</span>
            </button>

            {/* Video toggle */}
            <button
              type="button"
              onClick={onToggleVideo}
              className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                isVideoVisible
                  ? "bg-muted/60 text-foreground"
                  : "text-muted-foreground hover:bg-muted/40"
              }`}
              title={isVideoVisible ? "Hide Video (V)" : "Show Video (V)"}
            >
              {isVideoVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            {/* Fullscreen toggle */}
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Shortcuts help */}
            <button
              type="button"
              onClick={onOpenShortcuts}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Keyboard Shortcuts (?)"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
