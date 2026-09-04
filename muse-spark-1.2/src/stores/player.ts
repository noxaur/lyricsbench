// Novel store: per-video offset map, explicit status machine, single source for lyrics.
// Fixes S3 (global offset leak) and old 317-line store with mixed concerns.

import { create } from "zustand"
import type { LyricLine } from "@/lib/lrc"

type Status = "idle" | "loading" | "ready" | "error"

type PlayerState = {
  videoId: string | null
  title: string
  artist: string
  track: string
  lyrics: LyricLine[]
  synced: boolean
  autoTimed: boolean
  status: Status
  message: string | null
  currentTime: number
  duration: number
  isPlaying: boolean
  // per-video offset isolation (Fix S3)
  offsetByVideo: Record<string, number>
  videoHidden: boolean
  tvMode: boolean
  showTimestamps: boolean
  // setters
  setVideoId: (id: string) => void
  setMeta: (m: { title: string; artist: string; track: string }) => void
  setLyrics: (lines: LyricLine[], synced: boolean, autoTimed: boolean) => void
  setStatus: (s: Status, msg?: string | null) => void
  setCurrentTime: (t: number) => void
  setDuration: (d: number) => void
  setPlaying: (p: boolean) => void
  setOffset: (videoId: string, ms: number) => void
  adjustOffset: (videoId: string, deltaMs: number) => void
  resetOffset: (videoId: string) => void
  getOffset: (videoId: string) => number
  setVideoHidden: (v: boolean) => void
  setTvMode: (v: boolean) => void
  setShowTimestamps: (v: boolean) => void
}

export const usePlayer = create<PlayerState>((set, get) => ({
  videoId: null,
  title: "",
  artist: "",
  track: "",
  lyrics: [],
  synced: false,
  autoTimed: false,
  status: "idle",
  message: null,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  offsetByVideo: (() => {
    try { return JSON.parse(localStorage.getItem("umbra-offsets-v2") || "{}") } catch { return {} }
  })(),
  videoHidden: (() => {
    try { return localStorage.getItem("umbra-video-hidden") === "1" } catch { return false }
  })(),
  tvMode: false,
  showTimestamps: false,

  setVideoId: (id) => set({ videoId: id, currentTime: 0, status: "idle", message: null, lyrics: [], synced: false }),
  setMeta: ({ title, artist, track }) => set({ title, artist, track }),
  setLyrics: (lyrics, synced, autoTimed) => set({ lyrics, synced, autoTimed }),
  setStatus: (status, message = null) => set({ status, message }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setOffset: (videoId, ms) => {
    const clamped = Math.max(-5000, Math.min(5000, Math.round(ms)))
    const next = { ...get().offsetByVideo, [videoId]: clamped }
    try { localStorage.setItem("umbra-offsets-v2", JSON.stringify(next)) } catch {}
    set({ offsetByVideo: next })
  },
  adjustOffset: (videoId, delta) => {
    const cur = get().offsetByVideo[videoId] ?? 0
    get().setOffset(videoId, cur + delta)
  },
  resetOffset: (videoId) => get().setOffset(videoId, 0),
  getOffset: (videoId) => get().offsetByVideo[videoId] ?? 0,
  setVideoHidden: (videoHidden) => {
    try { localStorage.setItem("umbra-video-hidden", videoHidden ? "1" : "0") } catch {}
    set({ videoHidden })
  },
  setTvMode: (tvMode) => set({ tvMode }),
  setShowTimestamps: (showTimestamps) => set({ showTimestamps }),
}))
