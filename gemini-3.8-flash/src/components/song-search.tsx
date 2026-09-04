import React, { useEffect, useRef, useState } from "react"
import { Search, Loader2, X, Music, Play, AlertCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { SongSearchHit } from "../types/song"
import { extractVideoId, isUrl, searchSongs } from "../lib/youtube-search"
import { formatTime } from "../lib/utils"

type SearchState = "idle" | "searching" | "success" | "empty" | "error"

type SongSearchProps = {
  placeholder?: string
  autoFocus?: boolean
  className?: string
  onSelect?: (hit: SongSearchHit) => void
}

export function SongSearch({
  placeholder = "Search track, artist, lyrics or paste YouTube link…",
  autoFocus = false,
  className = "",
  onSelect,
}: SongSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SongSearchHit[]>([])
  const [state, setState] = useState<SearchState>("idle")
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Execute search with cancellation & debounce
  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed || trimmed.length < 2) {
      setResults([])
      setState("idle")
      setIsOpen(false)
      return
    }

    // Direct YouTube URL detection - instantaneous fast-path!
    const directVideoId = extractVideoId(trimmed)
    if (directVideoId) {
      const hit: SongSearchHit = {
        videoId: directVideoId,
        title: `YouTube Video (${directVideoId})`,
        artist: "YouTube",
        track: directVideoId,
        thumbnail: `https://i.ytimg.com/vi/${directVideoId}/hqdefault.jpg`,
        source: "youtube",
      }
      setResults([hit])
      setState("success")
      setIsOpen(true)
      return
    }

    // Abort previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setState("searching")
    setIsOpen(true)

    // 350ms debounce prevents search engine cooldown exhaustion
    const timeout = setTimeout(async () => {
      try {
        const hits = await searchSongs(trimmed, {
          signal: controller.signal,
          limit: 8,
        })
        setResults(hits)
        setState(hits.length > 0 ? "success" : "empty")
        setSelectedIndex(-1)
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return
        setState("error")
      }
    }, 350)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  const handleSelectHit = (hit: SongSearchHit) => {
    setIsOpen(false)
    if (onSelect) {
      onSelect(hit)
      return
    }

    if (hit.videoId) {
      navigate(`/play/${hit.videoId}`)
    } else {
      // If iTunes/LRCLIB match, pass query in state or direct videoId
      navigate(`/play/search?q=${encodeURIComponent(`${hit.artist} ${hit.track}`)}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault()
      handleSelectHit(results[selectedIndex])
    } else if (e.key === "Escape") {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Bar Input */}
      <div className="relative flex items-center w-full rounded-2xl bg-card/80 border border-border/70 shadow-lg backdrop-blur-md focus-within:ring-2 focus-within:ring-primary/60 focus-within:border-primary/80 transition-all">
        <Search className="w-5 h-5 ml-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3.5 py-3.5 bg-transparent text-foreground placeholder:text-muted-foreground/60 text-sm md:text-base outline-none"
        />

        {state === "searching" && (
          <Loader2 className="w-4 h-4 mr-4 text-primary animate-spin" />
        )}

        {query && state !== "searching" && (
          <button
            type="button"
            onClick={() => {
              setQuery("")
              setResults([])
              setState("idle")
              setIsOpen(false)
            }}
            className="p-1 mr-3 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 border border-border/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          {state === "searching" && results.length === 0 && (
            <div className="flex items-center justify-center gap-2.5 py-8 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Finding tracks and synced lyrics…</span>
            </div>
          )}

          {state === "empty" && (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <Music className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium text-foreground">No songs found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Try searching with artist name or paste a direct YouTube video link.
              </p>
            </div>
          )}

          {state === "error" && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-destructive px-4">
              <AlertCircle className="w-4 h-4" />
              <span>Failed to load results. Please try again.</span>
            </div>
          )}

          {results.length > 0 && (
            <ul className="max-h-96 overflow-y-auto divide-y divide-border/30 p-1.5">
              {results.map((hit, idx) => {
                const isSelected = idx === selectedIndex

                return (
                  <li key={`${hit.source}-${hit.videoId || hit.title}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectHit(hit)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3.5 p-2.5 rounded-xl text-left transition-colors ${
                        isSelected ? "bg-primary/15 text-foreground" : "hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      {/* Thumbnail or Icon */}
                      <div className="relative w-12 h-12 rounded-lg bg-muted/70 overflow-hidden flex-shrink-0 flex items-center justify-center border border-border/40">
                        {hit.thumbnail ? (
                          <img
                            src={hit.thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Music className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play className="w-4 h-4 text-white fill-white" />
                        </div>
                      </div>

                      {/* Song details */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate text-foreground">
                          {hit.track || hit.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {hit.artist}
                        </div>
                      </div>

                      {/* Metadata badges */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                        {hit.durationSec && (
                          <span className="font-mono">{formatTime(hit.durationSec)}</span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/80 font-medium uppercase tracking-wider text-secondary-foreground">
                          {hit.source}
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
