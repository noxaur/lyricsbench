import React, { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import {
  FileText,
  ThumbsDown,
  ChevronLeft,
  Share2,
  Sliders,
  Languages,
} from "lucide-react"

import type { DisplayMode, LyricsAlternate, LyricsResult, ParsedLyrics } from "../types/lyrics"
import type { TrackMetadata } from "../types/song"
import { SAMPLE_SONGS } from "../lib/sample-songs"
import {
  cleanTrackTitle,
  fetchLyricsFromLrclib,
  parseLyricsResult,
} from "../lib/lyrics-service"
import { fetchYouTubeOEmbed } from "../lib/youtube-search"
import { getStoredOffset, saveStoredOffset, calculateAnchorOffset } from "../lib/sync-calibration"
import { detectScriptAndLanguage } from "../lib/language-detector"
import { toRomaji } from "../lib/romaji-service"
import { addRecentSong } from "../lib/recent-songs"

import { YouTubePlayer } from "../components/youtube-player"
import { LyricsStage } from "../components/lyrics-stage"
import { TransportBar } from "../components/transport-bar"
import { SyncCalibrationBar } from "../components/sync-calibration-bar"
import { LyricsSourceModal } from "../components/lyrics-source-modal"
import { LyricsRejectionModal } from "../components/lyrics-rejection-modal"
import { KeyboardShortcutsDialog } from "../components/keyboard-shortcuts-dialog"

export function PlayerPage() {
  const { videoId: paramVideoId } = useParams<{ videoId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Handle fallback or search videoId
  const videoId = paramVideoId === "search" ? "dQw4w9WgXcQ" : paramVideoId || "dQw4w9WgXcQ"

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTimeSec, setCurrentTimeSec] = useState(0)
  const [durationSec, setDurationSec] = useState(0)
  const [volume, setVolume] = useState(0.9)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [seekTimeSec, setSeekTimeSec] = useState<number | null>(null)

  // Layout & view toggles
  const [isVideoVisible, setIsVideoVisible] = useState(false)
  const [showCalibration, setShowCalibration] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [displayMode, setDisplayMode] = useState<DisplayMode>("native")

  // Modals
  const [showSourceModal, setShowSourceModal] = useState(false)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)

  // Track & lyrics data
  const [metadata, setMetadata] = useState<TrackMetadata>({
    videoId,
    title: "Loading track…",
    artist: "",
    track: "",
  })
  const [lyricsResult, setLyricsResult] = useState<LyricsResult | null>(null)
  const [alternates, setAlternates] = useState<LyricsAlternate[]>([])
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(true)
  const [offsetMs, setOffsetMs] = useState<number>(() => getStoredOffset(videoId))

  const stageWrapperRef = useRef<HTMLDivElement>(null)

  // 1. Resolve Track Metadata & Sample Check
  useEffect(() => {
    let active = true
    setIsLoadingLyrics(true)

    const sampleMatch = SAMPLE_SONGS.find((s) => s.videoId === videoId)
    if (sampleMatch) {
      setMetadata({
        videoId: sampleMatch.videoId,
        title: sampleMatch.title,
        artist: sampleMatch.artist,
        track: sampleMatch.track,
        album: sampleMatch.album,
        durationSec: sampleMatch.durationSec,
        thumbnail: sampleMatch.thumbnail,
      })
      setDurationSec(sampleMatch.durationSec)
      setLyricsResult(sampleMatch.lyrics)
      setAlternates([])
      setIsLoadingLyrics(false)

      addRecentSong({
        videoId: sampleMatch.videoId,
        title: sampleMatch.title,
        artist: sampleMatch.artist,
        track: sampleMatch.track,
        durationSec: sampleMatch.durationSec,
        thumbnail: sampleMatch.thumbnail,
      })
      return
    }

    // Fetch oEmbed info from YouTube
    fetchYouTubeOEmbed(videoId).then(async (embed) => {
      if (!active) return

      const rawTitle = embed?.title || `YouTube Video (${videoId})`
      const cleaned = cleanTrackTitle(rawTitle)
      const artist = cleaned.artist || embed?.authorName || ""
      const track = cleaned.track || rawTitle

      const meta: TrackMetadata = {
        videoId,
        title: rawTitle,
        artist,
        track,
        thumbnail: embed?.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      }
      setMetadata(meta)

      addRecentSong(meta)

      // Fetch LRCLIB lyrics
      try {
        const { primary, alternates: foundAlternates } = await fetchLyricsFromLrclib({
          track,
          artist,
          durationSec,
        })
        if (active) {
          setLyricsResult(primary)
          setAlternates(foundAlternates)
          setIsLoadingLyrics(false)
        }
      } catch {
        if (active) setIsLoadingLyrics(false)
      }
    })

    return () => {
      active = false
    }
  }, [videoId])

  // Sync offset changes to localStorage
  const handleOffsetChange = useCallback((newOffset: number) => {
    setOffsetMs(newOffset)
    saveStoredOffset(videoId, newOffset)
  }, [videoId])

  // 2. Parse & Enrich Lyrics (Client-side Romaji + Smart Script Detection)
  const parsedLyrics = useMemo<ParsedLyrics | null>(() => {
    if (!lyricsResult) return null

    const parsed = parseLyricsResult(lyricsResult, durationSec, offsetMs)
    if (!parsed.lines.length) return parsed

    // Check language script
    const sampleText = parsed.lines.map((l) => l.text).join(" ")
    const detection = detectScriptAndLanguage(sampleText)

    // Enrich Japanese lines with pure TypeScript Romaji
    if (detection.hasCjk) {
      const enrichedLines = parsed.lines.map((line) => {
        if (!line.text) return line
        return {
          ...line,
          romajiText: toRomaji(line.text),
        }
      })
      return { ...parsed, lines: enrichedLines }
    }

    return parsed
  }, [lyricsResult, durationSec, offsetMs])

  // 3. Anchor Line to Current Time (Issue #78 Novel Solution)
  const handleAnchorLine = useCallback((lineStartMs: number) => {
    const currentPlaybackMs = currentTimeSec * 1000
    // The delta required to align this line's start to current time
    const newOffset = calculateAnchorOffset(lineStartMs - offsetMs, currentPlaybackMs)
    handleOffsetChange(newOffset)
  }, [currentTimeSec, offsetMs, handleOffsetChange])

  // 4. Seek to Lyric Timestamp
  const handleSeek = (ms: number) => {
    const sec = ms / 1000
    setCurrentTimeSec(sec)
    setSeekTimeSec(sec)
    // Clear seek signal after triggering
    setTimeout(() => setSeekTimeSec(null), 50)
  }

  // 5. Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      stageWrapperRef.current?.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  // 6. Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in an input or modal textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      switch (e.key) {
        case " ":
          e.preventDefault()
          setIsPlaying((prev) => !prev)
          break
        case "ArrowLeft":
          e.preventDefault()
          handleSeek(Math.max(0, (currentTimeSec - 5) * 1000))
          break
        case "ArrowRight":
          e.preventDefault()
          handleSeek(Math.min(durationSec * 1000, (currentTimeSec + 5) * 1000))
          break
        case "[":
          e.preventDefault()
          handleOffsetChange(offsetMs - 100)
          break
        case "]":
          e.preventDefault()
          handleOffsetChange(offsetMs + 100)
          break
        case "{":
          e.preventDefault()
          handleOffsetChange(offsetMs - 500)
          break
        case "}":
          e.preventDefault()
          handleOffsetChange(offsetMs + 500)
          break
        case "v":
        case "V":
          e.preventDefault()
          setIsVideoVisible((prev) => !prev)
          break
        case "m":
        case "M":
          e.preventDefault()
          setIsMuted((prev) => !prev)
          break
        case "f":
        case "F":
          e.preventDefault()
          toggleFullscreen()
          break
        case "1":
          setDisplayMode("native")
          break
        case "2":
          setDisplayMode("romaji")
          break
        case "3":
          setDisplayMode("english")
          break
        case "4":
          setDisplayMode("both")
          break
        case "?":
          e.preventDefault()
          setShowShortcutsModal(true)
          break
        case "Escape":
          setShowSourceModal(false)
          setShowRejectionModal(false)
          setShowShortcutsModal(false)
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentTimeSec, durationSec, offsetMs, handleOffsetChange])

  // Check sample song audio fallback
  const sampleMatch = SAMPLE_SONGS.find((s) => s.videoId === videoId)

  return (
    <div
      ref={stageWrapperRef}
      className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-background text-foreground"
    >
      {/* Player Header Bar */}
      <div className="w-full px-4 py-2.5 bg-card/60 border-b border-border/40 backdrop-blur-md flex items-center justify-between gap-4 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            title="Go Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground truncate">
              {metadata.track || metadata.title}
            </h2>
            <p className="text-xs text-muted-foreground truncate">{metadata.artist || "YouTube"}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Display mode toggle (Native / Romaji / Both) */}
          <div className="hidden sm:flex items-center bg-muted/40 rounded-xl p-0.5 border border-border/40">
            {(["native", "romaji", "both"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDisplayMode(mode)}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                  displayMode === mode
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Timing Calibration button */}
          <button
            type="button"
            onClick={() => setShowCalibration((prev) => !prev)}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              showCalibration || offsetMs !== 0
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            title="Timing Calibration"
          >
            <Sliders className="w-4 h-4" />
            {offsetMs !== 0 && (
              <span className="font-mono text-[10px]">
                {offsetMs > 0 ? `+${offsetMs}` : offsetMs}ms
              </span>
            )}
          </button>

          {/* Lyrics Sources button */}
          <button
            type="button"
            onClick={() => setShowSourceModal(true)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Lyrics Sources & Custom LRC"
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Reject Lyrics button */}
          <button
            type="button"
            onClick={() => setShowRejectionModal(true)}
            className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Reject Lyrics / Report Issue"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area: Stage + Optional Side Video */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Floating Calibration Bar */}
        {showCalibration && (
          <div className="absolute top-3 left-4 right-4 z-40">
            <SyncCalibrationBar
              offsetMs={offsetMs}
              onChangeOffset={handleOffsetChange}
              onReset={() => handleOffsetChange(0)}
              isStored={Boolean(getStoredOffset(videoId))}
            />
          </div>
        )}

        {/* Video Column (if toggled visible) */}
        {isVideoVisible && (
          <div className="w-80 md:w-96 lg:w-[28rem] h-full border-r border-border/50 bg-black flex-shrink-0 flex flex-col">
            <div className="w-full aspect-video">
              <YouTubePlayer
                videoId={videoId}
                isPlaying={isPlaying}
                volume={volume}
                isMuted={isMuted}
                playbackRate={playbackRate}
                seekTimeSec={seekTimeSec}
                audioFallbackUrl={sampleMatch?.audioUrl}
                onTimeUpdate={(t) => setCurrentTimeSec(t)}
                onDurationChange={(d) => setDurationSec(d)}
                onStateChange={(playing) => setIsPlaying(playing)}
                className="w-full h-full"
              />
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-2 text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">{metadata.title}</div>
              <p>
                Video playback is synced with the lyrics stage. You can hide this panel with the{" "}
                <kbd className="px-1 py-0.5 rounded bg-muted font-mono">V</kbd> shortcut.
              </p>
            </div>
          </div>
        )}

        {/* Hidden YouTube player when video panel is collapsed */}
        {!isVideoVisible && (
          <div className="absolute -left-[9999px] -top-[9999px] w-10 h-10 pointer-events-none opacity-0">
            <YouTubePlayer
              videoId={videoId}
              isPlaying={isPlaying}
              volume={volume}
              isMuted={isMuted}
              playbackRate={playbackRate}
              seekTimeSec={seekTimeSec}
              audioFallbackUrl={sampleMatch?.audioUrl}
              onTimeUpdate={(t) => setCurrentTimeSec(t)}
              onDurationChange={(d) => setDurationSec(d)}
              onStateChange={(playing) => setIsPlaying(playing)}
            />
          </div>
        )}

        {/* The Lyrics Stage ("The Dimmed Venue") */}
        <LyricsStage
          lyrics={parsedLyrics}
          currentTimeMs={currentTimeSec * 1000}
          displayMode={displayMode}
          loading={isLoadingLyrics}
          onSeek={handleSeek}
          onAnchorLine={handleAnchorLine}
          onOpenSourceModal={() => setShowSourceModal(true)}
        />
      </div>

      {/* Transport Controls Bar */}
      <TransportBar
        isPlaying={isPlaying}
        currentTime={currentTimeSec}
        duration={durationSec}
        volume={volume}
        isMuted={isMuted}
        playbackRate={playbackRate}
        isVideoVisible={isVideoVisible}
        showCalibration={showCalibration}
        isFullscreen={isFullscreen}
        onTogglePlay={() => setIsPlaying((prev) => !prev)}
        onSeek={(sec) => handleSeek(sec * 1000)}
        onChangeVolume={(vol) => {
          setVolume(vol)
          if (isMuted && vol > 0) setIsMuted(false)
        }}
        onToggleMute={() => setIsMuted((prev) => !prev)}
        onChangePlaybackRate={(rate) => setPlaybackRate(rate)}
        onToggleVideo={() => setIsVideoVisible((prev) => !prev)}
        onToggleCalibration={() => setShowCalibration((prev) => !prev)}
        onToggleFullscreen={toggleFullscreen}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
      />

      {/* Lyrics Source Picker Modal */}
      <LyricsSourceModal
        isOpen={showSourceModal}
        onClose={() => setShowSourceModal(false)}
        currentResult={lyricsResult}
        alternates={alternates}
        onSelectAlternate={(res) => setLyricsResult(res)}
        onApplyCustomLrc={(customLrc) => {
          setLyricsResult({
            id: `custom-${Date.now()}`,
            providerId: "custom",
            syncedLyrics: customLrc,
          })
        }}
      />

      {/* Lyrics Rejection & GitHub Issue Modal */}
      <LyricsRejectionModal
        isOpen={showRejectionModal}
        onClose={() => setShowRejectionModal(false)}
        lyricsResult={lyricsResult}
        videoId={videoId}
        trackTitle={metadata.track || metadata.title}
        artist={metadata.artist}
        onRejected={() => {
          setLyricsResult(null)
          setShowSourceModal(true)
        }}
      />

      {/* Keyboard Shortcuts Cheat Sheet */}
      <KeyboardShortcutsDialog
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  )
}
