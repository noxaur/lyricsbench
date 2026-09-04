import { useEffect, useReducer, useRef, useState } from "react"
import { fetchOembed, lyricsBody, resolveLyricsRequest, translateLines } from "~/lib/api"
import { parseLyricsText } from "~/lib/lrc"
import { detectLanguage, looksEnglish } from "~/lib/language"
import { parseTrackTitle } from "~/lib/titles"
import { addRecentSong, getLyricsCache, setLyricsCache } from "~/lib/storage"
import type { DisplayMode, LyricLine, LyricsHit } from "~/lib/types"

export type LyricsLoaderStatus = "idle" | "waiting-meta" | "loading" | "ready" | "empty" | "error"

type State = {
  status: LyricsLoaderStatus
  message: string
  lines: LyricLine[]
  english: string[]
  hit: LyricsHit | null
  autoTimed: boolean
  displayMode: DisplayMode
}

type Action =
  | { type: "reset" }
  | { type: "waiting-meta" }
  | { type: "loading"; message: string }
  | {
      type: "ready"
      lines: LyricLine[]
      hit: LyricsHit | null
      autoTimed: boolean
      english?: string[]
      displayMode?: DisplayMode
    }
  | { type: "empty"; message: string }
  | { type: "error"; message: string }
  | { type: "reparse"; lines: LyricLine[]; autoTimed: boolean }
  | { type: "paste"; lines: LyricLine[]; autoTimed: boolean }

const initial: State = {
  status: "idle",
  message: "Opening player",
  lines: [],
  english: [],
  hit: null,
  autoTimed: false,
  displayMode: "native",
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "reset":
      return { ...initial }
    case "waiting-meta":
      return { ...state, status: "waiting-meta", message: "Reading the video title" }
    case "loading":
      return { ...state, status: "loading", message: action.message }
    case "ready":
      return {
        ...state,
        status: "ready",
        lines: action.lines,
        hit: action.hit,
        autoTimed: action.autoTimed,
        english: action.english ?? [],
        displayMode: action.displayMode ?? state.displayMode,
        message: "",
      }
    case "empty":
      return { ...state, status: "empty", message: action.message, lines: [], english: [], hit: null }
    case "error":
      return { ...state, status: "error", message: action.message }
    case "reparse":
      return { ...state, lines: action.lines, autoTimed: action.autoTimed }
    case "paste":
      return {
        ...state,
        status: "ready",
        lines: action.lines,
        autoTimed: action.autoTimed,
        hit: null,
        english: [],
        displayMode: "native",
        message: "",
      }
    default:
      return state
  }
}

const DURATION_WAIT_MS = 3500

type Meta = { title: string; artist: string; track: string }

export function useLyricsLoader(
  videoId: string,
  durationSec: number,
  meta: Meta,
  seedDurationSec: number | undefined,
  searchGen: number,
) {
  const [state, dispatch] = useReducer(reducer, initial)
  const mountedAt = useRef(performance.now())
  const oembedFilled = useRef(false)
  const [resolvedMeta, setResolvedMeta] = useState(meta)

  useEffect(() => {
    mountedAt.current = performance.now()
    oembedFilled.current = false
    setResolvedMeta(meta)
    dispatch({ type: "reset" })
  }, [videoId])

  useEffect(() => {
    setResolvedMeta(meta)
  }, [meta.artist, meta.track, meta.title])

  useEffect(() => {
    const ac = new AbortController()
    void fetchOembed(videoId, ac.signal).then((data) => {
      if (!data || ac.signal.aborted || oembedFilled.current) return
      oembedFilled.current = true
      const parsed = parseTrackTitle(data.title, data.author)
      setResolvedMeta((prev) => ({
        title: prev.title || data.title,
        artist: prev.artist || parsed.artist,
        track: prev.track || parsed.track || data.title,
      }))
    })
    return () => ac.abort()
  }, [videoId])

  useEffect(() => {
    const ac = new AbortController()
    const run = async () => {
      const resolvedDuration =
        durationSec > 0 ? durationSec : seedDurationSec && seedDurationSec > 0 ? seedDurationSec : 0
      const waitedLongEnough = performance.now() - mountedAt.current > DURATION_WAIT_MS
      if (resolvedDuration <= 0 && !waitedLongEnough) {
        dispatch({ type: "waiting-meta" })
        return
      }

      const durationMs = resolvedDuration * 1000
      const cached = searchGen === 0 ? getLyricsCache(videoId) : null
      if (cached?.hit) {
        const parsed = parseLyricsText(lyricsBody(cached.hit), durationMs)
        if (parsed?.lines.length) {
          dispatch({
            type: "ready",
            lines: parsed.lines,
            hit: cached.hit,
            autoTimed: parsed.autoTimed,
            english: cached.english,
            displayMode: cached.english?.length ? "both" : "native",
          })
          addRecentSong({ videoId, title: cached.title, artist: cached.artist, track: cached.track })
          return
        }
      }

      const artist = resolvedMeta.artist || parseTrackTitle(resolvedMeta.title).artist
      const track = resolvedMeta.track || parseTrackTitle(resolvedMeta.title).track || resolvedMeta.title
      if (!track.trim()) {
        dispatch({ type: "waiting-meta" })
        return
      }

      dispatch({ type: "loading", message: "Finding lyrics" })

      try {
        const result = await resolveLyricsRequest(
          { artist, track, durationSec: resolvedDuration, title: resolvedMeta.title },
          ac.signal,
        )
        if (ac.signal.aborted) return

        if (result.status === "instrumental") {
          dispatch({ type: "empty", message: "This recording is marked instrumental" })
          return
        }
        if (result.status === "empty") {
          dispatch({ type: "empty", message: result.message })
          return
        }

        const parsed = parseLyricsText(lyricsBody(result.hit), durationMs)
        if (!parsed?.lines.length) {
          dispatch({ type: "empty", message: "Lyrics came back empty" })
          return
        }

        let english: string[] | undefined
        let displayMode: DisplayMode = "native"
        const sample = parsed.lines.map((l) => l.text).join("\n")
        if (!looksEnglish(sample)) {
          const translated = await translateLines(parsed.lines.map((l) => l.text), detectLanguage(sample), ac.signal)
          if (translated.length === parsed.lines.length) {
            english = translated
            displayMode = "both"
          }
        }

        dispatch({
          type: "ready",
          lines: parsed.lines,
          hit: result.hit,
          autoTimed: parsed.autoTimed,
          english,
          displayMode,
        })

        addRecentSong({ videoId, title: resolvedMeta.title || track, artist, track })
        setLyricsCache({
          videoId,
          artist,
          track,
          title: resolvedMeta.title || track,
          durationSec: resolvedDuration,
          hit: result.hit,
          english,
        })
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        dispatch({ type: "error", message: "Couldn't reach the lyrics service" })
      }
    }

    void run()
    return () => ac.abort()
  }, [videoId, durationSec, seedDurationSec, searchGen, resolvedMeta.artist, resolvedMeta.track, resolvedMeta.title])

  useEffect(() => {
    if (!state.hit || durationSec <= 0) return
    const parsed = parseLyricsText(lyricsBody(state.hit), durationSec * 1000)
    if (!parsed?.lines.length) return
    dispatch({ type: "reparse", lines: parsed.lines, autoTimed: parsed.autoTimed })
  }, [state.hit, durationSec])

  return { state, dispatch, resolvedMeta }
}
