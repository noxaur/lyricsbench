import type { TrackMetadata } from "~/lib/types"

const KEY = "umbra.recents.v3"
const MAX_ITEMS = 8

export type RecentTrack = TrackMetadata & {
  videoId: string
  viewedAt: number
}

function canUseStorage() {
  return typeof window !== "undefined"
}

export function readRecentTracks(): RecentTrack[] {
  if (!canUseStorage()) return []
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is RecentTrack =>
      typeof value?.videoId === "string" && typeof value?.title === "string" && typeof value?.viewedAt === "number",
    )
  } catch {
    return []
  }
}

export function rememberTrack(videoId: string, metadata: TrackMetadata) {
  if (!canUseStorage()) return
  const next: RecentTrack = { videoId, ...metadata, viewedAt: Date.now() }
  const existing = readRecentTracks().filter((track) => track.videoId !== videoId)
  try {
    localStorage.setItem(KEY, JSON.stringify([next, ...existing].slice(0, MAX_ITEMS)))
  } catch {
    // Recent tracks are a convenience, never a prerequisite for playback.
  }
}

export function clearRecentTracks() {
  if (!canUseStorage()) return
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignored
  }
}
