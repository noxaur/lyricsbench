import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DEMO_TRACK, demoLyrics } from "~/lib/demo"
import { parseLrc, parsePlainLyrics } from "~/lib/lrc"
import { splitTrackTitle } from "~/lib/media"
import { rememberTrack } from "~/lib/recent"
import type { LyricsPayload, ParsedLyrics, TrackMetadata } from "~/lib/types"

type SessionPhase = "loading" | "ready" | "empty" | "error"

type SourceText = {
  text: string
  synced: boolean
  source: string
} | null

export type LyricsSession = {
  metadata: TrackMetadata
  phase: SessionPhase
  lyrics: ParsedLyrics
  source: string | null
  message: string | null
  setPastedLyrics: (text: string) => void
  retry: () => void
}

function fallbackMetadata(videoId: string): TrackMetadata {
  return { title: `YouTube video ${videoId}`, artist: "", source: "YouTube" }
}

function parseSource(source: SourceText, durationSec: number): ParsedLyrics {
  if (!source) return { lines: [], synced: false, autoTimed: false, offsetMs: 0 }
  const durationMs = Math.round(Math.max(0, durationSec) * 1000)
  const lrc = source.synced ? parseLrc(source.text, durationMs) : null
  if (lrc?.lines.length) return lrc
  return parsePlainLyrics(source.text, durationMs)
}

/**
 * Loading is deliberately owned by the route instance, not a global store.
 * Every request has an AbortController plus a generation check, so a late
 * response for the previous song can never replace the song on screen.
 */
export function useLyricsSession({
  videoId,
  durationSec,
  demo,
}: {
  videoId: string
  durationSec: number
  demo: boolean
}): LyricsSession {
  const [metadata, setMetadata] = useState<TrackMetadata>(() => (demo ? DEMO_TRACK : fallbackMetadata(videoId)))
  const [phase, setPhase] = useState<SessionPhase>(demo ? "ready" : "loading")
  const [sourceText, setSourceText] = useState<SourceText>(() =>
    demo ? { text: "", synced: true, source: "built-in demo" } : null,
  )
  const [message, setMessage] = useState<string | null>(null)
  const generation = useRef(0)
  const [retryKey, setRetryKey] = useState(0)

  const lyrics = useMemo(() => {
    if (demo) return demoLyrics()
    return parseSource(sourceText, durationSec)
  }, [demo, durationSec, sourceText])

  useEffect(() => {
    if (demo) {
      setMetadata(DEMO_TRACK)
      setPhase("ready")
      setMessage(null)
      return
    }
    const id = ++generation.current
    const controller = new AbortController()
    const isCurrent = () => generation.current === id && !controller.signal.aborted
    setMetadata(fallbackMetadata(videoId))
    setSourceText(null)
    setPhase("loading")
    setMessage(null)

    const load = async () => {
      try {
        const oembedResponse = await fetch(`/api/oembed?videoId=${encodeURIComponent(videoId)}`, {
          signal: controller.signal,
        })
        const oembed = oembedResponse.ok
          ? ((await oembedResponse.json()) as { title?: string; author?: string })
          : null
        if (!isCurrent()) return

        const parsed = splitTrackTitle(oembed?.title?.trim() || fallbackMetadata(videoId).title, oembed?.author?.trim())
        const nextMetadata: TrackMetadata = {
          title: parsed.title,
          artist: parsed.artist,
          source: oembed ? "YouTube" : "YouTube (metadata unavailable)",
        }
        setMetadata(nextMetadata)
        rememberTrack(videoId, nextMetadata)

        if (!parsed.title || parsed.title.startsWith("YouTube video")) {
          setPhase("empty")
          setMessage("We could not identify this video. Paste lyrics below to make a playable lyric sheet.")
          return
        }

        const params = new URLSearchParams({ title: parsed.title, artist: parsed.artist })
        const response = await fetch(`/api/lyrics?${params}`, { signal: controller.signal })
        const payload = (await response.json().catch(() => null)) as LyricsPayload | null
        if (!isCurrent()) return
        if (!response.ok || !payload) throw new Error("The lyric source did not return a usable response")
        if (payload.status === "instrumental") {
          setPhase("empty")
          setMessage("This track is listed as instrumental. You can still add your own lyric sheet.")
          return
        }
        const text = payload.syncedLyrics?.trim() || payload.plainLyrics?.trim()
        if (!text) {
          setPhase("empty")
          setMessage(payload.message || "No lyrics were found for this recording.")
          return
        }
        setSourceText({ text, synced: Boolean(payload.syncedLyrics?.trim()), source: payload.source || "LRCLIB" })
        setPhase("ready")
      } catch (reason) {
        if (!isCurrent()) return
        setPhase("error")
        setMessage(reason instanceof Error ? reason.message : "Lyrics could not be loaded")
      }
    }

    void load()
    return () => controller.abort()
  }, [demo, retryKey, videoId])

  const setPastedLyrics = useCallback((text: string) => {
    const clean = text.trim()
    if (!clean) return
    // Invalidate an in-flight provider lookup before taking a user's sheet.
    // This prevents a late network response from replacing their paste.
    generation.current++
    setSourceText({ text: clean, synced: /^\s*\[\d{1,3}:\d{1,2}/m.test(clean), source: "your lyric sheet" })
    setPhase("ready")
    setMessage(null)
  }, [])

  return {
    metadata,
    phase,
    lyrics,
    source: demo ? "built-in demo" : sourceText?.source ?? null,
    message,
    setPastedLyrics,
    retry: () => setRetryKey((key) => key + 1),
  }
}
